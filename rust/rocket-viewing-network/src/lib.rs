//! Shared launch-viewing comparison core for Wallops and Starbase.
//! Compiles with no dependencies to a small browser WebAssembly binary.
//!
//! Authoritative place descriptions, official access rules and mission data
//! stay in the existing region-specific JavaScript source models and APIs.
//! This Rust engine ranks published candidates ONLY; it never determines
//! launch GO, public entry, parking availability, road access or sightlines.
#![no_std]

use core::panic::PanicInfo;

#[cfg(not(test))]
#[panic_handler]
fn panic(_info: &PanicInfo) -> ! { loop {} }

// Stable ABI. Region 1: Wallops, 2: Starbase.
// Site index, from each published places.json:
// Wallops 0 NASA Visitor Center, 1 Reed Waterfront, 2 Curtis Merritt Harbor.
// Starbase 0 Isla Blanca Park, 1 Zapata Ramp, 2 Port Isabel Lighthouse.
// Profile IDs:
// Wallops 0 first, 1 backup, 2 science, 3 photo.
// Starbase 0 first-time, 1 no-causeway, 2 history.
// No option is a confirmed public opening. Users must follow source notices.
#[no_mangle]
pub extern "C" fn rv_engine_version() -> u32 { 1 }

#[no_mangle]
pub extern "C" fn rv_region_count() -> u32 { 2 }

#[no_mangle]
pub extern "C" fn rv_site_count(region: u32) -> u32 {
    match region { 1 | 2 => 3, _ => 0 }
}

#[no_mangle]
pub extern "C" fn rv_profile_count(region: u32) -> u32 {
    match region { 1 => 4, 2 => 3, _ => 0 }
}

// Score 30/20/10 for published preference order. Invalid = -1.
// We only order known locations; we don't manufacture an 'open' state.
#[no_mangle]
pub extern "C" fn rv_rank(region: u32, profile: u32, site: u32) -> i32 {
    if site >= 3 { return -1; }
    let ranks: [u32; 3] = match (region, profile) {
        (1, 0) | (1, 2) => [0, 1, 2],
        (1, 1) => [1, 2, 0],
        (1, 3) => [2, 1, 0],
        (2, 0) => [0, 1, 2],
        (2, 1) => [1, 2, 0],
        (2, 2) => [2, 1, 0],
        _ => return -1,
    };
    for (position, candidate) in ranks.iter().enumerate() {
        if *candidate == site { return 30 - (position as i32) * 10; }
    }
    -1
}

// Always returns 0: position ranks don't authorize access.
// This distinct export prevents treating 'top ranked' as 'open'.
#[no_mangle]
pub extern "C" fn rv_access_verified(_region: u32, _site: u32) -> u32 { 0 }

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_contract_is_stable() {
        assert_eq!(rv_engine_version(), 1);
        assert_eq!(rv_region_count(), 2);
        assert_eq!(rv_site_count(1), 3);
        assert_eq!(rv_site_count(2), 3);
        assert_eq!(rv_site_count(3), 0);
        assert_eq!(rv_profile_count(1), 4);
        assert_eq!(rv_profile_count(2), 3);
    }

    #[test]
    fn published_preference_orders_hold() {
        for (region, profile, order) in [
            (1, 0, [0, 1, 2]), (1, 1, [1, 2, 0]),
            (1, 2, [0, 1, 2]), (1, 3, [2, 1, 0]),
            (2, 0, [0, 1, 2]), (2, 1, [1, 2, 0]),
            (2, 2, [2, 1, 0]),
        ] {
            assert_eq!(rv_rank(region, profile, order[0]), 30);
            assert_eq!(rv_rank(region, profile, order[1]), 20);
            assert_eq!(rv_rank(region, profile, order[2]), 10);
        }
    }

    #[test]
    fn invalid_input_fails_closed_and_ranking_cannot_approve_entry() {
        assert_eq!(rv_rank(1, 99, 0), -1);
        assert_eq!(rv_rank(99, 0, 0), -1);
        assert_eq!(rv_rank(1, 0, 3), -1);
        for region in 1..=2 { for site in 0..3 {
            assert_eq!(rv_access_verified(region, site), 0);
        }}
    }
}
