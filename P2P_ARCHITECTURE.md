# ChatTornado P2P WebRTC Media Architecture

## 1. Architectural Philosophy: Strict Zero-Cloud Media Storage

ChatTornado enforces a hybrid messaging architecture with **zero backend media storage** and **zero cloud object-storage dependency** (no S3, Cloudflare R2, Supabase Storage, or Firebase Storage).

```
                      +-----------------------------+
                      |   ChatTornado FastAPI Core  |
                      |   - JWT Auth & Profiles     |
                      |   - Text Messaging & Sync   |
                      |   - Presence & WebSocket    |
                      |   - WebRTC Signaling Only   |
                      +--------------+--------------+
                                     ^
                         WebSocket   |   WebSocket
                         Signaling   |   Signaling
                                     v
+------------------------+                      +------------------------+
|      Client A          |                      |      Client B          |
|  (Android / Web)       |<====================>|  (Android / Web)       |
|  - AES-256-GCM Encrypt |  WebRTC DataChannel  |  - WebRTC DataChannel  |
|  - 64 KiB Binary Chunk |   (Direct P2P via    |  - AES-256-GCM Decrypt |
|  - Flow Backpressure   |     Public STUN)     |  - SHA-256 Hash Verify |
|  - Local Outbox Queue  |                      |  - Dual Local Storage  |
+------------------------+                      +------------------------+
```

### Core Invariants:
1. **The backend NEVER receives or persists media binaries or chunks.**
2. **WebSocket signaling is strictly metadata only** (`p2p_offer`, `p2p_answer`, `p2p_ice_candidate`, `p2p_transfer_request`, `p2p_transfer_accept`, `p2p_transfer_reject`, `p2p_transfer_cancel`, `p2p_transfer_complete`).
3. **If any binary payload is detected on a WebSocket frame, the backend immediately rejects it.**
4. **No TURN server is configured.** All transfers travel directly over peer-to-peer UDP. If a symmetric NAT or restrictive firewall blocks traversal, `NAT_TRAVERSAL_FAILED` is reported honestly.

---

## 2. Binary Framing Protocol (v1)

All media files stream across WebRTC DataChannels using structured binary frames.

### Frame Layout (65-Byte Fixed Header + Variable Payload):

| Byte Offset | Field Name | Data Type | Description |
|:---|:---|:---|:---|
| `0..3` | Magic | 4 Bytes | ASCII `TORN` (`0x54, 0x4F, 0x52, 0x4E`) |
| `4` | Version | Uint8 | Protocol Version (`0x01`) |
| `5..40` | Transfer ID | 36 Bytes | UUID / Transfer ID string padded with spaces |
| `41..44` | Chunk Index | Uint32 (Big-Endian) | Zero-based sequence number of current chunk |
| `45..48` | Total Chunks | Uint32 (Big-Endian) | Total count of chunks in this transfer |
| `49..52` | Payload Length | Uint32 (Big-Endian) | Byte length of encrypted payload |
| `53..64` | IV / Nonce | 12 Bytes | Cryptographically secure random IV for AES-GCM |
| `65..` | Payload | N Bytes | Encrypted chunk binary data (up to 64 KiB) |

---

## 3. Backpressure & Flow Control

WebRTC DataChannels utilize an underlying SCTP buffer. Without flow control, transmitting large videos causes memory exhaustion and dropped packets.

ChatTornado implements active backpressure:
- `dataChannel.bufferedAmountLowThreshold` is set to `256 * 1024` (256 KiB).
- During transmission, `dataChannel.bufferedAmount` is checked before each chunk.
- If `bufferedAmount > threshold`, the sender suspends execution and listens for the `bufferedamountlow` event before reading the next slice.
- Files are sliced incrementally (`file.slice(offset, offset + CHUNK_SIZE)`). The entire file is **never** loaded into memory all at once.

---

## 4. Transfer State Machine

Both sender and recipient devices follow a synchronized finite state machine:

```
               [WAITING_FOR_PEER] (Offline recipient in outbox)
                       |
               [WAITING_FOR_ACCEPTANCE] (Handshake prompt sent)
                  /              \
       (Recipient Accepts)    (Recipient Declines)
                v                  v
         [CONNECTING]          [DECLINED]
                |
         [TRANSFERRING] (64 KiB chunks over DataChannel)
            /        \
   (Success)       (Cancel / Network Failure)
       v                  v
  [VERIFYING]      [CANCELLED] / [CONNECTION_LOST] / [NAT_TRAVERSAL_FAILED]
       |
  (SHA-256 Match)
       v
  [COMPLETED] (Saved to Dual Storage)
```

---

## 5. Offline Outbox Queue Model

When a user attempts to send media to an offline peer:
1. The backend records a lightweight metadata card in the chat history: "Media ready for direct peer transfer".
2. The sender device retains the actual binary file in an IndexedDB Outbox (`p2p_outbox`).
3. When both users connect to the signaling server simultaneously, the sender's client automatically initiates the WebRTC DataChannel session.
4. No media binaries are stored on the server during the waiting period.

---

## 6. Dual Local Storage (Android + Web)

Upon transfer completion and SHA-256 verification:
- **Web Client**: Cached in IndexedDB (`p2p_media`) for instant in-chat rendering without server fetches.
- **Android Client**:
  - Saved in application private cache for instant in-app rendering.
  - Exported to public scoped directories (`Pictures/ChatTornado` for images, `Movies/ChatTornado` for videos, `Download/ChatTornado` for documents) via `@capacitor/filesystem`.
