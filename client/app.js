const DEFAULT_WS_URL = "ws://localhost:8080";

const joinPanel = document.getElementById("join-panel");
const joinButton = document.getElementById("join-button");
const nameInput = document.getElementById("name");
const stage = document.getElementById("stage");
const roomCodeEl = document.getElementById("room-code");
const statusEl = document.getElementById("status");

const players = new Map();
let socket = null;
let clientId = null;
let lastSent = 0;
let lastPos = { x: null, y: null };
let latestPos = { x: 0.5, y: 0.5 };
let hasJoined = false;

const roomId = getRoomId();
roomCodeEl.textContent = roomId;

const wsUrl = getWsUrl();

joinButton.addEventListener("click", join);
nameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    join();
  }
});

function join() {
  if (hasJoined) {
    return;
  }
  const rawName = nameInput.value.trim();
  if (!rawName) {
    nameInput.focus();
    return;
  }
  hasJoined = true;
  joinPanel.style.display = "none";
  connect(rawName);
}

function connect(name) {
  setStatus("Connecting…", "");
  socket = new WebSocket(wsUrl);

  socket.addEventListener("open", () => {
    setStatus("Connected", "connected");
    socket.send(
      JSON.stringify({
        type: "hello",
        name,
        room: roomId,
      })
    );
  });

  socket.addEventListener("message", (event) => {
    let payload = null;
    try {
      payload = JSON.parse(event.data);
    } catch (error) {
      return;
    }
    handleMessage(payload);
  });

  socket.addEventListener("close", () => {
    setStatus("Disconnected", "disconnected");
    cleanupPlayers();
  });

  socket.addEventListener("error", () => {
    setStatus("Connection error", "disconnected");
  });

  stage.addEventListener("mousemove", handleMouseMove);
}

function handleMessage(message) {
  switch (message.type) {
    case "welcome":
      clientId = message.id;
      syncPlayers(message.players || []);
      ensurePlayer(clientId, nameInput.value.trim(), latestPos.x, latestPos.y);
      break;
    case "player_join":
      if (message.player) {
        const player = message.player;
        ensurePlayer(player.id, player.name, player.x, player.y);
      }
      break;
    case "cursor":
      if (typeof message.id !== "string") {
        return;
      }
      updatePlayerPosition(message.id, message.x, message.y);
      break;
    case "player_leave":
      if (typeof message.id !== "string") {
        return;
      }
      removePlayer(message.id);
      break;
    case "error":
      console.warn(message.message);
      break;
    default:
      break;
  }
}

function handleMouseMove(event) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return;
  }
  const rect = stage.getBoundingClientRect();
  const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
  const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);

  latestPos = { x, y };
  updatePlayerPosition(clientId, x, y);

  const now = performance.now();
  if (now - lastSent < 33) {
    return;
  }
  if (lastPos.x === x && lastPos.y === y) {
    return;
  }
  lastSent = now;
  lastPos = { x, y };
  socket.send(JSON.stringify({ type: "cursor", x, y }));
}

function syncPlayers(playersList) {
  playersList.forEach((player) => {
    ensurePlayer(player.id, player.name, player.x, player.y);
  });
}

function ensurePlayer(id, name, x = 0.5, y = 0.5) {
  if (!id) {
    return;
  }
  if (players.has(id)) {
    updatePlayerPosition(id, x, y);
    return;
  }
  const color = colorFromId(id);
  const wrapper = document.createElement("div");
  wrapper.className = "cursor";
  wrapper.style.color = color;

  const label = document.createElement("div");
  label.className = "cursor-label";
  label.textContent = name;

  const dot = document.createElement("div");
  dot.className = "cursor-dot";

  wrapper.appendChild(label);
  wrapper.appendChild(dot);
  stage.appendChild(wrapper);

  players.set(id, { id, name, x, y, el: wrapper });
  updatePlayerPosition(id, x, y);
}

function updatePlayerPosition(id, x, y) {
  const player = players.get(id);
  if (!player || x == null || y == null) {
    return;
  }
  player.x = x;
  player.y = y;
  const rect = stage.getBoundingClientRect();
  player.el.style.left = `${x * rect.width}px`;
  player.el.style.top = `${y * rect.height}px`;
}

function removePlayer(id) {
  const player = players.get(id);
  if (!player) {
    return;
  }
  player.el.remove();
  players.delete(id);
}

function cleanupPlayers() {
  players.forEach((player) => player.el.remove());
  players.clear();
  clientId = null;
}

function setStatus(text, className) {
  statusEl.textContent = text;
  statusEl.className = `status ${className}`.trim();
}

function getRoomId() {
  const params = new URLSearchParams(window.location.search);
  const roomFromQuery = params.get("room");
  if (roomFromQuery) {
    return sanitizeRoom(roomFromQuery);
  }
  if (window.location.hash) {
    const hash = window.location.hash.replace("#", "");
    const hashParams = new URLSearchParams(hash);
    const roomFromHash = hashParams.get("room");
    if (roomFromHash) {
      return sanitizeRoom(roomFromHash);
    }
  }
  return "lobby";
}

function sanitizeRoom(room) {
  const cleaned = room.toString().trim();
  if (!cleaned) {
    return "lobby";
  }
  return cleaned.slice(0, 32);
}

function getWsUrl() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("ws");
  return fromQuery || DEFAULT_WS_URL;
}

function colorFromId(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 80%, 60%)`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
