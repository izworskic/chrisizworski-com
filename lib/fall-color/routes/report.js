const { annotateReport } = require("../report-provenance.js");
const { getJson } = require("../github-edition-store.js");
// CDN-cached read-only daily GitHub edition. No paid Redis command on traffic.
module.exports = async (req, res) => {
  res.setHeader("X-Robots-Tag", "noindex");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=3600");
  res.setHeader("Content-Type", "application/json");
  const record = await getJson("mi/latest.json");
  return res.status(200).json(record?.body && record?.date ? annotateReport(record) : { report: null });
};
