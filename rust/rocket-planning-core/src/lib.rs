//! Rust planning decisions for the U.S. launch roster and Florida NPS
//! inbound-cutoff reference. Authoritative source data stays in existing APIs.
//! All statuses are planning classifications, NEVER permission to enter.
#![no_std]
use core::panic::PanicInfo;
#[cfg(not(test))]
#[panic_handler]
fn panic(_info:&PanicInfo)->!{loop{}}

// Wire protocol precision: 1 minute, 2 second, 3 hour, 4 day,
// 5 coarse year/month/TBD; 0 invalid or unknown.
#[no_mangle]
pub extern "C" fn rp_engine_version()->u32{1}

#[no_mangle]
pub extern "C" fn rp_time_precise(precision:u32)->u32{
    if precision==1||precision==2 {1} else {0}
}

// The national 'Next 10 days' UI presents only published target times with
// the same established inclusive bounds: from 60 seconds ago through 10 days.
// window: 0 all dates, 1 next ten days. A missing time cannot pass a bound.
#[no_mangle]
pub extern "C" fn rp_national_window(window:u32, precision:u32, delta_ms:f64)->u32{
    if window==0{return 1;}
    if window!=1||precision<1||precision>4||!delta_ms.is_finite(){return 0;}
    if delta_ms>=-60_000.0&&delta_ms<=864_000_000.0 {1}else{0}
}

// Florida receives *the existing server's* estimatedRoadRestrictionAt. Rust
// only classifies how close it is to that estimated inbound cutoff. Never
// infer whether a beach/lot is open or whether the launch will proceed.
// 0=unknown evidence, 1=more than one hour to cutoff, 2=within one hour,
// 3=target cutoff already passed. A missing/dated source remains unknown.
// source_fresh is 1 only when the national schedule is not marked stale.
// cutoff_reported is 1 only if the established Florida source supplies it.
#[no_mangle]
pub extern "C" fn rp_florida_cutoff_state(
    precision:u32,source_fresh:u32,cutoff_reported:u32,
    delta_ms:f64
)->u32{
    if rp_time_precise(precision)==0||source_fresh!=1||
       cutoff_reported!=1||!delta_ms.is_finite(){return 0;}
    if delta_ms<0.0{3}
    else if delta_ms<=3_600_000.0{2}
    else{1}
}

// A rank, calendar or policy-reference calculation cannot authorize a park.
#[no_mangle]
pub extern "C" fn rp_access_verified()->u32{0}

#[cfg(test)]
mod tests{
    use super::*;

    #[test]
    fn ten_day_filter_matches_existing_window(){
        for p in 1..=4{
            assert_eq!(rp_national_window(1,p,-60_000.0),1);
            assert_eq!(rp_national_window(1,p,864_000_000.0),1);
            assert_eq!(rp_national_window(1,p,-60_001.0),0);
            assert_eq!(rp_national_window(1,p,864_000_001.0),0);
        }
        assert_eq!(rp_national_window(1,5,1000.0),0);
        assert_eq!(rp_national_window(1,0,f64::NAN),0);
        assert_eq!(rp_national_window(1,2,f64::INFINITY),0);
        assert_eq!(rp_national_window(7,2,0.0),0);
        assert_eq!(rp_national_window(0,5,f64::NAN),1);
    }
    #[test]
    fn cutoff_is_a_reference_not_an_opening(){
        assert_eq!(rp_florida_cutoff_state(1,1,1,3_600_001.0),1);
        assert_eq!(rp_florida_cutoff_state(2,1,1,3_600_000.0),2);
        assert_eq!(rp_florida_cutoff_state(1,1,1,0.0),2);
        assert_eq!(rp_florida_cutoff_state(1,1,1,-1.0),3);
        assert_eq!(rp_florida_cutoff_state(3,1,1,1000.0),0);
        assert_eq!(rp_florida_cutoff_state(1,0,1,1000.0),0);
        assert_eq!(rp_florida_cutoff_state(1,1,0,1000.0),0);
        assert_eq!(rp_florida_cutoff_state(1,1,1,f64::NAN),0);
        assert_eq!(rp_access_verified(),0);
    }
}
