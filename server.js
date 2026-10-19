const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = __dirname;
const DEFAULT_DATA_FILE = path.join(ROOT, "data", "contacts.json");
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml" };

function readContacts(dataFile) {
  try {
    const parsed = JSON.parse(fs.readFileSync(dataFile, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}
function writeContacts(dataFile, contacts) {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  fs.writeFileSync(dataFile, JSON.stringify(contacts, null, 2) + "\n", "utf8");
}
function sendJson(res, status, value) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(value));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 100_000) {
        reject(Object.assign(new Error("Request body too large"), { statusCode: 413 }));
        req.destroy();
      }
    });
    req.on("end", () => {
      try { resolve(JSON.parse(body || "{}")); }
      catch { reject(Object.assign(new Error("Request body must be valid JSON"), { statusCode: 400 })); }
    });
    req.on("error", reject);
  });
}
function createServer(options = {}) {
  const dataFile = options.dataFile || DEFAULT_DATA_FILE;
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/api/contacts" && req.method === "GET") {
      try {
        const query = (url.searchParams.get("q") || "").trim().toLocaleLowerCase();
        const contacts = readContacts(dataFile).filter(contact =>
          [contact.name, contact.organization, contact.email, contact.phone]
            .some(value => String(value || "").toLocaleLowerCase().includes(query))
        );
        return sendJson(res, 200, { contacts });
      } catch {
        return sendJson(res, 500, { error: "Could not load contacts." });
      }
    }
    if (url.pathname === "/api/contacts" && req.method === "POST") {
      try {
        const body = await readBody(req);
        const name = typeof body.name === "string" ? body.name.trim() : "";
        if (!name) return sendJson(res, 400, { error: "Name is required." });
        const contacts = readContacts(dataFile);
        const contact = {
          id: require("node:crypto").randomUUID(),
          name,
          organization: typeof body.organization === "string" ? body.organization.trim() : "",
          email: typeof body.email === "string" ? body.email.trim() : "",
          phone: typeof body.phone === "string" ? body.phone.trim() : "",
          notes: typeof body.notes === "string" ? body.notes.trim() : ""
        };
        contacts.unshift(contact);
        writeContacts(dataFile, contacts);
        return sendJson(res, 201, { contact });
      } catch (error) {
        return sendJson(res, error.statusCode || 500, { error: error.statusCode ? error.message : "Could not save contact." });
      }
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      return sendJson(res, 405, { error: "Method not allowed." });
    }
    const requested = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = path.resolve(ROOT, "public", "." + requested);
    const publicRoot = path.resolve(ROOT, "public") + path.sep;
    if (!filePath.startsWith(publicRoot)) return sendJson(res, 403, { error: "Forbidden." });
    fs.readFile(filePath, (error, content) => {
      if (error) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end("Not found");
      }
      res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream", "X-Content-Type-Options": "nosniff" });
      res.end(req.method === "HEAD" ? undefined : content);
    });
  });
}
if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  createServer().listen(port, () => console.log("CRM starter running at http://localhost:" + port));
}
module.exports = { createServer, readContacts, writeContacts };