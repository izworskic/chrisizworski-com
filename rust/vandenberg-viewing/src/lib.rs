//! Vandenberg spectator decision core, compiled to a dependency-free WebAssembly module.
//!
//! Index order follows `lib/vandenberg-viewing.js` and its exported places.json:
//! Ocean Park, Surf Beach, Allan Hancock, Riverbend, Beattie, Ryon.
//! The coordinates, source links, site access notes and public-hours rules remain
//! in their existing authoritative records. This module NEVER establishes access,
//! weather clearance, sightline, rocket trajectory, or road directions.
//!
//! A Rust/WebAssembly rebuild of *decision and filtering logic*, deliberately not
//! a replacement for the browser's accessible HTML or Leaflet map.
#![no_std]

use core::panic::PanicInfo;

#[cfg(not(test))]
#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    loop {}
}

const FAMILY: [i32; 6] = [3, 1, 3, 5, 5, 5];
const PHOTO: [i32; 6] = [3, 4, 5, 2, 3, 2];
const CLOSE: [i32; 6] = [5, 5, 2, 2, 1, 2];
const COUNT: u32 = 6;

// Stable numeric protocol; JavaScript validates the version and count first.
#[no_mangle]
pub extern "C" fn vg_engine_version() -> u32 { 1 }

#[no_mangle]
pub extern "C" fn vg_site_count() -> u32 { COUNT }

// 1 = coastal places, 2 = campus or town; 0 = invalid.
#[no_mangle]
pub extern "C" fn vg_group(site: u32) -> u32 {
    match site {
        0 | 1 => 1,
        2..=5 => 2,
        _ => 0,
    }
}

// 0 = all, 1 = coast, 2 = town/campus. Invalid inputs fail closed.
#[no_mangle]
pub extern "C" fn vg_visible(site: u32, filter: u32) -> u32 {
    if site >= COUNT || filter > 2 {
        return 0;
    }
    if filter == 0 || vg_group(site) == filter { 1 } else { 0 }
}

// 1 = closes at dusk, 2 = 8 a.m. to 6 p.m. and launch restrictions,
// 3 = campus parking permit, 4 = city park hours and launch access unknown.
// All values describe *cautions*, not evidence of an open venue.
#[no_mangle]
pub extern "C" fn vg_caution(site: u32) -> u32 {
    match site {
        0 => 1,
        1 => 2,
        2 => 3,
        3..=5 => 4,
        _ => 0,
    }
}

// Ranking is based ONLY on the existing expert-reviewed affinity scores.
// goal: 0 = family, 1 = photography, 2 = near coast.
// marine_concern: 0 = no specific concern supplied, 1 = user reports coastal
// fog concern. This is *not* a forecast and must never claim inland is clear.
// A score is for ordering options, not their safety, access, or visibility.
#[no_mangle]
pub extern "C" fn vg_rank(site: u32, goal: u32, marine_concern: u32) -> i32 {
    if site >= COUNT || goal > 2 || marine_concern > 1 {
        return -1;
    }
    let i = site as usize;
    let affinity = match goal {
        0 => FAMILY[i],
        1 => PHOTO[i],
        _ => CLOSE[i],
    };
    let coast_adjustment = if marine_concern == 1 && vg_group(site) == 1 {
        // Coast-side fog can be very localized. This penalizes the *planning*
        // choice; it is not a claim about sky conditions at any given site.
        35
    } else {
        0
    };
    affinity * 10 - site as i32 - coast_adjustment
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stable_inventory_and_filters() {
        assert_eq!(vg_engine_version(), 1);
        assert_eq!(vg_site_count(), 6);
        assert_eq!(vg_group(0), 1);
        assert_eq!(vg_group(1), 1);
        assert_eq!(vg_group(2), 2);
        assert_eq!(vg_group(5), 2);
        assert_eq!(vg_group(99), 0);
        assert_eq!(vg_visible(0, 1), 1);
        assert_eq!(vg_visible(2, 1), 0);
        assert_eq!(vg_visible(4, 2), 1);
        assert_eq!(vg_visible(99, 0), 0);
        assert_eq!(vg_visible(0, 99), 0);
    }

    #[test]
    fn priorities_change_rank_without_claiming_access() {
        assert!(vg_rank(3, 0, 0) > vg_rank(0, 0, 0)); // family: park
        assert!(vg_rank(2, 1, 0) > vg_rank(1, 1, 0)); // photo: college
        assert!(vg_rank(0, 2, 0) > vg_rank(2, 2, 0)); // coast: Ocean Park
        assert!(vg_rank(2, 2, 1) > vg_rank(0, 2, 1)); // fog concern: inland
        assert_eq!(vg_rank(99, 0, 0), -1);
        assert_eq!(vg_rank(0, 3, 0), -1);
        assert_eq!(vg_rank(0, 0, 2), -1);
    }

    #[test]
    fn public_access_is_never_assumed() {
        assert_eq!(vg_caution(0), 1);
        assert_eq!(vg_caution(1), 2);
        assert_eq!(vg_caution(2), 3);
        assert_eq!(vg_caution(5), 4);
        assert_eq!(vg_caution(99), 0);
    }
}
