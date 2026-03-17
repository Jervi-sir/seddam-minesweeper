import { Pool } from "pg";

// Reuse the pool across invocations (best practice for serverless).
let pool;
function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("Missing DATABASE_URL env var");
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Neon typically requires SSL.
      ssl: { rejectUnauthorized: false },
      max: 1,
    });
  }
  return pool;
}

function getClientIp(req) {
  // Vercel sits behind proxies; x-forwarded-for is the standard.
  const xff = req.headers["x-forwarded-for"];
  const first = Array.isArray(xff) ? xff[0] : xff;

  const ipFromXff = first ? first.split(",")[0].trim() : "";
  return (
    ipFromXff ||
    req.headers["x-real-ip"] ||
    // Last resort (not always set in serverless):
    req.socket?.remoteAddress ||
    "unknown"
  );
}

async function readJsonBody(req) {
  return await new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      // This endpoint should only receive tiny payloads.
      if (data.length > 10_000) resolve({});
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

export default async function handler(req, res) {
  // Only accept POSTs.
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  try {
    const body = await readJsonBody(req);

    const ip = getClientIp(req);
    const userAgent = req.headers["user-agent"] || "";
    const referrer = req.headers.referer || req.headers.referrer || "";
    const path = typeof body.path === "string" ? body.path : "";

    const db = getPool();
    await db.query(
      "insert into visits (ip, user_agent, path, referrer) values ($1, $2, $3, $4)",
      [ip, userAgent, path, referrer]
    );

    // No content is fine for tracking beacons.
    res.status(204).end();
  } catch {
    res.status(500).json({ ok: false });
  }
}
