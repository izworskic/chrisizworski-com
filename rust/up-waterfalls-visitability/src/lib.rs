//! U.P. Waterfall Explorer decision policy compiled to WebAssembly.
//! No agency data, URLs, parking positions, observations or live status live here.
//! Agency-reviewed explanatory text stays in the existing HTML/JavaScript.
//! A geographic waterfall pin cannot grant access or certify that a road is open.
#![no_std]
use core::panic::PanicInfo;

#[cfg(not(test))]
#[panic_handler]
fn panic(_info: &PanicInfo) -> ! { loop {} }

// Status: 0 documented public route ("verify", NOT live-open),
// 1 seasonal, 2 partially restricted, 3 closed, 4 research-only.
// Arrival: 1 verified published approach; 0 unknown/pending/closed/specialist.
// Flags are parsed from the already reviewed page by the adapter.
// A valid flag is not authorization, a route or a live condition.
pub const GABBRO: u32 = 1 << 0;
pub const SCOTT: u32 = 1 << 1;
pub const HOUGHTON: u32 = 1 << 2;
pub const MEX: u32 = 1 << 3;
pub const BOND: u32 = 1 << 4;
pub const MDOT: u32 = 1 << 5;
pub const PORKIES: u32 = 1 << 6;
pub const BLACK_RIVER: u32 = 1 << 7;

// Results: 0 excluded, 1 source-check needed, 2 extra source restrictions.
// Never "open now" or "safe to visit".
#[no_mangle]
pub extern "C" fn wf_policy(status: u32, arrival: u32, flags: u32, month: u32) -> u32 {
    if !(1..=12).contains(&month) || status > 4 || arrival > 1 || flags & !255 != 0 {
        return 0;
    }
    if status >= 3 || arrival != 1 { return 0; }
    let winter = month >= 11 || month <= 4;
    let winter_road = month == 12 || month <= 5;
    let caution = status == 1 || status == 2
        || (flags & (GABBRO | SCOTT | HOUGHTON | BLACK_RIVER)) != 0
        || (flags & MEX != 0 && (month >= 10 || month <= 5))
        || (flags & BOND != 0 && winter)
        || (flags & MDOT != 0 && winter)
        || (flags & PORKIES != 0 && winter_road);
    if caution { 2 } else { 1 }
}

// 0..N full published ON-SITE minutes, -1 = not documented.
// limit -1 = any time, including unmeasured durations.
#[no_mangle]
pub extern "C" fn wf_budget_allows(max_minutes: i32, limit_minutes: i32) -> u32 {
    if limit_minutes == -1 { return 1; }
    if max_minutes < 0 || limit_minutes < 0 { return 0; }
    u32::from(max_minutes <= limit_minutes)
}

// Compare candidates: source caution, official agency route evidence,
// max published on-site effort; caller breaks ties by existing name ordering.
// Non-official evidence is not proof of ineligibility, merely a tie-break.
#[no_mangle]
pub extern "C" fn wf_compare(
    a_level: u32, a_official: u32, a_minutes: i32,
    b_level: u32, b_official: u32, b_minutes: i32
) -> i32 {
    if !(1..=2).contains(&a_level) || !(1..=2).contains(&b_level)
        || a_official > 1 || b_official > 1 { return 0; }
    if a_level != b_level { return if a_level < b_level { -1 } else { 1 }; }
    if a_official != b_official { return if a_official > b_official { -1 } else { 1 }; }
    let a_time = if a_minutes < 0 { 999 } else { a_minutes };
    let b_time = if b_minutes < 0 { 999 } else { b_minutes };
    if a_time == b_time { 0 } else if a_time < b_time { -1 } else { 1 }
}

#[no_mangle]
pub extern "C" fn wf_version() -> u32 { 2 }

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn closed_unverified_and_invalid_never_recommended() {
        for status in [3, 4] {
            for m in 1..=12 { assert_eq!(wf_policy(status, 1, 0, m), 0); }
        }
        assert_eq!(wf_policy(0, 0, 0, 7), 0);
        assert_eq!(wf_policy(42, 1, 0, 7), 0);
        assert_eq!(wf_policy(0, 1, 0, 13), 0);
        assert_eq!(wf_policy(0, 1, 256, 7), 0);
    }

    #[test]
    fn seasons_have_named_source_scoped_warnings() {
        assert_eq!(wf_policy(0, 1, 0, 7), 1);
        assert_eq!(wf_policy(1, 1, 0, 7), 2);
        assert_eq!(wf_policy(2, 1, 0, 7), 2);
        for flag in [GABBRO, SCOTT, HOUGHTON, BLACK_RIVER] {
            assert_eq!(wf_policy(0, 1, flag, 7), 2);
        }
        assert_eq!(wf_policy(0, 1, PORKIES, 5), 2);
        assert_eq!(wf_policy(0, 1, PORKIES, 6), 1);
        assert_eq!(wf_policy(0, 1, BOND, 11), 2);
        assert_eq!(wf_policy(0, 1, BOND, 5), 1);
        assert_eq!(wf_policy(0, 1, MEX, 10), 2);
        assert_eq!(wf_policy(0, 1, MEX, 6), 1);
        assert_eq!(wf_policy(0, 1, MDOT, 2), 2);
        assert_eq!(wf_policy(0, 1, MDOT, 7), 1);
    }

    #[test]
    fn budget_is_max_range_not_lower_range_or_driving() {
        assert_eq!(wf_budget_allows(45, 30), 0);
        assert_eq!(wf_budget_allows(45, 60), 1);
        assert_eq!(wf_budget_allows(-1, 60), 0);
        assert_eq!(wf_budget_allows(-1, -1), 1);
        assert_eq!(wf_budget_allows(120, -1), 1);
        assert_eq!(wf_budget_allows(120, -2), 0);
    }

    #[test]
    fn stable_evidence_effort_priority() {
        assert_eq!(wf_compare(1, 0, 10, 2, 1, 5), -1);
        assert_eq!(wf_compare(1, 1, 120, 1, 0, 30), -1);
        assert_eq!(wf_compare(1, 1, 40, 1, 1, 70), -1);
        assert_eq!(wf_compare(1, 1, -1, 1, 1, 70), 1);
        assert_eq!(wf_compare(1, 1, 45, 1, 1, 45), 0);
        assert_eq!(wf_compare(3, 0, 10, 2, 1, 5), 0);
        assert_eq!(wf_version(), 2);
    }
}
