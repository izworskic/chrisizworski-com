// Independent Rust validation of the Python airport catalog stream.
// No third-party crates or WASM download. Run in CI only:
//   python3 scripts/holiday-travel/verify_airport_catalog.py --tsv | /tmp/holiday-airport-catalog-check
use std::collections::{HashMap, HashSet};
use std::io::{self, BufRead};

fn run() -> Result<(), String> {
    let stdin = io::stdin();
    let mut codes = HashSet::new();
    let mut cities: HashMap<String, usize> = HashMap::new();
    let mut previous: Option<String> = None;
    let mut rows = 0usize;
    let mut total_flights = 0u64;
    for (number, line) in stdin.lock().lines().enumerate() {
        let line = line.map_err(|e| format!("reading airport row {}: {e}", number + 1))?;
        let cols: Vec<_> = line.split('\t').collect();
        if cols.len() != 3 {
            return Err(format!("expected 3 columns in row {}", number + 1));
        }
        let (code, city, flights) = (cols[0], cols[1].trim(), cols[2]);
        if code.len() != 3 || !code.bytes().all(|ch| ch.is_ascii_uppercase()) {
            return Err(format!("invalid IATA code in row {}", number + 1));
        }
        if !codes.insert(code.to_owned()) {
            return Err(format!("duplicate airport code {code}"));
        }
        if let Some(ref prev) = previous {
            if prev.as_str() >= code {
                return Err(format!("airport TSV must be strictly sorted by code: {code}"));
            }
        }
        previous = Some(code.to_string());
        if city.is_empty() || city.chars().any(|ch| ch.is_control()) {
            return Err(format!("{code}: empty or unsafe display label"));
        }
        let flights: u64 = flights.parse().map_err(|_| format!("{code}: invalid flight count"))?;
        if flights == 0 { return Err(format!("{code}: no historical flights")); }
        total_flights = total_flights.checked_add(flights)
            .ok_or_else(|| "flight-count overflow".to_string())?;
        *cities.entry(city.to_lowercase()).or_default() += 1;
        rows += 1;
    }
    if rows < 30 {
        return Err(format!("expected at least 30 BTS airports, got {rows}"));
    }
    for sample in ["ATL", "DTW", "JFK", "ORD"] {
        if !codes.contains(sample) { return Err(format!("required known IATA code missing: {sample}")); }
    }
    let ambiguous = cities.values().filter(|&&count| count > 1).count();
    println!("Rust airport contract: {rows} codes, {total_flights} historical flights, \
              {ambiguous} ambiguous city names; IATA selection required.");
    Ok(())
}
fn main() {
    if let Err(error) = run() {
        eprintln!("Holiday airport Rust audit failed: {error}");
        std::process::exit(1);
    }
}
