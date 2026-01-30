const http = require("http");
const { WebSocketServer } = require("ws");
const { randomUUID } = require("crypto");

const PORT = process.env.PORT || 8080;
const MAX_PAYLOAD_BYTES = 4096;
const MAX_MESSAGES_PER_SECOND = 60;

const allowedOriginPatterns = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/.*\.github\.io$/,
];

const rooms = new Map();

const server = http.createServer();
const wss = new WebSocketServer({ server, maxPayload: MAX_PAYLOAD_BYTES });

wss.on("connection", (socket, request) => {
  const origin = request.headers.origin;
  if (origin && !isOriginAllowed(origin)) {
    socket.close(1008, "Origin not allowed");
    return;
  }

  const clientId = `p-${randomUUID()}`;
  const clientInfo = {
    id: clientId,
    name: null,
    roomId: null,
    x: 0.5,
    y: 0.5,
    rate: { windowStart: Date.now(), count: 0 },
    socket,
  };

  socket.on("message", (data) => {
    if (typeof data !== "string" || data.length > MAX_PAYLOAD_BYTES) {
      return;
    }
    if (!withinRateLimit(clientInfo)) {
      return;
    }

    let message;
    try {
      message = JSON.parse(data);
    } catch (error) {
      return;
    }

    if (!message || typeof message.type !== "string") {
      return;
    }

    if (message.type === "hello") {
      handleHello(socket, clientInfo, message);
      return;
    }

    if (message.type === "cursor") {
      handleCursor(socket, clientInfo, message);
    }
  });

  socket.on("close", () => {
    handleDisconnect(clientInfo);
  });
});

function handleHello(socket, clientInfo, message) {
  if (clientInfo.name) {
    return;
  }
  const name = sanitizeName(message.name);
  if (!name) {
    send(socket, { type: "error", message: "Invalid name." });
    return;
  }

  const roomId = sanitizeRoom(message.room);
  clientInfo.name = name;
  clientInfo.roomId = roomId;

  const room = getRoom(roomId);
  room.set(clientInfo.id, clientInfo);

  const roster = Array.from(room.values())
    .filter((player) => player.id !== clientInfo.id)
    .map((player) => ({
      id: player.id,
      name: player.name,
      x: player.x,
      y: player.y,
    }));

  send(socket, {
    type: "welcome",
    id: clientInfo.id,
    room: roomId,
    players: roster,
  });

  broadcast(roomId, {
    type: "player_join",
    player: {
      id: clientInfo.id,
      name: clientInfo.name,
      x: clientInfo.x,
      y: clientInfo.y,
    },
  }, clientInfo.id);
}

function handleCursor(socket, clientInfo, message) {
  if (!clientInfo.roomId) {
    return;
  }
  const x = Number(message.x);
  const y = Number(message.y);
  if (!isFinite(x) || !isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) {
    return;
  }
  clientInfo.x = x;
  clientInfo.y = y;

  broadcast(clientInfo.roomId, { type: "cursor", id: clientInfo.id, x, y }, clientInfo.id);
}

function handleDisconnect(clientInfo) {
  if (!clientInfo.roomId) {
    return;
  }
  const room = rooms.get(clientInfo.roomId);
  if (!room) {
    return;
  }
  room.delete(clientInfo.id);
  broadcast(clientInfo.roomId, { type: "player_leave", id: clientInfo.id }, clientInfo.id);

  if (room.size === 0) {
    rooms.delete(clientInfo.roomId);
  }
}

function broadcast(roomId, payload, excludeId) {
  const room = rooms.get(roomId);
  if (!room) {
    return;
  }
  const data = JSON.stringify(payload);
  room.forEach((player) => {
    if (player.id === excludeId) {
      return;
    }
    if (player.socket && player.socket.readyState === player.socket.OPEN) {
      player.socket.send(data);
    }
  });
}

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map());
  }
  return rooms.get(roomId);
}

function send(socket, payload) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function sanitizeName(name) {
  if (typeof name !== "string") {
    return null;
  }
  const cleaned = name.trim();
  if (!/^[\x20-\x7E]{1,20}$/.test(cleaned)) {
    return null;
  }
  return cleaned;
}

function sanitizeRoom(room) {
  if (typeof room !== "string") {
    return "lobby";
  }
  const cleaned = room.trim().slice(0, 32);
  if (!cleaned) {
    return "lobby";
  }
  return cleaned;
}

function withinRateLimit(clientInfo) {
  const now = Date.now();
  const rate = clientInfo.rate;
  if (now - rate.windowStart > 1000) {
    rate.windowStart = now;
    rate.count = 0;
  }
  rate.count += 1;
  return rate.count <= MAX_MESSAGES_PER_SECOND;
}

function isOriginAllowed(origin) {
  return allowedOriginPatterns.some((pattern) => pattern.test(origin));
}

server.listen(PORT, () => {
  console.log(`Shared cursor server listening on port ${PORT}`);
});
