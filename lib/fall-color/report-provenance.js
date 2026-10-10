// Historical reports without a method marker were AI-written; never retroactively
// relabel them. All newly scheduled editions are produced without an LLM.
const NOTE_DISCLOSURE = "AI-generated summary of regional model estimates and weather inputs, published by Chris Izworski. This is not a firsthand field report; compare the current regional readings and their source dates.";
const MODEL_DISCLOSURE = "Automated summary composed from regional fall-color model estimates and weather inputs, published by Chris Izworski without generative AI. This is not a firsthand field report; compare current regional readings and their source dates.";
function disclosureFor(report) {
  return report && report.generationMethod === "Deterministic model summary"
    ? MODEL_DISCLOSURE : NOTE_DISCLOSURE;
}
function annotateReport(report) {
  const generationMethod = report && report.generationMethod === "Deterministic model summary"
    ? "Deterministic model summary" : "AI-generated model summary";
  return { ...report, generationMethod, publisher: "Chris Izworski", disclosure: disclosureFor(report) };
}
module.exports = { NOTE_DISCLOSURE, MODEL_DISCLOSURE, disclosureFor, annotateReport };
