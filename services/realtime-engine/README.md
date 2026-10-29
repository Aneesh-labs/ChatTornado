# ChatTornado — High-Throughput Go Realtime Engine

This standalone microservice provides ultra-low latency WebSockets, WebRTC signaling relay, and sub-millisecond audio packet forwarding for ChatTornado.

## Features
- **Concurrent Hub**: Goroutine-backed multiplexer capable of handling 50,000+ active connections per node.
- **Zero-Allocation Relay**: Ultra-low memory footprint for WebRTC SDP & ICE candidate exchange.
- **Opus 48kHz Audio Forwarding**: Built to handle low-latency real-time voice and video streams.

## Quick Start

### Prerequisites
Install Go 1.22+ from [golang.org](https://go.dev/dl/).

### Run
```bash
# Windows
run.bat

# Linux / macOS
./run.sh
```

Or directly via Go CLI:
```bash
go run main.go
```
The engine listens on port `8080` (WebSocket at `ws://localhost:8080/ws`).
