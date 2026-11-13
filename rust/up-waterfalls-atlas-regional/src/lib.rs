//! Source-safe atlas/map and regional waterfall day-planning decisions.
//! Compiled to real WebAssembly. All factual source records and visitor copy
//! remain outside Rust; no GPS, parking, access approvals, roads or routes emitted.
#![no_std]
use core::panic::PanicInfo;
#[cfg(not(test))]
#[panic_handler]
fn panic(_info:&PanicInfo)->!{loop{}}

// Kind: 1 curated guide, 2 state GIS, 3 independent name, 4 tourism listing.
// Map role: 1 named natural-feature guide, 2 GIS natural-feature,
// 3 multi-falls day-use umbrella, 4 unmapped name/tourism observation.
// Coordinate state: 0 absent, 1 valid numeric pair, 2 partial/invalid.
// Priority = land-manager investigation, which MUST be tourism/unmapped.
#[no_mangle]
pub extern "C" fn wa_record_safe(kind:u32,role:u32,coordinates:u32,priority:u32)->u32{
    if priority>1 {return 0;}
    if priority==1 && kind!=4 {return 0;}
    match (kind,role,coordinates){
        (1,1,1)|(1,3,0)|(2,2,1)|(3,4,0)|(4,4,0)=>1,
        _=>0
    }
}

// The atlas is not a vehicle map. Never plot an unsupported identity.
// For the "All sources" view, the source GIS feature supersedes a duplicated
// curated waterfall coordinate only when its exact GIS id is visible.
// A guide-only view may show its feature instead. Both remain research points.
#[no_mangle]
pub extern "C" fn wa_plot(kind:u32,role:u32,coordinates:u32,shadowed:u32,guide_only:u32)->u32{
    if shadowed>1||guide_only>1{return 0;}
    if wa_record_safe(kind,role,coordinates,0)!=1 {return 0;}
    match kind {
        2=>1,
        1 if role==1 && (guide_only==1||shadowed==0)=>1,
        _=>0
    }
}

// Status: 0 publishable route with current status UNKNOWN,
// 1 seasonal, 2 partial restriction, 3 closed, 4 research.
// Restricted cluster stops are allowed in the explicitly conditional Black
// River research plan only. Still no live opening claim.
// Unknown input is NEVER promoted.
#[no_mangle]
pub extern "C" fn wa_stop(status:u32,arrival:u32,construction:u32,preset:u32)->u32{
    u32::from(status<=2 && arrival==1 && construction<=1 &&
        (construction==0||preset==4) && (1..=4).contains(&preset))
}

// Preset 1 Keweenaw parks, 2 Keweenaw gorge, 3 Black River one-stop,
// 4 construction-affected Black River corridor research.
// Date state 0 invalid, 1 unspecified, 2 calendar-verified.
// Output 1 allowed only for source-verified, nonwinter and six-stop safe cases.
// This is an ADD-TO-SHEET gate, not a trip, parking or route authorization.
// 0 unknown preset, 1 candidate, 2 invalid date, 3 date required,
// 4 winter extended-plan hold, 5 too many stops, 6 source record withheld.
#[no_mangle]
pub extern "C" fn wa_plan(
    preset:u32,date_state:u32,month:u32,selected_count:u32,missing_count:u32,all_stops_valid:u32
)->u32{
    if !(1..=4).contains(&preset){return 0;}
    if date_state>2||date_state==2&&!(1..=12).contains(&month){return 2;}
    if date_state==0{return 2;}
    let extended=preset==2||preset==4;
    if extended && date_state!=2 {return 3;}
    if extended && (month==12||month<=3){return 4;}
    if selected_count>6||missing_count>6||selected_count+missing_count>6 {return 5;}
    if all_stops_valid!=1 {return 6;}
    1
}
#[no_mangle]
pub extern "C" fn wa_version()->u32 {3}

#[cfg(test)]
mod tests{
use super::*;
#[test]
fn exactly_four_source_families_and_umbrella_avoids_parking(){
    for (kind,role,coord) in [(1,1,1),(1,3,0),(2,2,1),(3,4,0),(4,4,0)]{
        assert_eq!(wa_record_safe(kind,role,coord,0),1);
    }
    assert_eq!(wa_record_safe(4,4,0,1),1);
    for (kind,role,coord) in [(1,3,1),(2,2,0),(3,4,1),(4,4,1),(1,4,0),(5,4,0)]{
        assert_eq!(wa_record_safe(kind,role,coord,0),0);
        assert_eq!(wa_plot(kind,role,coord,0,0),0);
    }
    assert_eq!(wa_record_safe(1,1,1,1),0);
    assert_eq!(wa_plot(2,2,1,0,0),1);
    assert_eq!(wa_plot(1,1,1,0,0),1);
    assert_eq!(wa_plot(1,1,1,1,0),0);
    assert_eq!(wa_plot(1,1,1,1,1),1);
    assert_eq!(wa_plot(1,3,0,0,1),0);
    assert_eq!(wa_plot(3,4,0,0,1),0);
}
#[test]
fn regional_seasonal_restrictions_and_missing_cards_fail_closed(){
    assert_eq!(wa_stop(0,1,0,1),1);
    assert_eq!(wa_stop(2,1,1,4),1);
    assert_eq!(wa_stop(2,1,1,2),0);
    assert_eq!(wa_stop(3,1,0,4),0);
    assert_eq!(wa_stop(4,1,0,4),0);
    assert_eq!(wa_stop(0,0,0,4),0);
    assert_eq!(wa_stop(99,1,0,4),0);
    assert_eq!(wa_plan(4,1,0,0,4,1),3);
    assert_eq!(wa_plan(2,2,12,0,3,1),4);
    assert_eq!(wa_plan(4,2,3,0,4,1),4);
    assert_eq!(wa_plan(4,2,5,3,4,1),5);
    assert_eq!(wa_plan(4,2,5,0,4,0),6);
    assert_eq!(wa_plan(4,2,5,0,4,1),1);
    assert_eq!(wa_plan(1,1,0,0,2,1),1);
    assert_eq!(wa_plan(99,2,5,0,2,1),0);
    assert_eq!(wa_plan(4,0,0,0,4,1),2);
    assert_eq!(wa_plan(4,2,13,0,4,1),2);
    assert_eq!(wa_version(),3);
}
}
