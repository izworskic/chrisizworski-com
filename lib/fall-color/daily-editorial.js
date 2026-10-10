// Cost-capped editorial only: this function never runs from a page request.
// The daily cron owns the once-per-day distributed Redis reservation.
const MODEL = "claude-haiku-4-5-20251001";
function compactRegions(snap) {
  return (Array.isArray(snap) ? snap : []).filter(r => r && typeof r.name === "string" && Number.isFinite(r.pct))
    .slice(0, 12).map(r => ({
      name: String(r.name).slice(0, 75),
      modeledPercent: Math.round(r.pct),
      phase: String(r.phase || "").slice(0, 30),
      weather: String(r.weatherFeel || "").slice(0, 140),
      drive: String(r.drive || "").slice(0, 90),
    }));
}
async function generateDailyFallEditorial(snap, key = process.env.ANTHROPIC_API_KEY_FALL_COLOR) {
  if (!key) return null;
  const evidence = compactRegions(snap);
  if (!evidence.length) return null;
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      signal: AbortSignal.timeout(12000),
      body: JSON.stringify({
        model: MODEL, max_tokens: 420, temperature: 0,
        system: "Write a concise Michigan fall foliage briefing ONLY from the JSON evidence. Three short paragraphs (each up to 60 words): current modeled color comparison; how timing and given weather affect this weekend; a region-specific outing suggestion. Do not invent observations, precipitation, closures, or named sites. Percentages are estimates from the model, NOT observed percent of leaves. If information is unavailable, say so. No markdown, headings, intro, or claims of firsthand reports.",
        messages: [{ role: "user", content: JSON.stringify({ note: "Daily model snapshot; use ONLY these input facts", regions: evidence }) }],
      }),
    });
    if (!response.ok) return null; // 429/billing errors are NOT retried in the same day.
    const data = await response.json();
    if (data.stop_reason === "max_tokens") return null;
    const body = (data.content || []).filter(b => b && b.type === "text").map(b => b.text).join("").trim();
    if (body.length < 110 || body.length > 1400 || body.split(/\n\s*\n/).length !== 3) return null;
    return body;
  } catch { return null; }
}
module.exports = { compactRegions, generateDailyFallEditorial, MODEL };
