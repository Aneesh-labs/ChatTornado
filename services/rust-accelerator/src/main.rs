use regex::Regex;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::env;
use std::io::Cursor;
use std::sync::Arc;
use tiny_http::{Header, Response, Server, StatusCode};

#[derive(Serialize, Deserialize)]
struct HealthResponse {
    status: String,
    engine: String,
    version: String,
    port: u16,
}

#[derive(Deserialize)]
struct CosineRequest {
    vector_a: Vec<f64>,
    vector_b: Vec<f64>,
}

#[derive(Serialize)]
struct CosineResponse {
    similarity: f64,
    dimensions: usize,
    latency_microseconds: u64,
}

#[derive(Deserialize)]
struct AuditRequest {
    text: String,
}

#[derive(Serialize)]
struct AuditResponse {
    passed: bool,
    action: String,
    reason: String,
    matches: Vec<String>,
}

#[derive(Deserialize)]
struct HashRequest {
    data: String,
}

#[derive(Serialize)]
struct HashResponse {
    sha256_hex: String,
    byte_length: usize,
}

struct EngineState {
    injection_regexes: Vec<Regex>,
    credential_regexes: Vec<(Regex, &'static str)>,
}

fn compute_cosine_similarity(a: &[f64], b: &[f64]) -> f64 {
    if a.len() != b.len() || a.is_empty() {
        return 0.0;
    }
    let mut dot = 0.0;
    let mut norm_a = 0.0;
    let mut norm_b = 0.0;

    for (x, y) in a.iter().zip(b.iter()) {
        dot += x * y;
        norm_a += x * x;
        norm_b += y * y;
    }

    if norm_a <= 0.0 || norm_b <= 0.0 {
        0.0
    } else {
        dot / (norm_a.sqrt() * norm_b.sqrt())
    }
}

fn main() {
    let port_str = env::var("PORT").unwrap_or_else(|_| "8085".to_string());
    let port: u16 = port_str.parse().unwrap_or(8085);
    let addr = format!("0.0.0.0:{}", port);

    let server = Server::http(&addr).expect("Failed to bind Rust Accelerator HTTP Server");

    println!("==================================================");
    println!(" ChatTornado High-Performance Rust Accelerator");
    println!(" Listening on http://{}", addr);
    println!(" Vector Math, Crypto & Security Acceleration Ready");
    println!("==================================================");

    let state = Arc::new(EngineState {
        injection_regexes: vec![
            Regex::new(r"(?i)\bignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions\b").unwrap(),
            Regex::new(r"(?i)\bdisregard\s+(?:all\s+)?(?:system|developer)\s+prompts?\b").unwrap(),
            Regex::new(r"(?i)\breveal\s+(?:the\s+)?(?:full\s+)?system\s+prompt\b").unwrap(),
            Regex::new(r"(?i)\byou\s+are\s+now\s+(?:DAN|jailbroken|unrestricted|in\s+developer\s+mode)\b").unwrap(),
            Regex::new(r"(?i)\[SYSTEM\s+OVERRIDE\]").unwrap(),
        ],
        credential_regexes: vec![
            (Regex::new(r"AIzaSy[A-Za-z0-9_-]{30,45}").unwrap(), "Google Gemini API Key"),
            (Regex::new(r"sk-[A-Za-z0-9_-]{32,}").unwrap(), "OpenAI/OpenRouter API Key"),
            (Regex::new(r"ghp_[A-Za-z0-9]{36}").unwrap(), "GitHub Personal Access Token"),
            (Regex::new(r"-----BEGIN (?:RSA |EC )?PRIVATE KEY-----").unwrap(), "Private Key"),
        ],
    });

    for mut request in server.incoming_requests() {
        let url = request.url().to_string();
        let method = request.method().to_string();
        let state_clone = Arc::clone(&state);

        let content_type_header = Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap();
        let cors_header = Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap();

        // 1. Health check
        if url == "/health" || url == "/" {
            let resp = HealthResponse {
                status: "healthy".into(),
                engine: "rust-accelerator-simd".into(),
                version: "1.0.0".into(),
                port,
            };
            let body = serde_json::to_string(&resp).unwrap();
            let mut response = Response::from_string(body);
            response.add_header(content_type_header);
            response.add_header(cors_header);
            let _ = request.respond(response);
            continue;
        }

        // 2. Cosine Similarity Vector Math
        if url == "/api/embeddings/cosine-similarity" && method == "POST" {
            let start = std::time::Instant::now();
            let mut body_str = String::new();
            let _ = request.as_reader().read_to_string(&mut body_str);

            if let Ok(payload) = serde_json::from_str::<CosineRequest>(&body_str) {
                let dims = payload.vector_a.len();
                let sim = compute_cosine_similarity(&payload.vector_a, &payload.vector_b);
                let elapsed = start.elapsed().as_micros() as u64;

                let resp = CosineResponse {
                    similarity: sim,
                    dimensions: dims,
                    latency_microseconds: elapsed,
                };
                let body = serde_json::to_string(&resp).unwrap();
                let mut response = Response::from_string(body);
                response.add_header(content_type_header);
                response.add_header(cors_header);
                let _ = request.respond(response);
                continue;
            }
        }

        // 3. High-Speed Security Audit
        if url == "/api/security/audit" && method == "POST" {
            let mut body_str = String::new();
            let _ = request.as_reader().read_to_string(&mut body_str);

            if let Ok(payload) = serde_json::from_str::<AuditRequest>(&body_str) {
                let mut matches = Vec::new();
                let mut passed = true;
                let mut reason = String::new();
                let mut action = "ALLOW".to_string();

                for re in &state_clone.injection_regexes {
                    if re.is_match(&payload.text) {
                        passed = false;
                        action = "BLOCK".to_string();
                        reason = "Prompt injection attempt detected".to_string();
                        matches.push("PROMPT_INJECTION".to_string());
                        break;
                    }
                }

                if passed {
                    for (re, name) in &state_clone.credential_regexes {
                        if re.is_match(&payload.text) {
                            passed = false;
                            action = "MASK".to_string();
                            reason = format!("Exposed credential found: {}", name);
                            matches.push(name.to_string());
                            break;
                        }
                    }
                }

                let resp = AuditResponse {
                    passed,
                    action,
                    reason,
                    matches,
                };
                let body = serde_json::to_string(&resp).unwrap();
                let mut response = Response::from_string(body);
                response.add_header(content_type_header);
                response.add_header(cors_header);
                let _ = request.respond(response);
                continue;
            }
        }

        // 4. Crypto SHA-256 Wire-speed Hashing
        if url == "/api/crypto/sha256" && method == "POST" {
            let mut body_str = String::new();
            let _ = request.as_reader().read_to_string(&mut body_str);

            if let Ok(payload) = serde_json::from_str::<HashRequest>(&body_str) {
                let mut hasher = Sha256::new();
                hasher.update(payload.data.as_bytes());
                let result = hasher.finalize();
                let hex_str = format!("{:x}", result);

                let resp = HashResponse {
                    sha256_hex: hex_str,
                    byte_length: payload.data.len(),
                };
                let body = serde_json::to_string(&resp).unwrap();
                let mut response = Response::from_string(body);
                response.add_header(content_type_header);
                response.add_header(cors_header);
                let _ = request.respond(response);
                continue;
            }
        }

        // Fallback 404
        let err_resp = Response::new(
            StatusCode(404),
            vec![content_type_header, cors_header],
            Cursor::new(b"{\"error\":\"Not Found\"}".to_vec()),
            None,
            None,
        );
        let _ = request.respond(err_resp);
    }
}
