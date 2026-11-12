# Whiteboard Full

[Open the live whiteboard](https://whiteboardfull.onrender.com/) ·
[Sign in](https://whiteboardfull.onrender.com/login) ·
[Create an account](https://whiteboardfull.onrender.com/register) ·
[Service health](https://whiteboardfull.onrender.com/healthz) ·
[Build and test runs](https://github.com/dubeyharshit0605/whiteboardfull/actions)

Draw with shapes, text, and freehand strokes. Create an account to save boards
and share them by email with other registered users. Updates appear for collaborators
after a completed edit. You can use the home board as an unsaved scratchpad.

Based on [Sumit Kumar Sharma's whiteboard_az](https://github.com/sumitsharma372/whiteboard_az/tree/40faf63c8bae78f029dbb7fcef23ff7d456c80cc).

## Run locally

Use Node.js 22.12 or newer and a running MongoDB instance.

1. Copy `backend/.env.example` to `backend/.env`. Generate a signing secret
   with `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`
   and put it in the ignored file as `JWT_SECRET`. Set `MONGODB_URI` for your local database.
2. Run `npm ci --prefix whiteboard-tutorial` and `npm run build --prefix whiteboard-tutorial`.
3. Run `npm ci --prefix backend` and `npm start --prefix backend`.
4. Open `http://localhost:5000`. To develop the UI with hot reload, leave
   the API on port 5000 and run `npm start --prefix whiteboard-tutorial`.

## Verify

See the [build log](harness/build-log.md) for the deployment checks. Build the
frontend and run `npm test --prefix backend` with `TEST_MONGODB_URI`
set to an isolated local MongoDB instance. The suite creates and drops its own
test database. GitHub Actions runs the build and tests with a MongoDB service.

## Deploy with Render and Atlas

1. In Atlas, create a cluster and a database user with `readWrite` on the
   application database. Include the database name in the connection string.
2. In Render, create a Blueprint using this repo and its root [`render.yaml`](render.yaml).
   Supply the Atlas connection string as the secret `MONGODB_URI` in Render.
   Render generates `JWT_SECRET`.
3. Add Render's outbound IP ranges for the service to the Atlas project
   access list. Deploy or retry the first deploy after access is in place.
4. Check `/healthz` for a 200 response, then confirm login, sharing, live updates
   in two sessions, and reopening a saved board URL.

[Render Blueprint reference](https://render.com/docs/blueprint-spec) ·
[Render WebSockets](https://render.com/docs/websocket) ·
[Atlas IP access list](https://www.mongodb.com/docs/atlas/security/ip-access-list/)

Use one Render instance. Live notifications use in-memory Socket.IO rooms.
A newer saved revision prevents an older copy from overwriting it. The editor
keeps a rejected drawing visible for PNG export before reload. Free hosting
can take longer on the first request after inactivity.
