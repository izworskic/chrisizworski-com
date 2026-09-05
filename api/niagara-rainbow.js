module.exports = async function niagaraRainbowHandler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  const mod = await import('../lib/niagara-rainbow-engine.mjs');
  return mod.default(req, res);
};
