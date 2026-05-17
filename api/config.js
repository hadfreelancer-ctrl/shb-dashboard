// Vercel Serverless Function — Config API
const GITHUB_REPO = "hadfreelancer-ctrl/shb-dashboard";
const CONFIG_FILE = "config.json";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ ok: false, error: "GITHUB_TOKEN not configured" });

  const headers = {
    "Authorization": "token " + token,
    "Accept": "application/vnd.github.v3+json",
    "Content-Type": "application/json",
  };

  if (req.method === "GET") {
    try {
      const r = await fetch("https://api.github.com/repos/" + GITHUB_REPO + "/contents/" + CONFIG_FILE, { headers });
      if (r.status === 404) return res.json({ ok: true, config: {} });
      const data = await r.json();
      const content = Buffer.from(data.content, "base64").toString("utf8");
      return res.json({ ok: true, config: JSON.parse(content) });
    } catch(e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  if (req.method === "POST") {
    try {
      const { config } = req.body;
      if (!config) return res.status(400).json({ ok: false, error: "Missing config" });

      let sha;
      const existing = await fetch("https://api.github.com/repos/" + GITHUB_REPO + "/contents/" + CONFIG_FILE, { headers });
      if (existing.ok) { const d = await existing.json(); sha = d.sha; }

      const content = Buffer.from(JSON.stringify(config, null, 2)).toString("base64");
      const body = { message: "Update config", content, ...(sha ? { sha } : {}) };

      const r = await fetch("https://api.github.com/repos/" + GITHUB_REPO + "/contents/" + CONFIG_FILE, {
        method: "PUT", headers, body: JSON.stringify(body)
      });
      const result = await r.json();
      if (result.content) return res.json({ ok: true, savedAt: new Date().toISOString() });
      return res.status(500).json({ ok: false, error: result.message });
    } catch(e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
};
