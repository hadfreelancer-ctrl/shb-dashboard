// Vercel Serverless Function — Config API
// File này deploy lên Vercel, token lưu an toàn trong Environment Variables
// Endpoint: https://shb-dashboard.vercel.app/api/config

const GITHUB_REPO = "hadfreelancer-ctrl/shb-dashboard";
const CONFIG_FILE = "config.json";

export default async function handler(req, res) {
  // CORS headers — cho phép dashboard gọi vào
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return res.status(500).json({ ok: false, error: "GITHUB_TOKEN not configured" });
  }

  const headers = {
    "Authorization": `token ${token}`,
    "Accept": "application/vnd.github.v3+json",
    "Content-Type": "application/json",
  };

  // ── GET — Load config ────────────────────────────────────────
  if (req.method === "GET") {
    try {
      const r = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${CONFIG_FILE}`,
        { headers }
      );
      if (r.status === 404) {
        return res.json({ ok: true, config: {} });
      }
      const data = await r.json();
      const content = Buffer.from(data.content, "base64").toString("utf8");
      return res.json({ ok: true, config: JSON.parse(content) });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  // ── POST — Save config ───────────────────────────────────────
  if (req.method === "POST") {
    try {
      const { config } = req.body;
      if (!config) return res.status(400).json({ ok: false, error: "Missing config" });

      // Get current SHA
      let sha;
      const existing = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${CONFIG_FILE}`,
        { headers }
      );
      if (existing.ok) {
        const data = await existing.json();
        sha = data.sha;
      }

      // Write config
      const content = Buffer.from(JSON.stringify(config, null, 2)).toString("base64");
      const body = {
        message: `Update dashboard config - ${new Date().toLocaleString("vi-VN")}`,
        content,
        ...(sha ? { sha } : {}),
      };

      const r = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${CONFIG_FILE}`,
        { method: "PUT", headers, body: JSON.stringify(body) }
      );
      const result = await r.json();
      if (result.content) {
        return res.json({ ok: true, savedAt: new Date().toISOString() });
      }
      return res.status(500).json({ ok: false, error: result.message });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
