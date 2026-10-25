/**
 * Plain-language checks shared by the garden tool value functions.
 * gradeLevel: Flesch-Kincaid grade with a simple syllable heuristic. Good enough to compare
 * versions of the same page; not a precise readability measurement.
 */
export function syllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const core = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const m = core.match(/[aeiouy]{1,2}/g);
  return Math.max(1, m ? m.length : 1);
}

export function gradeLevel(text) {
  const clean = String(text).replace(/[A-Z][a-z]+ [a-z]+(?= )/g, m => m).replace(/\s+/g, ' ').trim();
  const sentences = Math.max(1, (clean.match(/[.!?](\s|$)/g) || []).length);
  const words = clean.split(/\s+/).filter(w => /[a-z]/i.test(w));
  if (!words.length) return 0;
  const syl = words.reduce((s, w) => s + syllables(w), 0);
  return 0.39 * (words.length / sentences) + 11.8 * (syl / words.length) - 15.59;
}

/** Words a home gardener should not need to know to act on an answer. */
export const JARGON = ['compatib', 'taxon', 'segregat', 'cultivar', 'embryo', 'phenotype', 'F2\\b', 'selfed', 'receptive', 'interspecif', 'interspecies', 'pollen parent', 'genotyp', 'heterozyg', 'xenia', 'isolate flowers intended', 'true-to-type seed\\.'];

export function brokenText(t) {
  return /undefined|NaN|\[object|null\b|\s\s|\bthe the\b|\.\./.test(String(t));
}
