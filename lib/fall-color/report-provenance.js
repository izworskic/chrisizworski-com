const NOTE_DISCLOSURE = "AI-generated summary of regional model estimates and weather inputs, published by Chris Izworski. This is not a firsthand field report; compare the current regional readings and their source dates.";
function annotateReport(report) {
  return { ...report, generationMethod: "AI-generated model summary", publisher: "Chris Izworski", disclosure: NOTE_DISCLOSURE };
}
module.exports = { NOTE_DISCLOSURE, annotateReport };
