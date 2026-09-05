module.exports = async function niagaraRainbowHandler(req, res) {
  const mod = await import('../lib/niagara-rainbow-engine.mjs');
  return mod.default(req, res);
};
