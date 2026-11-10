# ChatTornado Verification & Testing Matrix

This document defines the comprehensive test protocols, automated test suites, and manual verification procedures for the native Android application and P2P WebRTC DataChannel media transfer engine.

---

## 1. Test Verification Matrix

| # | Test Scenario | Expected Result | Status |
|:---|:---|:---|:---:|
| **T01** | **User Login & JWT Auth** | Authentication succeeds on web and Android using same backend. | PASSED |
| **T02** | **Existing Text Messaging** | Real-time WebSocket text messages arrive with delivery status. | PASSED |
| **T03** | **Header UI Layout & No Overlap** | Telemetry HUD docks cleanly into flex header flow; no collisions. | PASSED |
| **T04** | **P2P Transfer Handshake** | Recipient sees card with file size/type; chunks hold until Accept. | PASSED |
| **T05** | **Recipient Acceptance Flow** | Tapping Accept triggers WebRTC offer/answer and streams chunks. | PASSED |
| **T06** | **Recipient Decline Flow** | Tapping Decline emits `p2p_transfer_reject` and aborts transfer. | PASSED |
| **T07** | **In-Flight Cancellation** | Tapping Cancel closes DataChannel and purges partial chunks. | PASSED |
| **T08** | **Flow Control & Backpressure** | `bufferedAmountLowThreshold` throttles sends to avoid memory spikes. | PASSED |
| **T09** | **AES-256-GCM Double Encryption** | Each chunk encrypted with unique 12-byte IV before transmission. | PASSED |
| **T10** | **SHA-256 Integrity Validation** | Hash verified against source file before saving to storage. | PASSED |
| **T11** | **Corrupted Chunk Detection** | Tampered or mismatched chunk fails SHA-256 (`INTEGRITY_FAILED`). | PASSED |
| **T12** | **Zero Server Storage Verification** | No media binaries posted to `/uploads` for P2P chats; zero files stored. | PASSED |
| **T13** | **Video Quality Selector** | Original (unaltered), 720p (balanced), 480p (saver) presets work. | PASSED |
| **T14** | **Offline Recipient Queue** | Files held in local IndexedDB outbox; auto-initiates when peer connects. | PASSED |
| **T15** | **Android Public Gallery Export** | Capacitor Filesystem saves photos to `Pictures/ChatTornado`. | PASSED |
| **T16** | **Android Hardware Back Button** | Back button closes open modal/chat or exits app if on home. | PASSED |
| **T17** | **Native Android APK Build** | Gradle successfully compiles `ChatTornado-Android-debug.apk`. | PASSED |

---

## 2. Automated Test Script for P2P Framing & Cryptography

To run the automated cryptographic unit test:
```powershell
node src/Services/webrtc/test_p2p_crypto.cjs
```

The test validates:
1. Deterministic binary frame packing and unpacking (Header magic `TORN`, protocol version 1, Transfer ID, chunk indices, lengths, and IVs).
2. AES-256-GCM encryption and decryption roundtrip per chunk.
3. SHA-256 digest computation and bit-for-bit file reconstruction.
4. Tampering detection: artificially altering one byte in a frame triggers validation failure.

---

## 3. Manual Device Testing Checklist

### Device Setup:
- **Device 1**: Android Phone / Emulator running `ChatTornado-Android-debug.apk`.
- **Device 2**: Desktop / Laptop browser (`http://localhost:5173` or `https://chattornado.vercel.app`).

### Test Execution Steps:
1. Log into Device 1 as User A (e.g. `jeevika`).
2. Log into Device 2 as User B (e.g. `aneesh`).
3. Open chat between User A and User B.
4. On Device 1, tap attachment icon -> select photo -> send.
5. On Device 2, observe incoming P2P transfer card showing filename and file size.
6. Verify no network requests to `/uploads` or `/uploads/images` occur in DevTools Network tab.
7. On Device 2, tap **Accept**.
8. Observe progress bar advances from 0% to 100% with live transfer speed.
9. Verify photo renders immediately upon SHA-256 verification.
10. Check Android phone's Google Photos / Gallery -> `Pictures/ChatTornado` folder contains the saved image.
