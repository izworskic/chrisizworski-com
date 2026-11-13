//! Range-land and shoreline public-access classification, not access approval.
//! Kodiak and Pacific Missile Range Facility, Kauaʻi. No source fetching.
//! Static source-of-truth venue identities live in existing reviewed JSON.
//! A flight schedule, mapped feature or recreation policy cannot authorize
//! launch viewing, road travel, military entry or maritime zone transit.
#![no_std]
use core::panic::PanicInfo;
#[cfg(not(test))]
#[panic_handler]
fn panic(_:&PanicInfo)->!{loop{}}

// Public ABI region 1 = Kodiak / Alaska; region 2 = PMRF / Hawaiʻi.
// Kodiak places[0]: Pasagshak park reference, places[1]: restricted range.
// PMRF atlas points[0]: restricted range, points[1]: state park reference.
// 0 invalid, 1 recreation-reference, 2 restricted range, 3 park reference.
#[no_mangle]
pub extern "C" fn ra_version()->u32{1}
#[no_mangle]
pub extern "C" fn ra_region_count()->u32{2}
#[no_mangle]
pub extern "C" fn ra_place_count(region:u32)->u32{
    match region{1|2=>2,_=>0}
}
#[no_mangle]
pub extern "C" fn ra_place_class(region:u32,site:u32)->u32{
    match (region,site){
        (1,0)=>1,
        (1,1)|(2,0)=>2,
        (2,1)=>3,
        _=>0,
    }
}

// PMRF visitor intent: 0 walk, 1 MWR guest recreation, 2 boat.
// Evidence=1 only for agency feed statuses that actually confirm that
// the *general recreation policy* was retrieved. This is never live entry.
// 0 official status unknown / archived / failed / incorrect,
// 1 designated walk-in beach recreation policy on file, launch unverified,
// 2 guest card recreation policy on file, launch unverified,
// 3 current maritime notice required, no live safety-zone confirmation.
#[no_mangle]
pub extern "C" fn ra_mode_state(mode:u32,source_policy:u32)->u32{
    match (mode,source_policy){
        (0,1)=>1,
        (1,1)=>2,
        (2,0)|(2,1)=>3,
        (0,0)|(1,0)=>0,
        _=>0,
    }
}

// DLNR evidence 1 means agency reports published closure, but does not prove
// reopening or establish the physical gate state. 0 = unverified.
#[no_mangle]
pub extern "C" fn ra_state_park_closure(agency_status:u32)->u32{
    if agency_status==1{1}else{0}
}

// IMPORTANT: not even a valid recreation policy or an official calendar
// provides authorization to watch a rocket. Only a land manager can.
#[no_mangle]
pub extern "C" fn ra_launch_viewing_authorized(_region:u32)->u32{0}

#[cfg(test)]
mod tests{
    use super::*;
    #[test]
    fn reviewed_geographic_references_are_not_public_launch_venues(){
        assert_eq!(ra_version(),1);
        assert_eq!(ra_region_count(),2);
        assert_eq!(ra_place_count(1),2);
        assert_eq!(ra_place_count(2),2);
        assert_eq!(ra_place_count(3),0);
        assert_eq!(ra_place_class(1,0),1);
        assert_eq!(ra_place_class(1,1),2);
        assert_eq!(ra_place_class(2,0),2);
        assert_eq!(ra_place_class(2,1),3);
        assert_eq!(ra_place_class(2,3),0);
    }
    #[test]
    fn different_approaches_have_different_evidence_but_no_launch_access(){
        assert_eq!(ra_mode_state(0,1),1);
        assert_eq!(ra_mode_state(1,1),2);
        assert_eq!(ra_mode_state(2,0),3);
        assert_eq!(ra_mode_state(2,1),3);
        assert_eq!(ra_mode_state(0,0),0);
        assert_eq!(ra_mode_state(1,0),0);
        assert_eq!(ra_mode_state(1,2),0);
        assert_eq!(ra_mode_state(99,1),0);
        assert_eq!(ra_state_park_closure(1),1);
        assert_eq!(ra_state_park_closure(0),0);
        assert_eq!(ra_state_park_closure(99),0);
        for region in 0..4{
            assert_eq!(ra_launch_viewing_authorized(region),0);
        }
    }
}
