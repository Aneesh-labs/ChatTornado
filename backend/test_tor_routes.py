import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_tor_status_endpoint():
    response = client.get("/api/tor/status")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["socks_port"] == 9050
    assert data["fail_closed_shield"] is True
    assert isinstance(data["bundled_tor_installed"], bool)
    assert isinstance(data["desktop_app_installed"], bool)

def test_tor_circuit_endpoint():
    response = client.get("/api/tor/circuit")
    assert response.status_code == 200
    data = response.json()
    assert "hops" in data
    assert len(data["hops"]) == 3
    assert data["hops"][0]["role"] == "Guard Relay"
    assert "AES-256" in data["encryption"]

def test_tor_directory_endpoint():
    response = client.get("/api/tor/directory")
    assert response.status_code == 200
    directory = response.json()
    assert isinstance(directory, list)
    assert len(directory) >= 5
    first = directory[0]
    assert "onion_url" in first
    assert "duckduckgo" in first["id"]

def test_tor_resolve_endpoint():
    payload = {"url": "duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion"}
    response = client.post("/api/tor/resolve", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_onion"] is True
    assert "tor2web.to" in data["tor2web_url"]
    assert "onion.ws" in data["onion_ws_url"]
