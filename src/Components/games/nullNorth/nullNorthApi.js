import API from "../../../Services/API";

function authConfig() {
  const token = sessionStorage.getItem("token");
  return token
    ? { headers: { Authorization: `Bearer ${token}` }, params: { token } }
    : {};
}

export async function createNullNorthMatch(payload = {}) {
  const res = await API.post("/api/games/null-north/matches", payload, authConfig());
  return res.data;
}

export async function listNullNorthMatches() {
  const res = await API.get("/api/games/null-north/matches", authConfig());
  return res.data?.matches || [];
}

export async function getNullNorthMatch(matchRef) {
  const res = await API.get(`/api/games/null-north/matches/${encodeURIComponent(matchRef)}`, authConfig());
  return res.data;
}

export async function joinNullNorthMatch(matchRef) {
  const res = await API.post(`/api/games/null-north/matches/${encodeURIComponent(matchRef)}/join`, {}, authConfig());
  return res.data;
}

export async function selectNullNorthRole(matchRef, role) {
  const res = await API.post(`/api/games/null-north/matches/${encodeURIComponent(matchRef)}/role`, { role }, authConfig());
  return res.data;
}

export async function toggleNullNorthReady(matchRef) {
  const res = await API.post(`/api/games/null-north/matches/${encodeURIComponent(matchRef)}/ready`, {}, authConfig());
  return res.data;
}

export async function startNullNorthMatch(matchRef) {
  const res = await API.post(`/api/games/null-north/matches/${encodeURIComponent(matchRef)}/start`, {}, authConfig());
  return res.data;
}

export async function submitNullNorthAction(matchRef, actionType, payload = {}) {
  const res = await API.post(
    `/api/games/null-north/matches/${encodeURIComponent(matchRef)}/actions`,
    { action_type: actionType, payload },
    authConfig()
  );
  return res.data;
}

export async function getNullNorthState(matchRef) {
  const res = await API.get(`/api/games/null-north/matches/${encodeURIComponent(matchRef)}/state`, authConfig());
  return res.data?.state;
}

export async function getNullNorthProfile() {
  const res = await API.get("/api/games/null-north/profile", authConfig());
  return res.data;
}

export async function getNullNorthLeaderboard() {
  const res = await API.get("/api/games/null-north/leaderboard", authConfig());
  return res.data?.leaderboard || [];
}

export async function inviteToNullNorthMatch(matchRef, payload = {}) {
  const res = await API.post(
    `/api/games/null-north/matches/${encodeURIComponent(matchRef)}/invite`,
    payload,
    authConfig()
  );
  return res.data;
}
