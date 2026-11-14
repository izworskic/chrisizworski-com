//! Shared, source-gated itinerary decision kernel. This is NOT a routing engine.
//! It never generates roads, drive times, parking, access permissions or coordinates.
//! Site-specific editorial approvals and copy remain in their existing source records.
#![no_std]
use core::panic::PanicInfo;
#[cfg(not(test))]
#[panic_handler]
fn panic(_info: &PanicInfo) -> ! { loop {} }

// Status: 0 reviewed; 1 seasonal; 2 restricted; 3 closed; 4 research.
// Arrival: 1 editorially verified public approach; other values are not approvals.
// A partial restriction is still a conditional destination, never "open now".
#[no_mangle]
pub extern "C" fn it_stop(status: u32, arrival: u32) -> u32 {
    u32::from(status <= 2 && arrival == 1)
}

// Geographic distance has already been published by the source-checked nearby
// inventory. This only applies an inclusive radius and an independent access veto.
// No waterfall coordinate may be interpreted as an arrival or road.
#[no_mangle]
pub extern "C" fn it_nearby(
    status: u32, arrival: u32, distance_miles: f64, radius_miles: f64
) -> u32 {
    u32::from(it_stop(status, arrival) == 1
        && distance_miles.is_finite()
        && radius_miles.is_finite()
        && distance_miles >= 0.0
        && (radius_miles == 10.0 || radius_miles == 25.0 || radius_miles == 50.0)
        && distance_miles <= radius_miles)
}

// Date: 0 invalid, 1 unspecified, 2 independently calendar-validated.
// Season policy: 0 advisory-only, 1 extended outing (requires date; winter hold),
// 2 park driving outing (undated allowed; Dec--Mar motor-vehicle hold).
// Caller supplies its independently validated calendar date, NOT a guessed date.
// 0 malformed policy; 1 candidate; 2 invalid date; 3 date required;
// 4 precautionary winter hold; 5 six-stop limit; 6 unverified source stop.
#[no_mangle]
pub extern "C" fn it_plan(
    saved: u32, missing: u32, all_stops_verified: u32,
    date_state: u32, month: u32, season_policy: u32
) -> u32 {
    if season_policy > 2 || date_state > 2 ||
        all_stops_verified > 1 ||
        (date_state == 2 && !(1..=12).contains(&month)) ||
        (date_state != 2 && month != 0) { return 0; }
    if date_state == 0 { return 2; }
    if season_policy == 1 && date_state != 2 { return 3; }
    if date_state == 2 && month <= 3 || date_state == 2 && month == 12 {
        if season_policy != 0 { return 4; }
    }
    if saved > 6 || missing > 6 || saved.saturating_add(missing) > 6 { return 5; }
    if all_stops_verified != 1 { return 6; }
    1
}

// Day sheets distinguish geographic research from a drivable itinerary.
// 0 empty/invalid; 1 source-linked checklist for one region;
// 2 cross-region research checklist. Never returns verified route status.
// Sites with several named falls and ONE park arrival keep that editorial
// distinction in source data; it is not represented as multiple drives here.
#[no_mangle]
pub extern "C" fn it_sheet(saved: u32, region_count: u32) -> u32 {
    if saved == 0 || saved > 6 || region_count == 0 || region_count > saved { return 0; }
    if region_count > 1 { 2 } else { 1 }
}

#[no_mangle]
pub extern "C" fn it_version() -> u32 { 1 }

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn status_and_approach_are_both_required() {
        for status in 0..=2 { assert_eq!(it_stop(status, 1), 1); }
        for status in [3,4,5,99] { assert_eq!(it_stop(status, 1), 0); }
        for arrival in [0,2,99] { assert_eq!(it_stop(0, arrival), 0); }
    }

    #[test]
    fn nearby_is_geographic_not_driving_or_a_new_access_grant() {
        assert_eq!(it_nearby(0,1,10.0,10.0),1);
        assert_eq!(it_nearby(1,1,24.9,25.0),1);
        assert_eq!(it_nearby(2,1,50.0,50.0),1);
        for d in [-1.0, f64::NAN, f64::INFINITY, 50.01] {
            assert_eq!(it_nearby(0,1,d,50.0),0);
        }
        assert_eq!(it_nearby(3,1,1.0,50.0),0);
        assert_eq!(it_nearby(4,1,1.0,50.0),0);
        assert_eq!(it_nearby(0,0,1.0,50.0),0);
        assert_eq!(it_nearby(0,1,5.0,15.0),0);
    }

    #[test]
    fn season_mode_never_promotes_winter_or_unknown_date() {
        assert_eq!(it_plan(0,3,1,1,0,1),3);
        assert_eq!(it_plan(0,3,1,2,12,1),4);
        assert_eq!(it_plan(0,3,1,2,3,2),4);
        assert_eq!(it_plan(0,3,1,1,0,2),1);
        assert_eq!(it_plan(0,2,1,2,12,0),1); // single/park lookout with editorial advisory
        assert_eq!(it_plan(0,3,1,2,4,1),1);
        assert_eq!(it_plan(0,3,1,0,0,0),2);
        assert_eq!(it_plan(0,3,1,2,13,0),0);
    }

    #[test]
    fn atomic_six_stop_and_missing_source_veto() {
        assert_eq!(it_plan(4,2,1,2,6,1),1);
        assert_eq!(it_plan(4,3,1,2,6,1),5);
        assert_eq!(it_plan(u32::MAX,1,1,2,6,0),5);
        assert_eq!(it_plan(0,3,0,2,6,0),6);
        assert_eq!(it_plan(0,3,2,2,6,0),0);
        assert_eq!(it_plan(0,3,1,1,0,99),0);
        assert_eq!(it_sheet(0,0),0);
        assert_eq!(it_sheet(3,1),1);
        assert_eq!(it_sheet(3,2),2);
        assert_eq!(it_sheet(7,2),0);
        assert_eq!(it_version(),1);
    }
}
