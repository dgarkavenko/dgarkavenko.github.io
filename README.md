# Shared Cursor Multiplayer Demo

A minimal multiplayer “shared cursor” web app with a static client (GitHub Pages friendly) and a lightweight WebSocket relay server.

## Repo Structure

```
/client
  index.html
  styles.css
  app.js
/server
  package.json
  server.js
```

## Local Development

### 1) Start the WebSocket server

```bash
cd server
npm install
npm start
```

The server listens on `http://localhost:8080` by default (set `PORT` to change it).

### 2) Serve the client

Because GitHub Pages is static, run any simple static server locally:

```bash
cd client
python3 -m http.server 5500
```

Open `http://localhost:5500` in two browser windows and join with different names.

## Deploying the Client (GitHub Pages)

1. Push this repo to GitHub.
2. In the repo settings, enable GitHub Pages and point it to the `/client` folder on the default branch.
3. Share the GitHub Pages URL with others.

## Configuring the Server URL

The client connects to a WebSocket URL in this order:

1. Query param override: `?ws=wss://YOURSERVER`
2. Fallback constant in `client/app.js` (`DEFAULT_WS_URL`)

If you deploy the server (Render/Fly/Railway), update the URL using the `?ws=` query param or change `DEFAULT_WS_URL` in `client/app.js`.

## Quick Test (Two People)

1. Person A starts the server locally or uses the deployed server.
2. Both people open the same room URL, e.g. `https://yourname.github.io/yourrepo/#room=lobby`.
3. Enter display names and move the mouse. Each cursor (with name) should appear for everyone.
4. Close one tab: the cursor should disappear within a couple seconds.
