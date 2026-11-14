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


// Lake Superior Circle Tour: SAME shared core, distinct contract from waterfall
// shortlists. 31 named itinerary stops, including separate Duluth endpoints.
// This is a published-planning topology; it is not a road graph or permission.
const CIRCLE: [u32; 31] = [
    1,2,3,4,5,6,7,8,9,10,11,12,31,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30
];
fn ct_position(id: u32) -> Option<usize> {
    CIRCLE.iter().position(|&candidate| candidate == id)
}
#[no_mangle]
pub extern "C" fn ct_version() -> u32 { 1 }

// Direction: 0 counterclockwise, 1 clockwise. Evidence 1 means the existing
// published distance from a source-reviewed stop card; none other is trusted.
// Zero between numbered Duluth endpoints 1/30 is an *identity transition*,
// not a claimed road length. Missing partial-source miles cannot be filled.
#[no_mangle]
pub extern "C" fn ct_leg(from: u32, to: u32, direction: u32, miles: f64, evidence: u32) -> u32 {
    if direction > 1 || evidence != 1 || !miles.is_finite() { return 0; }
    let i = match ct_position(from) { Some(i) => i, None => return 0 };
    let j = match ct_position(to) { Some(j) => j, None => return 0 };
    let expected = if direction == 0 {(i + 1) % CIRCLE.len()}
        else {(i + CIRCLE.len() - 1) % CIRCLE.len()};
    if j != expected {return 0;}
    if (from == 1 && to == 30) || (from == 30 && to == 1) {
        return u32::from(miles == 0.0);
    }
    u32::from(miles > 0.0 && miles <= 600.0)
}

// Published day mileage can skip optional numbered stops, so it is deliberately
// NOT an edge length. It must still have known endpoints and an integer,
// nonnegative, bounded editorial daily estimate. Stay days require one stop.
#[no_mangle]
pub extern "C" fn ct_published_day(first: u32, last: u32, miles: f64, stop_count: u32) -> u32 {
    if ct_position(first).is_none() || ct_position(last).is_none() ||
        stop_count == 0 || stop_count > 31 || !miles.is_finite() ||
        miles < 0.0 || miles > 600.0 || miles.fract() != 0.0 {return 0;}
    if miles == 0.0 {return u32::from(first == last && stop_count == 1);}
    u32::from(first != last && stop_count > 1)
}

// 45 minutes is the existing UNVERIFIED fallback for a border with no
// usable current standard passenger wait. Do not turn unavailable into zero.
// Known values are source-fed and not inferred by Rust.
#[no_mangle]
pub extern "C" fn ct_border(available: u32, wait_minutes: f64, allowance_minutes: f64) -> u32 {
    if available > 1 || !allowance_minutes.is_finite() ||
        allowance_minutes < 0.0 || allowance_minutes > 360.0 {return 0;}
    if available == 0 {return u32::from(allowance_minutes == 45.0);}
    u32::from(wait_minutes.is_finite() && wait_minutes >= 0.0 &&
        wait_minutes <= 360.0 && allowance_minutes == wait_minutes)
}

// Verify a conservative PLANNING allowance only. This is not a traffic ETA.
// Stay-day zero and 47 mph * 1.2 are the original editorial assumptions.
#[no_mangle]
pub extern "C" fn ct_drive(miles: f64, hours: f64, stay_day: u32) -> u32 {
    if stay_day > 1 || !miles.is_finite() || !hours.is_finite() ||
        miles < 0.0 || hours < 0.0 || miles > 10000.0 || hours > 500.0 {return 0;}
    if stay_day == 1 {return u32::from(miles == 0.0 && hours == 0.0);}
    let expected = miles / 47.0 * 1.2;
    // A zero-mile endpoint transition is allowed only when ct_leg already proved
    // the two distinct Duluth identifiers refer to the same place.
    u32::from((hours - expected).abs() <= 0.000_001)
}

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
    #[test]
    fn circle_direction_and_31_stop_topology() {
        for i in 0..CIRCLE.len() {
            let from=CIRCLE[i];
            let next=CIRCLE[(i+1)%CIRCLE.len()];
            let previous=CIRCLE[(i+CIRCLE.len()-1)%CIRCLE.len()];
            let miles=if (from==30&&next==1)||(from==1&&next==30){0.0}else{43.0};
            assert_eq!(ct_leg(from,next,0,miles,1),1);
            let miles_back=if (from==1&&previous==30)||(from==30&&previous==1){0.0}else{43.0};
            assert_eq!(ct_leg(from,previous,1,miles_back,1),1);
        }
        assert_eq!(ct_leg(5,6,0,43.0,1),1);
        assert_eq!(ct_leg(6,5,1,43.0,1),1);
        assert_eq!(ct_leg(5,7,0,43.0,1),0);
        assert_eq!(ct_leg(5,6,1,43.0,1),0);
        assert_eq!(ct_leg(30,1,0,1.0,1),0);
        assert_eq!(ct_leg(30,1,0,0.0,1),1);
        assert_eq!(ct_leg(12,31,0,11.0,0),0); // partial spur evidence
        assert_eq!(ct_leg(13,14,0,0.0,1),0);
        assert_eq!(ct_leg(13,14,0,f64::NAN,1),0);
        assert_eq!(ct_leg(1,99,0,10.0,1),0);
    }

    #[test]
    fn circle_published_days_keep_stay_days_and_source_uncertainty() {
        assert_eq!(ct_published_day(1,3,87.0,3),1);
        assert_eq!(ct_published_day(1,1,0.0,1),1);
        assert_eq!(ct_published_day(3,3,0.0,1),1);
        assert_eq!(ct_published_day(1,30,0.0,2),0);
        assert_eq!(ct_published_day(1,3,0.0,3),0);
        assert_eq!(ct_published_day(1,1,25.0,1),0);
        assert_eq!(ct_published_day(1,3,87.5,3),0);
        assert_eq!(ct_published_day(1,3,f64::NAN,3),0);
        assert_eq!(ct_published_day(1,3,601.0,3),0);
    }

    #[test]
    fn circle_border_wait_and_drive_guard() {
        assert_eq!(ct_border(0,f64::NAN,45.0),1);
        assert_eq!(ct_border(0,0.0,0.0),0);
        assert_eq!(ct_border(1,14.0,14.0),1);
        assert_eq!(ct_border(1,14.0,45.0),0);
        assert_eq!(ct_border(1,14.0,f64::NAN),0);
        assert_eq!(ct_drive(47.0,1.2,0),1);
        assert_eq!(ct_drive(0.0,0.0,1),1);
        assert_eq!(ct_drive(0.0,0.0,0),1);
        assert_eq!(ct_drive(47.0,1.0,0),0);
        assert_eq!(ct_drive(f64::INFINITY,1.2,0),0);
        assert_eq!(ct_version(),1);
    }

}
