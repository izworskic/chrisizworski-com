//! Hub search ranking core for the tool directories (/tools/, /national-tools/,
//! /michigan-gardening/). Compiled with plain rustc to wasm32-unknown-unknown.
//!
//! The browser keeps an independent JavaScript oracle
//! (public/assets/hub-search-engine.js). Every Rust result is compared with the
//! oracle and the page falls back to JavaScript on any drift, so this core can
//! never promote a result the documented contract would not.
//!
//! Input (UTF-8, '\n' separated lines, '\t' separated fields):
//!   Q <query>
//!   L <key> <alt> <alt> ...          lexicon: key term expands to alternatives
//!   D <title> <tags> <place> <kind> <description> <months>
//! Output words at hs_output_ptr(): [term_count, score0, matched0, score1, matched1, ...]
//! Scores are integers so parity with JavaScript is exact.

const INPUT_CAP: usize = 262_144;
const MAX_DOCS: usize = 1024;
const OUTPUT_WORDS: usize = 1 + MAX_DOCS * 2;
const MAX_TOKEN: usize = 40;
const WEIGHTS: [i32; 6] = [10, 7, 6, 4, 2, 3]; // title, tags, place, kind, description, months
const MONTHS_FIELD: usize = 5;

static mut INPUT: [u8; INPUT_CAP] = [0; INPUT_CAP];
static mut OUTPUT: [i32; OUTPUT_WORDS] = [0; OUTPUT_WORDS];

const STOPWORDS: [&str; 41] = [
    "a", "an", "and", "are", "at", "be", "best", "by", "can", "do", "does", "for", "from", "good",
    "how", "i", "in", "is", "it", "me", "my", "near", "of", "on", "or", "should", "the", "this",
    "to", "what", "when", "where", "which", "will", "with", "you", "your", "find", "get", "go",
    "about",
];
const FOLD_FROM: &str = "àáâãäåāÀÁÂÃÄÅĀçÇèéêëēÈÉÊËĒìíîïīÌÍÎÏĪñÑòóôõöøōÒÓÔÕÖØŌùúûüūÙÚÛÜŪýÿÝ";
const FOLD_TO: &str = "aaaaaaaaaaaaaacceeeeeeeeeeiiiiiiiiiinnoooooooooooooouuuuuuuuuuyyy";

#[no_mangle]
pub extern "C" fn hs_abi_version() -> u32 { 1 }
#[no_mangle]
pub extern "C" fn hs_input_ptr() -> u32 { std::ptr::addr_of_mut!(INPUT).cast::<u8>() as u32 }
#[no_mangle]
pub extern "C" fn hs_input_cap() -> u32 { INPUT_CAP as u32 }
#[no_mangle]
pub extern "C" fn hs_output_ptr() -> u32 { std::ptr::addr_of_mut!(OUTPUT).cast::<i32>() as u32 }
#[no_mangle]
pub extern "C" fn hs_max_docs() -> u32 { MAX_DOCS as u32 }

/// Rank the documents in the input buffer. Returns the document count, or a
/// negative code: -1 input too long, -2 invalid UTF-8, -3 too many documents.
#[no_mangle]
pub extern "C" fn hs_rank(len: u32) -> i32 {
    let len = len as usize;
    if len > INPUT_CAP { return -1; }
    // SAFETY: single-threaded wasm; JS writes then calls synchronously.
    let input: &[u8; INPUT_CAP] = unsafe { &*std::ptr::addr_of!(INPUT) };
    let bytes = &input[..len];
    let text = match std::str::from_utf8(bytes) { Ok(t) => t, Err(_) => return -2 };
    let result = match rank_text(text) { Some(r) => r, None => return -3 };
    let out = unsafe { &mut *std::ptr::addr_of_mut!(OUTPUT) };
    out[0] = result.terms as i32;
    for (i, (score, matched)) in result.docs.iter().enumerate() {
        out[1 + i * 2] = *score;
        out[2 + i * 2] = *matched;
    }
    result.docs.len() as i32
}

pub struct Ranked { pub terms: usize, pub docs: Vec<(i32, i32)> }

pub fn normalize(raw: &str) -> String {
    let from: Vec<char> = FOLD_FROM.chars().collect();
    let to: Vec<char> = FOLD_TO.chars().collect();
    let mut out = String::with_capacity(raw.len());
    for c in raw.chars() {
        if c == '\'' || c == '\u{2019}' || c == '\u{2018}' || c == '\u{02BB}' || c == '\u{02BC}' { continue; }
        let c = match from.iter().position(|f| *f == c) { Some(i) => to[i], None => c };
        if c.is_ascii_uppercase() { out.push(c.to_ascii_lowercase()); }
        else if c.is_ascii_lowercase() || c.is_ascii_digit() { out.push(c); }
        else { out.push(' '); }
    }
    out
}

pub fn stem(token: &str) -> String {
    let n = token.len();
    let t = token;
    let mut s = if n >= 5 && t.ends_with("ies") {
        let mut v = t[..n - 3].to_string(); v.push('y'); v
    } else if n >= 6 && t.ends_with("ing") {
        t[..n - 3].to_string()
    } else if n >= 5 && (t.ends_with("ches") || t.ends_with("shes") || t.ends_with("sses") || t.ends_with("xes") || t.ends_with("zes")) {
        t[..n - 2].to_string()
    } else if n >= 4 && t.ends_with('s') && !t.ends_with("ss") && !t.ends_with("us") && !t.ends_with("is") {
        t[..n - 1].to_string()
    } else {
        t.to_string()
    };
    if s.len() > MAX_TOKEN { s.truncate(MAX_TOKEN); }
    s
}

fn terms_of(raw: &str) -> Vec<String> {
    normalize(raw).split(' ').filter(|w| !w.is_empty()).map(stem).collect()
}

fn query_terms(raw: &str) -> Vec<String> {
    normalize(raw)
        .split(' ')
        .filter(|w| !w.is_empty() && !STOPWORDS.contains(w))
        .map(stem)
        .collect()
}

/// Optimal string alignment distance, or max+1 once it is certainly larger.
pub fn osa(a: &[u8], b: &[u8], max: usize) -> usize {
    let (n, m) = (a.len(), b.len());
    if n.abs_diff(m) > max { return max + 1; }
    let width = m + 1;
    let mut d = vec![0usize; (n + 1) * width];
    for i in 0..=n { d[i * width] = i; }
    for j in 0..=m { d[j] = j; }
    for i in 1..=n {
        let mut row_min = usize::MAX;
        for j in 1..=m {
            let cost = if a[i - 1] == b[j - 1] { 0 } else { 1 };
            let mut v = (d[(i - 1) * width + j] + 1).min(d[i * width + j - 1] + 1).min(d[(i - 1) * width + j - 1] + cost);
            if i > 1 && j > 1 && a[i - 1] == b[j - 2] && a[i - 2] == b[j - 1] {
                v = v.min(d[(i - 2) * width + j - 2] + 1);
            }
            d[i * width + j] = v;
            if v < row_min { row_min = v; }
        }
        if row_min > max { return max + 1; }
    }
    d[n * width + m]
}

pub fn quality(alt: &str, token: &str, original: bool, fuzzy: bool) -> i32 {
    if token == alt { return if original { 100 } else { 90 }; }
    if !original { return 0; }
    let (la, ld) = (alt.len(), token.len());
    if la >= 3 && token.starts_with(alt) { return 70; }
    if la >= 4 && token.contains(alt) { return 40; }
    if fuzzy && la >= 4 && ld >= 4 {
        let max = if la >= 8 { 2 } else { 1 };
        let dist = osa(alt.as_bytes(), token.as_bytes(), max);
        if dist <= max { return if dist == 1 { 50 } else { 35 }; }
    }
    0
}

fn contains_run(tokens: &[String], run: &[String]) -> bool {
    if run.is_empty() || run.len() > tokens.len() { return false; }
    tokens.windows(run.len()).any(|w| w == run)
}

/// Best field plus a quarter of the other fields that also match, so a word in
/// the title or description outranks the same word only in appended tags.
fn term_score(doc: &[Vec<String>; 6], alts: &[String], fuzzy: bool) -> i32 {
    let mut best = 0i32;
    let mut total = 0i32;
    for (field, tokens) in doc.iter().enumerate() {
        let mut q = 0i32;
        for (ai, alt) in alts.iter().enumerate() {
            for token in tokens { q = q.max(quality(alt, token, ai == 0, fuzzy)); }
        }
        let f = q * WEIGHTS[field];
        total += f;
        best = best.max(f);
    }
    best + (total - best) / 4
}

pub fn rank_text(text: &str) -> Option<Ranked> {
    let mut query = "";
    let mut lexicon: Vec<(String, Vec<String>)> = Vec::new();
    let mut docs: Vec<[Vec<String>; 6]> = Vec::new();
    for line in text.split('\n') {
        let mut fields = line.split('\t');
        match fields.next() {
            Some("Q") => { query = fields.next().unwrap_or(""); }
            Some("L") => {
                let key = terms_of(fields.next().unwrap_or(""));
                if key.len() != 1 { continue; }
                let mut alts = Vec::new();
                for alt in fields {
                    let a = terms_of(alt);
                    if a.len() == 1 && a[0] != key[0] && !alts.contains(&a[0]) { alts.push(a[0].clone()); }
                }
                lexicon.push((key[0].clone(), alts));
            }
            Some("D") => {
                if docs.len() >= MAX_DOCS { return None; }
                let mut doc: [Vec<String>; 6] = Default::default();
                for (i, slot) in doc.iter_mut().enumerate() {
                    let value = fields.next().unwrap_or("");
                    *slot = if i == MONTHS_FIELD {
                        normalize(value).split(' ').filter(|w| !w.is_empty()).map(|w| { let mut m = String::from("m"); m.push_str(w); m }).collect()
                    } else { terms_of(value) };
                }
                docs.push(doc);
            }
            _ => {}
        }
    }
    let terms = query_terms(query);
    let expansions: Vec<Vec<String>> = terms.iter().map(|t| {
        let mut alts = vec![t.clone()];
        for (key, list) in &lexicon {
            if key == t { for a in list { if !alts.contains(a) { alts.push(a.clone()); } } }
        }
        alts
    }).collect();
    // Typo matching is a fallback: it only runs for a term no document matches
    // exactly, by prefix, by synonym or inside a compound word.
    let mut per_term: Vec<Vec<i32>> = Vec::with_capacity(expansions.len());
    for alts in &expansions {
        let mut scores: Vec<i32> = docs.iter().map(|doc| term_score(doc, alts, false)).collect();
        if scores.iter().all(|s| *s == 0) {
            scores = docs.iter().map(|doc| term_score(doc, alts, true)).collect();
        }
        per_term.push(scores);
    }
    let mut ranked = Vec::with_capacity(docs.len());
    for (d, doc) in docs.iter().enumerate() {
        let mut score = 0i32;
        let mut matched = 0i32;
        for scores in &per_term {
            if scores[d] > 0 { matched += 1; }
            score += scores[d];
        }
        if terms.len() >= 2 {
            if contains_run(&doc[0], &terms) { score += 400; }
            else if contains_run(&doc[1], &terms) || contains_run(&doc[4], &terms) { score += 150; }
        }
        ranked.push((score, matched));
    }
    Some(Ranked { terms: terms.len(), docs: ranked })
}

#[cfg(test)]
mod tests {
    use super::*;
    fn doc(title: &str, tags: &str, months: &str) -> String {
        let mut s = String::from("D\t"); s.push_str(title); s.push_str("\t"); s.push_str(tags);
        s.push_str("\t\t\t\t"); s.push_str(months); s
    }
    fn run(query: &str, lex: &str, docs: &[String]) -> Ranked {
        let mut t = String::from("Q\t"); t.push_str(query); t.push('\n'); t.push_str(lex);
        for d in docs { t.push('\n'); t.push_str(d); }
        rank_text(&t).unwrap()
    }
    #[test] fn folds_accents_and_okina() {
        assert_eq!(normalize("Haleakalā Hawaiʻi"), "haleakala hawaii");
        assert_eq!(normalize("Snow & Ice—Lake's"), "snow   ice lakes");
    }
    #[test] fn stems_plurals_and_ing() {
        assert_eq!(stem("falls"), "fall"); assert_eq!(stem("berries"), "berry");
        assert_eq!(stem("fishing"), "fish"); assert_eq!(stem("beaches"), "beach");
        assert_eq!(stem("grass"), "grass"); assert_eq!(stem("ice"), "ice");
    }
    #[test] fn osa_counts_transposition() {
        assert_eq!(osa(b"chrismtas", b"christmas", 2), 1);
        assert_eq!(osa(b"chrismas", b"christmas", 2), 1);
        assert!(osa(b"abc", b"xyzxyz", 1) > 1);
    }
    #[test] fn synonym_and_typo_find_christmas() {
        let docs = vec![doc("White Christmas Odds", "snow holiday", "11,12"), doc("Frost Dates", "garden", "4,5")];
        let r = run("xmas", "L\txmas\tchristmas", &docs);
        assert!(r.docs[0].0 > 0 && r.docs[1].0 == 0);
        let r = run("chrismas", "", &docs);
        assert!(r.docs[0].0 > 0 && r.docs[1].0 == 0);
    }
    #[test] fn month_names_reach_months_field() {
        let docs = vec![doc("White Christmas Odds", "snow", "10,11,12"), doc("Morels", "mushroom", "4,5")];
        let r = run("december snow", "L\tdecember\tm12", &docs);
        assert_eq!(r.terms, 2);
        assert_eq!(r.docs[0].1, 2);
        assert_eq!(r.docs[1].1, 0);
    }
    #[test] fn stopwords_only_query_has_no_terms() {
        let r = run("the best of", "", &[doc("A", "b", "")]);
        assert_eq!(r.terms, 0);
    }
    #[test] fn title_phrase_beats_scattered_terms() {
        let docs = vec![doc("Ice Fishing Forecast", "lake", ""), doc("Lake Ice Report", "fishing", "")];
        let r = run("ice fishing", "", &docs);
        assert!(r.docs[0].0 > r.docs[1].0);
    }
    #[test] fn typo_matching_is_only_a_fallback() {
        let docs = vec![doc("Flight Tracker", "plane", ""), doc("Planting Calendar", "plant", "")];
        let r = run("plane", "", &docs);
        assert!(r.docs[0].0 > 0 && r.docs[1].0 == 0);
    }
    #[test] fn corroborating_fields_break_tag_ties() {
        let docs = vec![
            String::from("D\tSkyway Bridge\tflorida manatee\t\t\tCrossing wind\t"),
            String::from("D\tBlue Spring\tflorida manatee\t\t\tMorning for manatees\t"),
        ];
        let r = run("manatee", "", &docs);
        assert!(r.docs[1].0 > r.docs[0].0);
    }
    #[test] fn abi_round_trip() {
        let text = b"Q\tsnow\nD\tSnow Totals\tsnow\t\t\t\t12";
        let input: &mut [u8; INPUT_CAP] = unsafe { &mut *std::ptr::addr_of_mut!(INPUT) };
        input[..text.len()].copy_from_slice(text);
        assert_eq!(hs_rank(text.len() as u32), 1);
        let out = unsafe { &*std::ptr::addr_of!(OUTPUT) };
        assert_eq!(out[0], 1);
        assert!(out[1] > 0 && out[2] == 1);
    }
}
