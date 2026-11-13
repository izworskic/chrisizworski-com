//! Upper Peninsula waterfall spatial and publication-safety core.
//! Input is reviewed editorial data, NOT a land-manager access feed.
//! Geographic points never become parking, driving, trail or live-opening claims.
//! Build: rustc --edition=2021 -O rust/up-waterfalls-engine/src/main.rs -o /tmp/up-waterfalls-engine
//! Input: one TSV row per curated card: id, latitude, longitude, status, arrival_verification.
//! Output: ROW\tid\t0|1 and EDGE\torigin_id\ttarget_id\tstraight_line_miles.
//! Fail closed on malformed/duplicate rows and invalid feature coordinates.

use std::collections::HashSet;
use std::io::{self, Read, Write};

const EARTH_RADIUS_MILES: f64 = 3958.7613;
const MAX_NEARBY_MILES: f64 = 50.0;

#[derive(Clone, Debug)]
struct Fall {
    id: String,
    latitude: f64,
    longitude: f64,
    status: String,
    arrival_verified: bool,
}

fn is_explicit_search_only(id: &str) -> bool {
    matches!(id, "scott-falls" | "houghton-douglass-falls" | "boston-creek-cascades")
}

// The existence of a GIS feature or tourist listing never implies visitor eligibility.
// "verify" means published visitor access, NOT a current live opening.
fn eligible(f: &Fall) -> bool {
    f.arrival_verified
        && matches!(f.status.as_str(), "verify" | "seasonal" | "restricted")
        && !is_explicit_search_only(&f.id)
}

fn miles(a: &Fall, b: &Fall) -> f64 {
    let latitude_a = a.latitude.to_radians();
    let latitude_b = b.latitude.to_radians();
    let delta_lat = (b.latitude - a.latitude).to_radians();
    let delta_lon = (b.longitude - a.longitude).to_radians();
    let haversine = (delta_lat / 2.0).sin().powi(2)
        + latitude_a.cos() * latitude_b.cos() * (delta_lon / 2.0).sin().powi(2);
    2.0 * EARTH_RADIUS_MILES * haversine.clamp(0.0, 1.0).sqrt().asin()
}

fn parse(input: &str) -> Result<Vec<Fall>, String> {
    let mut falls = Vec::new();
    let mut seen = HashSet::new();
    for (index, line) in input.lines().enumerate() {
        if line.is_empty() {
            continue;
        }
        let fields: Vec<&str> = line.split('\t').collect();
        if fields.len() != 5 {
            return Err(format!("line {}: expected 5 TSV fields", index + 1));
        }
        let id = fields[0];
        if id.is_empty()
            || !id.bytes().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == b'-')
            || !seen.insert(id.to_string())
        {
            return Err(format!("line {}: invalid or duplicate destination id", index + 1));
        }
        let latitude = fields[1].parse::<f64>().map_err(|_| "invalid latitude")?;
        let longitude = fields[2].parse::<f64>().map_err(|_| "invalid longitude")?;
        if !latitude.is_finite()
            || !longitude.is_finite()
            || !(45.0..=48.5).contains(&latitude)
            || !(-91.0..=-84.0).contains(&longitude)
        {
            return Err(format!("line {}: point outside U.P. review bounds", index + 1));
        }
        if !matches!(fields[3], "verify" | "seasonal" | "restricted" | "closed" | "research") {
            return Err(format!("line {}: unknown access classification", index + 1));
        }
        let arrival_verified = fields[4] == "verified";
        if !matches!(fields[4], "verified" | "pending" | "closed" | "specialist") {
            return Err(format!("line {}: unknown arrival verification", index + 1));
        }
        falls.push(Fall {
            id: id.to_string(),
            latitude,
            longitude,
            status: fields[3].to_string(),
            arrival_verified,
        });
    }
    if falls.is_empty() {
        return Err("empty source ledger".to_string());
    }
    Ok(falls)
}

fn write_result(mut output: impl Write, falls: &[Fall]) -> io::Result<()> {
    for fall in falls {
        writeln!(output, "ROW\t{}\t{}", fall.id, u8::from(eligible(fall)))?;
    }
    for origin in falls.iter().filter(|f| eligible(f)) {
        for target in falls.iter().filter(|f| eligible(f) && f.id != origin.id) {
            let distance = miles(origin, target);
            if distance <= MAX_NEARBY_MILES {
                writeln!(output, "EDGE\t{}\t{}\t{:.15}", origin.id, target.id, distance)?;
            }
        }
    }
    Ok(())
}

fn main() {
    let mut input = String::new();
    if let Err(error) = io::stdin().read_to_string(&mut input) {
        eprintln!("Waterfall Rust input failed: {error}");
        std::process::exit(1);
    }
    let falls = match parse(&input) {
        Ok(value) => value,
        Err(error) => {
            eprintln!("Waterfall Rust source rejected: {error}");
            std::process::exit(1);
        }
    };
    if let Err(error) = write_result(io::stdout().lock(), &falls) {
        eprintln!("Waterfall Rust output failed: {error}");
        std::process::exit(1);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fall(id: &str, lat: f64, lon: f64, status: &str, verified: bool) -> Fall {
        Fall {
            id: id.to_string(),
            latitude: lat,
            longitude: lon,
            status: status.to_string(),
            arrival_verified: verified,
        }
    }

    #[test]
    fn excludes_closed_research_unverified_and_explicit_only() {
        assert!(eligible(&fall("bond-falls", 46.40992, -89.132584, "seasonal", true)));
        assert!(eligible(&fall("gorge-falls", 46.64045, -90.050083, "restricted", true)));
        assert!(!eligible(&fall("dead-river-falls", 46.5, -87.4, "research", true)));
        assert!(!eligible(&fall("au-train-falls", 46.4, -86.8, "closed", true)));
        assert!(!eligible(&fall("alger-falls", 46.4, -86.6, "verify", false)));
        for id in ["scott-falls", "houghton-douglass-falls", "boston-creek-cascades"] {
            assert!(!eligible(&fall(id, 46.5, -87.4, "verify", true)));
        }
    }

    #[test]
    fn rejects_invented_geography_and_duplicate_ids() {
        assert!(parse("bond-falls\t46.40992\t-89.132584\tseasonal\tverified\n").is_ok());
        assert!(parse("bond-falls\t46.4\t-89.1\tverify\tverified\nbond-falls\t46.5\t-89.2\tverify\tverified\n").is_err());
        assert!(parse("bad\tNaN\t-89.2\tverify\tverified\n").is_err());
        assert!(parse("bad\t46.4\t-89.2\tunknown\tverified\n").is_err());
        assert!(parse("bad\t46.4\t-89.2\tverify\tunknown\n").is_err());
        assert!(parse("bad\t40\t-89.2\tverify\tverified\n").is_err());
    }

    #[test]
    fn symmetric_geodesics_are_not_travel_times() {
        let bond = fall("bond-falls", 46.40992, -89.132584, "seasonal", true);
        let agate = fall("agate-falls", 46.480924, -89.090229, "restricted", true);
        let one = miles(&bond, &agate);
        let two = miles(&agate, &bond);
        assert!((one - two).abs() < 1e-10);
        assert!(one > 4.0 && one < 6.0);
        assert_eq!(miles(&bond, &bond), 0.0);
    }

    #[test]
    fn output_contains_eligibility_and_directed_nearby_pairs_only() {
        let cases = parse(concat!(
            "bond-falls\t46.40992\t-89.132584\tseasonal\tverified\n",
            "agate-falls\t46.480924\t-89.090229\trestricted\tverified\n",
            "scott-falls\t46.5\t-87.4\tverify\tverified\n",
            "alger-falls\t46.4\t-86.6\tresearch\tpending\n"
        )).unwrap();
        let mut output = Vec::new();
        write_result(&mut output, &cases).unwrap();
        let value = String::from_utf8(output).unwrap();
        assert!(value.contains("ROW\tbond-falls\t1"));
        assert!(value.contains("ROW\tscott-falls\t0"));
        assert!(value.contains("ROW\talger-falls\t0"));
        assert!(value.contains("EDGE\tbond-falls\tagate-falls\t"));
        assert!(value.contains("EDGE\tagate-falls\tbond-falls\t"));
        assert!(!value.contains("EDGE\tscott-falls\t"));
        assert!(!value.contains("EDGE\talger-falls\t"));
    }
}
