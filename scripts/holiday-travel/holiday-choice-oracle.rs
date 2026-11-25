//! Independent stdlib-only oracle for airport type-to-find ranking.
//! Offline QA only: not compiled to WebAssembly or shipped to visitors.
use std::io::{self, BufRead};

fn normal(s: &str) -> String {
    let mut out = String::new();
    for ch in s.chars() {
        if ch.is_ascii_alphanumeric() {
            out.push(ch.to_ascii_lowercase());
        } else if !out.ends_with(' ') {
            out.push(' ');
        }
    }
    out.trim().to_owned()
}

fn score(value: &str, label: &str, query: &str) -> Option<u8> {
    let q = normal(query);
    let v = normal(value);
    let l = normal(label);
    if q.is_empty() { return Some(6); }
    if !q.split_whitespace().all(|t| l.contains(t) || v.contains(t)) {
        return None;
    }
    Some(if v == q { 0 }
        else if v.starts_with(&q) { 1 }
        else if l == q { 2 }
        else if l.starts_with(&q) { 3 }
        else if l.split_whitespace().any(|w| w.starts_with(&q)) { 4 }
        else { 5 })
}

fn main() {
    // Each line: query TAB 3-character IATA TAB visible airport label.
    // Output one ranking score or -1. Never reads visitor data or network.
    for line in io::stdin().lock().lines() {
        let line = line.expect("valid input");
        let parts: Vec<_> = line.splitn(3, '\t').collect();
        assert_eq!(parts.len(), 3, "expected query, IATA and label");
        println!("{}", score(parts[1], parts[2], parts[0]).map(i16::from).unwrap_or(-1));
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn iata_exact_is_best() {
        assert_eq!(score("DTW", "Detroit, MI (DTW)", "dtw"), Some(0));
        assert_eq!(score("DTW", "Detroit, MI (DTW)", "detroit"), Some(3));
    }
    #[test]
    fn phrases_can_be_out_of_order() {
        assert_eq!(score("DFW", "Dallas/Fort Worth, TX (DFW)", "fort worth"), Some(5));
        assert_eq!(score("DFW", "Dallas/Fort Worth, TX (DFW)", "worth fort"), Some(5));
    }
    #[test]
    fn rejects_unknown_airport_or_date_without_guessing() {
        assert_eq!(score("ATL", "Atlanta, GA (ATL)", "detroit"), None);
        assert_eq!(score("ATL", "Atlanta, GA (ATL)", "nonexistent"), None);
    }
    #[test]
    fn punctuation_and_case_are_consistent() {
        assert_eq!(normal("   Dallas / Fort-WORTH  "), "dallas fort worth");
        assert_eq!(score("MCO", "Orlando, FL (MCO)", " Orlando  "), Some(3));
    }
}
