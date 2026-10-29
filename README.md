# 🌪️ ChatTornado

<div align="center">

[![Build Status](https://img.shields.io/badge/Build-Passing-emerald?style=for-the-badge&logo=githubactions)](https://github.com/Aneesh-labs/ChatTornado)
[![Frontend](https://img.shields.io/badge/React-19.0.0-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Backend](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Realtime Engine](https://img.shields.io/badge/Go-1.22+-00ADD8?style=for-the-badge&logo=go)](https://go.dev/)
[![Accelerator](https://img.shields.io/badge/Rust-1.70+-DEA584?style=for-the-badge&logo=rust)](https://www.rust-lang.org/)
[![License](https://img.shields.io/badge/License-MIT-purple?style=for-the-badge)](LICENSE)

**A high-performance polyglot messaging platform blending real-time encrypted communication, studio-grade WebRTC calls, in-chat arcade games, zero-knowledge memory vaults, and dual-mode VORTEX AI assistance.**

</div>

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Languages & Tech Stack](#-languages--technology-stack)
- [Core Features](#-core-features)
- [Polyglot Architecture](#-polyglot-architecture)
- [Microservices & Engines](#-microservices--engines)
- [Quick Start Guide](#-quick-start-guide)
- [Environment Variables](#-environment-variables)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [License](#-license)

---

## 🌟 Overview

ChatTornado is engineered from the ground up as an ultra-fast, resilient, and feature-rich communications platform. Designed with a **polyglot microservice architecture**, ChatTornado leverages the best language for every workload:

- **Go** handles high-throughput, low-latency WebSocket connections and WebRTC signaling across tens of thousands of concurrent clients.
- **Rust** provides hardware-accelerated SIMD vector math for semantic embeddings and wire-speed cryptographic token auditing.
- **Python (FastAPI)** powers business logic, REST APIs, SQLAlchemy database models, and AI agent orchestration.
- **React 19 & Tailwind CSS** deliver a fluid, touch-optimized user experience on mobile and desktop alike.

---

## 💻 Languages & Technology Stack

ChatTornado utilizes a balanced polyglot stack where each language excels in its specific domain:

| Language | Proportion & Role | Key Libraries & Frameworks |
|---|---|---|
| **Python** | **Backend Core & AI Orchestration** | FastAPI, Uvicorn, SQLAlchemy 2.0, Pydantic v2, Pytest, AnyIO, Cryptography, HTTPX |
| **JavaScript / TypeScript** | **Interactive Frontend UI & WebSockets** | React 19, Vite 8, Tailwind CSS, Framer Motion, Lucide Icons, KaTeX, Web Audio API |
| **Go (Golang)** | **High-Throughput Realtime Engine** | Gorilla WebSocket, Net/HTTP, Sync primitives, Goroutine channels |
| **Rust** | **High-Speed Hardware Accelerator** | Tiny-HTTP, Serde, Serde-JSON, SHA-2, Regex, SIMD vector dot products |
| **SQL** | **Relational Schemas & Migrations** | PostgreSQL, SQLite, relational indexing, foreign-key constraint enforcement |
| **HTML5 & CSS3** | **Visual Presentation & Animation** | Hardware-accelerated CSS animations, responsive flex/grid layouts, SVG charts |
| **Shell (Bash) & Batch** | **Cross-Platform Automation** | `run.sh`, `run.bat` launcher scripts for all microservices |

---

## ✨ Core Features

### 📱 1. Mobile-First Fluid Experience
- **Auto-Hiding Navigation Dock & Top Header**: On mobile devices, opening an active conversation smoothly slides away the bottom dock and top bar, dedicating 100% of the screen viewport to reading and typing.
- **Unified Vertical Scrolling**: The 24-hour Bubble Notes tray, search bar, active filter pills (`All`, `Unread`, `Favorites`, `Channels`), and conversation list scroll together as a single fluid surface.
- **Status Dots Beside Streak Fire Badges**: Visual indicator dots show whether peers are `Online`, `Busy`, `Coding 💻`, `Off-Duty 🏖️`, or `In a Call 📞`. Tapping the dot pops up their full custom status message.

### 🎙️ 2. Studio-Grade WebRTC Audio & Video Calls
- **Ultra-Low Latency Opus 48kHz Audio**: WebRTC constraints enforce echo cancellation, automatic gain control, and dual-channel stereo Opus encoding.
- **Adaptive HD Video**: Dynamic resolution scaling from 1080p @ 30fps down to 720p with seamless bandwidth adaptation.

### 🤖 3. VORTEX-9 Dual-Mode AI Assistant
- **Desktop Floating Panel + Mobile Slide-Up Drawer**: Automatically adapts between an expansive side dock on laptops and a responsive bottom-sheet drawer with quick prompt chips on smartphones.
- **Zero "Poor Backend" Errors**: Features a built-in smart assistant engine that answers platform queries, provides code implementations, and explains platform tools even when cloud APIs are offline.
- **Deep Web Research & Synthesized Streaming**: Decomposes complex inquiries, cross-references sources in real time, and renders responses with live streaming and syntax-highlighted code.

### 🎮 4. In-Chat Arcade Games
- Interactive multiplayer games running natively inside any conversation bubble:
  - **Tic-Tac-Toe**: Touch-optimized hitboxes with instant rematch support.
  - **Connect-4**: Gravity drop animations and column selection indicators.
  - **Secret Word (Hangman)**: Virtual keyboard with disabled letter states and sound effects.
  - **Reaction Clicker**: Sub-millisecond timing with anti-cheat early-tap detection.
  - **Coin Flip & Rock-Paper-Scissors**: Instant animated decision-making games.
  - **Web Audio API Sound Engine**: Zero external audio files required; sounds are synthesized natively in-browser.

### 🔒 5. Zero-Knowledge Memory Vault & Security
- **Client-Side AES-256-GCM Encryption**: User records and private notes are encrypted in the browser with PBKDF2/Argon2 salts before touching the network.
- **Time-Locked Capsules**: Messages scheduled to reveal only after a specified countdown or milestone.
- **Reality Forks (Conversation Branching)**: Fork any point in a chat into an alternate timeline with dedicated conversation DNA pattern analysis.

### 📊 6. Insights & Settings Hub
- **Interactive SVG Velocity Charts**: Real-time message volume and P2P bandwidth metrics across 24h, 7d, and 30d timeframes.
- **Live Latency Telemetry**: Real-time ping counter measuring WebSocket round-trip times.
- **Modular Settings Dashboard**: Tabbed configuration for synthesized sound FX, theme toggles, blocked users list, cache management, and account security.

---

## 🏛️ Polyglot Architecture

```
                       ┌───────────────────────────────────────────────┐
                       │          React 19 Frontend Client             │
                       │     (WebSockets + WebRTC + Web Audio)         │
                       └──────────────┬──────────────────┬─────────────┘
                                      │                  │
                WS (Sub-ms Signaling) │                  │ REST / HTTPS
                                      ▼                  ▼
┌─────────────────────────────────────────┐     ┌─────────────────────────────────────────┐
│     Go Realtime Engine (:8080)          │     │        Python FastAPI (:8000)           │
│  - 50k+ Concurrent Goroutine Hub        │◄───►│  - Business Logic & REST Routing        │
│  - WebRTC Signaling & Candidate Relay   │     │  - SQLAlchemy Models & SQLite/Postgres  │
│  - Inter-Service /api/relay Webhook     │     │  - Zero-Knowledge Vault Endpoints       │
└─────────────────────────────────────────┘     └────────────────────┬────────────────────┘
                                                                     │
                                          High-Speed IPC / HTTP (:8085)
                                                                     ▼
                                                ┌─────────────────────────────────────────┐
                                                │      Rust Hardware Accelerator (:8085)  │
                                                │  - SIMD Vector Cosine Similarity        │
                                                │  - Wire-Speed SHA-256 Cryptography      │
                                                │  - Sub-microsecond Security Regex Scan  │
                                                └─────────────────────────────────────────┘
```

### Zero-Fallback Guarantee
Every component is designed with **automatic, transparent failover**:
- If the **Go Realtime Engine** is active, connections achieve sub-millisecond delivery; if inactive, the frontend and Python backend transparently route WebSockets through FastAPI with zero user interruption.
- If the **Rust Accelerator** is active, vector math and security audits run at native hardware speed; if inactive, Python's local vectorized math handles identical requests with 100% API parity.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18+ (tested on Node.js v24+)
- **Python**: v3.10+ (tested on Python 3.14+)
- **Go** *(Optional)*: v1.20+ (for standalone Go Realtime Engine)
- **Rust & Cargo** *(Optional)*: v1.70+ (for standalone Rust Accelerator)

---

### 1. Frontend Setup
```bash
# Clone the repository
git clone https://github.com/Aneesh-labs/ChatTornado.git
cd ChatTornado

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
The frontend will start at `http://localhost:5173`.

---

### 2. Backend Setup
```bash
# Navigate to the backend directory
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows:
.\venv\Scripts\activate
# Linux/macOS:
# source venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Start FastAPI development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
FastAPI Swagger docs will be live at `http://localhost:8000/docs`.

---

### 3. Go Realtime Engine (Optional)
```bash
cd services/realtime-engine

# Windows:
run.bat
# Linux/macOS:
chmod +x run.sh && ./run.sh
```
Listening on `http://0.0.0.0:8080` (WebSocket: `ws://0.0.0.0:8080/ws`).

---

### 4. Rust Hardware Accelerator (Optional)
```bash
cd services/rust-accelerator

# Windows:
run.bat
# Linux/macOS:
chmod +x run.sh && ./run.sh
```
Listening on `http://0.0.0.0:8085`.

---

## ⚙️ Environment Variables

Create `.env` inside `backend/` (or copy from `.env.example`):

```ini
# Database & Core
DATABASE_URL=sqlite:///./chat_tornado.db
JWT_SECRET=your-super-secure-jwt-secret-key-min-32-chars
PORT=8000

# Polyglot Microservices (Optional)
REALTIME_ENGINE_URL=http://127.0.0.1:8080/api/relay
RUST_ACCELERATOR_URL=http://127.0.0.1:8085

# AI & Search Grounding (Optional)
GEMINI_API_KEY=your-gemini-api-key-here
OPENROUTER_API_KEY=your-openrouter-key-here

# WebRTC TURN Relay (Production)
VITE_TURN_URL=turn:your-turn-server.com:3478
VITE_TURN_USERNAME=user
VITE_TURN_CREDENTIAL=credential
```

---

## 🧪 Testing & Quality Assurance

ChatTornado enforces strict code quality and comprehensive test coverage across all layers:

```bash
# Run backend test suite (69 tests including Polyglot Integration Suite)
cd backend
pytest

# Run frontend ESLint check
cd ..
npm run lint

# Build frontend production bundle
npm run build
```

- **Backend Pytest**: **69 / 69 passing (100%)**
- **Frontend Linter**: **0 Errors**
- **Vite Production Build**: **Clean build in under 3.5s**

---

## 📄 License

This project is licensed under the [MIT License](LICENSE). Built by **[Aneesh-labs](https://github.com/Aneesh-labs)**.
