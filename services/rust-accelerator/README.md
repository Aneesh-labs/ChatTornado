# ChatTornado Rust Acceleration Engine ⚡

High-performance native Rust microservice for hardware-accelerated vector cosine similarity, wire-speed SHA-256 cryptographic hashing, and sub-microsecond security regex matching.

## Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | `GET` | Health check & engine telemetry |
| `/api/embeddings/cosine-similarity` | `POST` | SIMD dot-product cosine similarity for VORTEX AI memory vectors |
| `/api/security/audit` | `POST` | Zero-latency prompt injection & credential leak detection |
| `/api/crypto/sha256` | `POST` | Hardware SHA-256 hashing |

## Prerequisites

- Rust & Cargo (1.70+)

## Quick Start

### Windows
```cmd
run.bat
```

### Linux / macOS
```bash
chmod +x run.sh
./run.sh
```

Or manually:
```bash
cargo run --release
```

Default listening address: `http://0.0.0.0:8085`.
