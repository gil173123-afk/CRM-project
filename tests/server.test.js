const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createServer } = require("../server");

async function withServer(run) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "crm1-test-"));
  const dataFile = path.join(folder, "contacts.json");
  fs.copyFileSync(path.join(__dirname, "..", "data", "contacts.json"), dataFile);
  const server = createServer({ dataFile });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  try { await run(base); }
  finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    fs.rmSync(folder, { recursive: true, force: true });
  }
}

test("serves the CRM home page", async () => withServer(async base => {
  const response = await fetch(base + "/");
  assert.equal(response.status, 200);
  assert.match(await response.text(), /North Star CRM/);
}));

test("starts with five sample contacts", async () => withServer(async base => {
  const response = await fetch(base + "/api/contacts");
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.contacts.length, 5);
}));

test("search matches contact names without case sensitivity", async () => withServer(async base => {
  const response = await fetch(base + "/api/contacts?q=JAMIE");
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.contacts.length, 1);
  assert.equal(body.contacts[0].name, "Jamie Rivera");
}));

test("rejects blank or whitespace-only names", async () => withServer(async base => {
  for (const name of ["", "   ", undefined]) {
    const response = await fetch(base + "/api/contacts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, "Name is required.");
  }
}));

test("saves a valid contact and keeps it after a new request", async () => withServer(async base => {
  const response = await fetch(base + "/api/contacts", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "  Morgan Lee  ", organization: "Example Group", email: "morgan@example.org" })
  });
  const saved = await response.json();
  assert.equal(response.status, 201);
  assert.equal(saved.contact.name, "Morgan Lee");
  const list = await (await fetch(base + "/api/contacts")).json();
  assert.equal(list.contacts.length, 6);
  assert.equal(list.contacts[0].name, "Morgan Lee");
}));