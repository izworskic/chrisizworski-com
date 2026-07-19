const { chooseVarieties } = require("../lib/matchmaker");

module.exports = async function handler(req, res) {
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  } catch {
    return res.status(400).json({ error: "Request body must be valid JSON" });
  }
  const fields = ["zone", "sun", "space", "experience", "goal"];
  if (!fields.every((field) => typeof body[field] === "string" && body[field].length > 0 && body[field].length <= 500)) {
    return res.status(400).json({ error: "Please answer all five questions" });
  }

  return res.status(200).json({ varieties: chooseVarieties(body) });
};
