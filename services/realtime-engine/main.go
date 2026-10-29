package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// Upgrader configures WebSocket connection parameters with relaxed CORS for fast local dev.
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
		broadcast:  make(chan []byte, 1024),
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

func (c *Client) readPump() {
	defer func() {
		c.Hub.unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(1024 * 512) // 512 KB
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

func serveWs(hub *Hub, w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		userID = fmt.Sprintf("anon_%d", time.Now().UnixNano())
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("[GO REALTIME WS ERROR]", err)
		return
	}

	client := &Client{
		ID:     fmt.Sprintf("%d", time.Now().UnixNano()),
		UserID: userID,
		Conn:   conn,
		Send:   make(chan []byte, 256),
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

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":    "healthy",
			"engine":    "go-realtime-submillisecond",
			"timestamp": time.Now().UTC().Format(time.RFC3339Nano),
			"version":   "1.0.0",
		})
	})

	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r)
	})

	log.Printf("==================================================")
	log.Printf(" ChatTornado Ultra-Fast Go Realtime Engine")
	log.Printf(" Listening on http://0.0.0.0:%s", port)
	log.Printf(" WebSocket URL: ws://0.0.0.0:%s/ws", port)
	log.Printf("==================================================")

	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal("[GO REALTIME FATAL]", err)
	}
}
