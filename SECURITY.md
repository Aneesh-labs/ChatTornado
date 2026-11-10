# ChatTornado Security & Cryptographic Model

This document outlines the security architecture, threat model, cryptographic primitives, and defense-in-depth measures implemented across the ChatTornado messaging ecosystem.

---

## 1. Cryptographic Primitives & Specifications

### 1.1 WebRTC Transport Layer Security (DTLS-SRTP)
All peer-to-peer WebRTC connections natively negotiate Datagram Transport Layer Security (DTLS 1.2/1.3) during the ICE handshake. All packets traversing the DataChannel are cryptographically authenticated and encrypted at the network layer.

### 1.2 Defense-in-Depth Application-Layer Encryption (AES-256-GCM)
In addition to native WebRTC DTLS encryption, ChatTornado applies an application-level authenticated encryption layer:
- **Cipher**: Advanced Encryption Standard in Galois/Counter Mode (AES-256-GCM).
- **Key Generation**: 256-bit cryptographically secure pseudorandom keys generated per file transfer using `crypto.subtle.generateKey`.
- **Nonce/IV Management**: Every chunk frame receives a distinct 12-byte cryptographically secure random Initialization Vector (IV) generated via `crypto.getRandomValues(new Uint8Array(12))`. Nonces are never reused across chunks under the same key.
- **Integrity Digest**: SHA-256 is computed over the unencrypted source file before transmission and verified byte-for-byte by the recipient upon reassembly. Any mismatch immediately aborts file saving and triggers `INTEGRITY_FAILED`.

---

## 2. Zero-Trust Signaling Validation

The FastAPI WebSocket server enforces strict authorization policies on all signaling events:
1. **Authenticated Sender Identity**: The sender's `user_id` is derived strictly from the authenticated JWT session on the WebSocket connection. Client-supplied `sender_id` fields are stripped and overwritten.
2. **Conversation Authorization & Block Verification**: Prior to forwarding any `p2p_*` signaling event, the backend verifies bidirectional block status (`is_blocked_bidirectional`). Blocked peers cannot exchange SDP offers, answers, or transfer requests.
3. **Loopback Prevention**: Self-transfer loopbacks (`sender_id == receiver_id`) are rejected.
4. **Binary Relay Prohibition**: Any incoming WebSocket frame containing `p2p_chunk`, `chunk_data`, or raw binary fields is dropped and logged with `ILLEGAL_MEDIA_RELAY_ATTEMPT`.

---

## 3. Threat Model & Mitigations

| Threat | Attack Vector | Mitigation in ChatTornado |
|:---|:---|:---|
| **Server-Side Data Breach** | Attacker compromises backend database or filesystem | Zero media binaries reside on the server; only encrypted metadata and text messages exist. |
| **Man-in-the-Middle (MitM)** | Attacker intercepts network packets between peers | WebRTC DTLS + per-transfer AES-256-GCM double-encryption. |
| **Chunk Tampering / Bit-Flips** | Attacker modifies packets in transit | AES-GCM provides authenticated authentication tags per chunk; SHA-256 provides full file digest validation. |
| **Unsolicited Media Spreading** | Malicious contact spams heavy files or unwanted images | Recipient Acceptance Model: WebRTC chunk streaming only begins after the recipient taps **Accept**. |
| **Memory Exhaustion (DoS)** | Sending multi-gigabyte files to crash recipient app | Bounded 64 KiB chunks, active backpressure control, and incremental disk/storage streaming. |
| **Path Traversal / Filename Injection** | Malicious filenames (e.g. `../../evil.sh`) | Filenames sanitized and stripped of relative path characters before writing to storage. |

---

## 4. Limitations & Honest Disclosures

- **Public STUN Networks**: ChatTornado utilizes public STUN servers (`stun.l.google.com:19302`, `stun.cloudflare.com:3478`) for NAT traversal. STUN servers only assist in discovering public IP/port bindings; they never see payload data.
- **Symmetric NATs**: If both peers reside behind restrictive symmetric NATs or corporate firewalls that block direct UDP traversal, connections cannot be completed without a TURN relay. ChatTornado deliberately does not configure a TURN relay to uphold zero server bandwidth overhead. The application honestly reports `NAT_TRAVERSAL_FAILED` and enables users to retry.
