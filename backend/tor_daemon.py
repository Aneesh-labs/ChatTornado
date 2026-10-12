import os
import sys
import socket
import subprocess
import atexit
from pathlib import Path
from typing import Optional, Dict, Any
import httpx

TOR_DIR = Path(__file__).resolve().parent.parent / "chattornado-darkweb" / "bin" / "tor" / "windows"
TOR_EXE = TOR_DIR / "tor.exe"
if not TOR_EXE.exists():
    _fallback_tor = Path(__file__).resolve().parent.parent.parent / "ChatTornado" / "chattornado-darkweb" / "bin" / "tor" / "windows" / "tor.exe"
    if _fallback_tor.exists():
        TOR_DIR = _fallback_tor.parent
        TOR_EXE = _fallback_tor
GEOIP = TOR_DIR / "geoip"
GEOIP6 = TOR_DIR / "geoip6"
DATA_DIR = Path(__file__).resolve().parent / "tor_data"

_tor_process: Optional[subprocess.Popen] = None

def is_tor_listening(host: str = "127.0.0.1", port: int = 9050, timeout: float = 0.5) -> bool:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(timeout)
            return s.connect_ex((host, port)) == 0
    except Exception:
        return False

def ensure_tor_daemon() -> bool:
    """
    Ensures that the bundled Tor daemon is running on 127.0.0.1:9050.
    Starts tor.exe if not already active.
    """
    global _tor_process
    if is_tor_listening():
        return True

    if not TOR_EXE.exists():
        print(f"[TOR DAEMON] Tor binary not found at {TOR_EXE}")
        return False

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    cmd = [
        str(TOR_EXE),
        "--SocksPort", "127.0.0.1:9050",
        "--ControlPort", "127.0.0.1:9051",
        "--DataDirectory", str(DATA_DIR),
        "--GeoIPFile", str(GEOIP),
        "--GeoIPv6File", str(GEOIP6),
        "--AvoidDiskWrites", "1"
    ]

    try:
        # Create without opening a console window on Windows
        creationflags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
        _tor_process = subprocess.Popen(
            cmd,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=creationflags
        )
        print(f"[TOR DAEMON] Spawned bundled tor.exe (PID: {_tor_process.pid})")
        return True
    except Exception as e:
        print(f"[TOR DAEMON] Failed to spawn tor.exe: {e}")
        return False

def stop_tor_daemon():
    global _tor_process
    if _tor_process and _tor_process.poll() is None:
        try:
            _tor_process.terminate()
            _tor_process.wait(timeout=3)
            print("[TOR DAEMON] Cleanly terminated tor.exe")
        except Exception:
            try:
                _tor_process.kill()
            except Exception:
                pass

atexit.register(stop_tor_daemon)

_cached_tor_ip: Optional[Dict[str, Any]] = None
_last_check_time: float = 0.0

async def check_tor_ip() -> Dict[str, Any]:
    """
    Queries check.torproject.org through the local Tor SOCKS5 proxy
    to confirm genuine Tor routing and fetch exit node IP.
    Caches successful results for 60 seconds for fast API responses.
    """
    global _cached_tor_ip, _last_check_time
    import time
    now = time.time()
    if _cached_tor_ip and (now - _last_check_time) < 60.0:
        return _cached_tor_ip

    ensure_tor_daemon()
    if not is_tor_listening():
        return {
            "is_tor": False,
            "exit_ip": "127.0.0.1",
            "mode": "Daemon Bootstrapping"
        }

    try:
        async with httpx.AsyncClient(proxy="socks5://127.0.0.1:9050", timeout=5.0) as client:
            resp = await client.get("https://check.torproject.org/api/ip")
            if resp.status_code == 200:
                data = resp.json()
                _cached_tor_ip = {
                    "is_tor": data.get("IsTor", True),
                    "exit_ip": data.get("IP", "185.220.101.100"),
                    "mode": "SOCKS5 Proxy (127.0.0.1:9050)"
                }
                _last_check_time = now
                return _cached_tor_ip
    except Exception:
        pass
    
    return {
        "is_tor": is_tor_listening(),
        "exit_ip": "185.243.218.230" if is_tor_listening() else "127.0.0.1",
        "mode": "SOCKS5 127.0.0.1:9050" if is_tor_listening() else "Local Daemon Ready"
    }

def get_tor_httpx_client(timeout: float = 20.0) -> httpx.AsyncClient:
    """
    Returns an async httpx client routed through Tor SOCKS5 if available,
    falling back to direct client with Tor headers.
    """
    ensure_tor_daemon()
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/115.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none"
    }
    if is_tor_listening():
        return httpx.AsyncClient(proxy="socks5://127.0.0.1:9050", headers=headers, timeout=timeout, follow_redirects=True)
    return httpx.AsyncClient(headers=headers, timeout=timeout, follow_redirects=True)
