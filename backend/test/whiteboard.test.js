const { test } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { io: connect } = require("socket.io-client");
const { once } = require("node:events");
const { createServer } = require("../server");

test("account, canvas persistence, sharing, revisions and live notifications", { timeout: 25000 }, async (t) => {
  assert.ok(process.env.TEST_MONGODB_URI, "Set TEST_MONGODB_URI to a local test server");
  const dbName = "whiteboard_test_" + Date.now();
  process.env.JWT_SECRET = "integration-test-only-generated-in-ci";
  await mongoose.connect(process.env.TEST_MONGODB_URI, { dbName });
  const { server, io } = createServer();
  t.after(async () => {
    await new Promise(resolve => io.close(resolve));
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const origin = "http://127.0.0.1:" + server.address().port;
  async function request(path, status, { method = "GET", token, body } = {}) {
    const response = await fetch(origin + path, {
      method,
      headers: { "Content-Type": "application/json", ...(token && { Authorization: "Bearer " + token }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    assert.equal(response.status, status, path);
    return response.json();
  }
  async function account(email) {
    const body = { email, password: "example-password" };
    await request("/api/users/register", 201, { method: "POST", body });
    return (await request("/api/users/login", 200, { method: "POST", body })).token;
  }
  await request("/healthz", 200);
  for (const path of ["/", "/login", "/register", "/0123456789abcdef01234567"]) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Whiteboard Full/);
  }
  await request("/api/not-a-route", 404);
  await request("/api/users/login", 400, { method: "POST", body: { email: {} } });
  await request("/api/canvas/list", 401, { token: "invalid" });
  const owner = await account("owner@example.test");
  const peer = await account("peer@example.test");
  const user = await request("/api/users/me", 200, { token: peer });
  assert.equal(user.password, undefined);
  const { canvasId } = await request("/api/canvas/create", 201, { method: "POST", token: owner });
  const load = "/api/canvas/load/" + canvasId;
  const update = "/api/canvas/update";
  const save = (token, status, revision, elements) =>
    request(update, status, { method: "PUT", token, body: { canvasId, revision, elements } });
  const openSocket = (token) => connect(origin, {
    auth: { token, canvasId }, transports: ["websocket"], reconnection: false, forceNew: true,
  });
  const denied = openSocket(peer);
  assert.equal((await once(denied, "connect_error"))[0].message, "Canvas unavailable");
  denied.close();
  await request(load, 404, { token: peer });
  await save(peer, 404, 0, []);
  await request("/api/canvas/share/" + canvasId, 200, {
    method: "PUT", token: owner, body: { email: "PEER@example.test" },
  });
  const peerSocket = openSocket(peer);
  t.after(() => peerSocket.close());
  await once(peerSocket, "connect");
  const change = once(peerSocket, "canvasChanged");
  const elements = [{ id: 0, type: "TEXT", x1: 1, y1: 2, x2: 1, y2: 2,
    size: 32, stroke: "#000000", text: "A shared drawing" }];
  await save(owner, 400, 0, [{ type: "UNKNOWN" }]);
  assert.equal((await save(owner, 200, 0, elements)).revision, 1);
  await change;
  await save(peer, 409, 0, []);
  peerSocket.disconnect();
  const rejoined = once(peerSocket, "connect");
  peerSocket.connect();
  await rejoined;
  const secondChange = once(peerSocket, "canvasChanged");
  const results = await Promise.all([owner, peer].map(async token => {
    const response = await fetch(origin + update, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ canvasId, revision: 1, elements }),
    });
    return response.status;
  }));
  assert.deepEqual(results.sort(), [200, 409]);
  assert.deepEqual(await secondChange, [2]);
  assert.deepEqual((await request(load, 200, { token: peer })).elements, elements);
  const revoked = once(peerSocket, "disconnect");
  await request("/api/canvas/unshare/" + canvasId, 200, {
    method: "PUT", token: owner, body: { userIdToRemove: user._id },
  });
  await revoked;
  await save(peer, 404, 2, []);
  assert.equal((await request(load, 200, { token: owner })).revision, 2);
  await request("/api/canvas/delete/" + canvasId, 200, { method: "DELETE", token: owner });
  await request(load, 404, { token: owner });
});
