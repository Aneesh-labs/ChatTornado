package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// Upgrader configures WebSocket connection parameters with relaxed CORS for fast development.
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
	ReadBufferSize:  1024 * 64,
	WriteBufferSize: 1024 * 64,
}

// Client represents a connected user WebSocket session.
type Client struct {
	ID     string
	UserID string
	Conn   *websocket.Conn
	Send   chan []byte
	Hub    *Hub
}

// RelayPacket represents an inter-service communication packet from Python or other microservices.
type RelayPacket struct {
	ReceiverID interface{}            `json:"receiver_id,omitempty"`
	Broadcast  bool                   `json:"broadcast,omitempty"`
	Payload    map[string]interface{} `json:"payload"`
}

// Hub maintains active client connections and broadcasts messages.
type Hub struct {
	clients    map[string]*Client // Key: UserID
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

func newHub() *Hub {
	return &Hub{
		clients:    make(map[string]*Client),
		broadcast:  make(chan []byte, 2048),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client.UserID] = client
			h.mu.Unlock()
			log.Printf("[GO REALTIME] User registered: %s (Active: %d)", client.UserID, len(h.clients))

		case client := <-h.unregister:
			h.mu.Lock()
			if existing, ok := h.clients[client.UserID]; ok && existing == client {
				delete(h.clients, client.UserID)
				close(client.Send)
			}
			h.mu.Unlock()
			log.Printf("[GO REALTIME] User unregistered: %s (Active: %d)", client.UserID, len(h.clients))

		case message := <-h.broadcast:
			// Fast JSON routing
			var packet map[string]interface{}
			if err := json.Unmarshal(message, &packet); err == nil {
				targetReceiver, ok := packet["receiver_id"]
				if ok && targetReceiver != nil {
					targetID := fmt.Sprintf("%v", targetReceiver)
					h.mu.RLock()
					if targetClient, found := h.clients[targetID]; found {
						select {
						case targetClient.Send <- message:
						default:
							close(targetClient.Send)
							delete(h.clients, targetID)
						}
					}
					h.mu.RUnlock()
					continue
				}
			}

			// Broadcast to all active clients
			h.mu.RLock()
			for _, client := range h.clients {
				select {
				case client.Send <- message:
				default:
					close(client.Send)
					delete(h.clients, client.UserID)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// SendDirect sends a raw byte payload directly to a specific user ID or broadcasts to all.
func (h *Hub) SendDirect(userID string, payload []byte) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()

	client, found := h.clients[userID]
	if !found {
		return false
	}

	select {
	case client.Send <- payload:
		return true
	default:
		return false
	}
}

// BroadcastAll sends a payload to all connected clients.
func (h *Hub) BroadcastAll(payload []byte) int {
	h.mu.RLock()
	defer h.mu.RUnlock()

	count := 0
	for _, client := range h.clients {
		select {
		case client.Send <- payload:
			count++
		default:
		}
	}
	return count
}

func (c *Client) readPump() {
	defer func() {
		c.Hub.unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(1024 * 1024) // 1 MB
	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			break
		}

		// Handle heartbeat ping from client
		var peek map[string]interface{}
		if err := json.Unmarshal(message, &peek); err == nil {
			if msgType, ok := peek["type"].(string); ok && msgType == "ping" {
				pongResp, _ := json.Marshal(map[string]interface{}{
					"type":      "pong",
					"timestamp": time.Now().UnixMilli(),
				})
				c.Send <- pongResp
				continue
			}
		}

		c.Hub.broadcast <- message
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(20 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)
			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// extractUserID parses JWT token payload without signature verification (handled by Python Gateway).
func extractUserID(token string) string {
	parts := strings.Split(token, ".")
	if len(parts) < 2 {
		return ""
	}
	payloadB64 := parts[1]
	// Pad base64 string
	if l := len(payloadB64) % 4; l > 0 {
		payloadB64 += strings.Repeat("=", 4-l)
	}
	data, err := base64.URLEncoding.DecodeString(payloadB64)
	if err != nil {
		data, err = base64.StdEncoding.DecodeString(payloadB64)
		if err != nil {
			return ""
		}
	}
	var claims map[string]interface{}
	if err := json.Unmarshal(data, &claims); err != nil {
		return ""
	}
	if sub, ok := claims["sub"]; ok && sub != nil {
		return fmt.Sprintf("%v", sub)
	}
	if uid, ok := claims["user_id"]; ok && uid != nil {
		return fmt.Sprintf("%v", uid)
	}
	return ""
}

func serveWs(hub *Hub, w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	token := r.URL.Query().Get("token")

	if userID == "" && token != "" {
		userID = extractUserID(token)
	}

	if userID == "" {
		userID = fmt.Sprintf("anon_%d", time.Now().UnixNano())
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("[GO REALTIME WS UPGRADE ERROR]", err)
		return
	}

	client := &Client{
		ID:     fmt.Sprintf("%d", time.Now().UnixNano()),
		UserID: userID,
		Conn:   conn,
		Send:   make(chan []byte, 512),
		Hub:    hub,
	}

	client.Hub.register <- client

	go client.writePump()
	go client.readPump()
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	hub := newHub()
	go hub.run()

	// Health telemetry endpoint
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":        "healthy",
			"engine":        "go-realtime-submillisecond",
			"timestamp":     time.Now().UTC().Format(time.RFC3339Nano),
			"version":       "1.2.0",
			"active_peers":  len(hub.clients),
		})
	})

	// Presence endpoint
	http.HandleFunc("/api/presence", func(w http.ResponseWriter, r *http.Request) {
		hub.mu.RLock()
		onlineUsers := make([]string, 0, len(hub.clients))
		for uid := range hub.clients {
			onlineUsers = append(onlineUsers, uid)
		}
		hub.mu.RUnlock()

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"online_users": onlineUsers,
			"total":        len(onlineUsers),
		})
	})

	// Inter-service Relay endpoint (called by Python FastAPI backend)
	http.HandleFunc("/api/relay", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
			return
		}

		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Bad Request", http.StatusBadRequest)
			return
		}
		defer r.Body.Close()

		var packet RelayPacket
		if err := json.Unmarshal(body, &packet); err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}

		payloadBytes, err := json.Marshal(packet.Payload)
		if err != nil {
			http.Error(w, "Payload Error", http.StatusInternalServerError)
			return
		}

		delivered := false
		if packet.Broadcast {
			count := hub.BroadcastAll(payloadBytes)
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"status":    "broadcasted",
				"delivered": count,
			})
			return
		}

		if packet.ReceiverID != nil {
			targetID := fmt.Sprintf("%v", packet.ReceiverID)
			delivered = hub.SendDirect(targetID, payloadBytes)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":    "relayed",
			"delivered": delivered,
		})
	})

	// WebSocket handler
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r)
	})

	log.Printf("==================================================")
	log.Printf(" ChatTornado Ultra-Fast Go Realtime Engine v1.2.0")
	log.Printf(" Listening on http://0.0.0.0:%s", port)
	log.Printf(" WebSocket URL: ws://0.0.0.0:%s/ws", port)
	log.Printf(" Inter-service Relay: http://0.0.0.0:%s/api/relay", port)
	log.Printf("==================================================")

	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal("[GO REALTIME FATAL]", err)
	}
}
