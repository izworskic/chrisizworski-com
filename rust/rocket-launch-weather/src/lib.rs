//! Launch-day sky trend for Rocket Launch Live.
//!
//! One question: if the launch slips 1, 3 or 6 hours, does the forecast sky
//! at the viewing spots get worse, better, or stay about the same?
//!
//! Inputs are the NWS values the existing API already returns for each
//! spectator spot. Rust only compares a spot with ITSELF at the scheduled
//! time. It never predicts a delay, rocket visibility or flight-weather
//! clearance, and a missing value is never treated as a clear sky.
#![no_std]
#[cfg(not(test))]
use core::panic::PanicInfo;
#[cfg(not(test))]
#[panic_handler]
fn panic(_info:&PanicInfo)->!{loop{}}

/// Same threshold the API uses when it calls two cloud values meaningfully
/// different (lib/rocket-launch-slip.js and skyCompare in the national API).
pub const MEANINGFUL_POINTS:u32=20;

// Cloud wire value: 0..=100 percent total sky cover; anything above 100
// (the loader sends 255) means unknown. Hazard: 1 when the NWS surface
// assessment for that spot and hour is "poor" (rain, storms), else 0.

// Spot trend codes.
pub const UNKNOWN:u32=0;
pub const CLEARER:u32=1;
pub const CLOUDIER:u32=2;
pub const SAME:u32=3;

// Window codes add one state: the two spots disagree.
pub const SPLIT:u32=4;

#[no_mangle]
pub extern "C" fn lw_engine_version()->u32{1}

#[no_mangle]
pub extern "C" fn lw_meaningful_points()->u32{MEANINGFUL_POINTS}

fn known(cloud:u32)->bool{cloud<=100}

/// How one spot's sky changes from the scheduled time to a later time.
#[no_mangle]
pub extern "C" fn lw_spot_trend(
    scheduled:u32,later:u32,scheduled_hazard:u32,later_hazard:u32
)->u32{
    if scheduled_hazard>1||later_hazard>1{return UNKNOWN;}
    // Rain or storms arriving is a worse sky whatever the cloud number says.
    if later_hazard==1&&scheduled_hazard==0{return CLOUDIER;}
    if !known(scheduled)||!known(later){return UNKNOWN;}
    let up=later>=scheduled+MEANINGFUL_POINTS;
    let down=scheduled>=later+MEANINGFUL_POINTS;
    if scheduled_hazard==1&&later_hazard==0{
        // Hazards clearing helps unless the cloud deck thickens a lot.
        return if up{CLOUDIER}else{CLEARER};
    }
    if up{CLOUDIER}else if down{CLEARER}else{SAME}
}

/// Combine the two spots for one delay window.
#[no_mangle]
pub extern "C" fn lw_window_trend(a:u32,b:u32)->u32{
    if a==UNKNOWN||b==UNKNOWN||a>SAME||b>SAME{return UNKNOWN;}
    match (a,b){
        (CLOUDIER,CLOUDIER)=>CLOUDIER,
        (SAME,SAME)=>SAME,
        (CLOUDIER,_)|(_,CLOUDIER)=>SPLIT,
        _=>CLEARER, // at least one clearer, neither cloudier
    }
}

/// Overall answer across the +1, +3 and +6 hour windows. Unknown windows
/// are skipped; if none is known the answer is unknown. A window where both
/// spots turn cloudier outranks everything, because that is the case where
/// moving does not save the view.
#[no_mangle]
pub extern "C" fn lw_slip_verdict(w1:u32,w3:u32,w6:u32)->u32{
    let ws=[w1,w3,w6];
    if ws.iter().any(|w|*w>SPLIT){return UNKNOWN;}
    if ws.iter().all(|w|*w==UNKNOWN){return UNKNOWN;}
    for code in [CLOUDIER,SPLIT,CLEARER]{
        if ws.iter().any(|w|*w==code){return code;}
    }
    SAME
}

/// Earliest delay (1, 3 or 6 hours) whose window code equals `code`; 0 if none.
#[no_mangle]
pub extern "C" fn lw_first_window(w1:u32,w3:u32,w6:u32,code:u32)->u32{
    if code==UNKNOWN||code>SPLIT{return 0;}
    if w1==code{1}else if w3==code{3}else if w6==code{6}else{0}
}

#[cfg(test)]
mod tests{
    use super::*;
    const U:u32=255;

    #[test]
    fn spot_trend_uses_the_api_threshold(){
        assert_eq!(lw_spot_trend(12,31,0,0),SAME);
        assert_eq!(lw_spot_trend(12,32,0,0),CLOUDIER);
        assert_eq!(lw_spot_trend(32,12,0,0),CLEARER);
        assert_eq!(lw_spot_trend(31,12,0,0),SAME);
        assert_eq!(lw_spot_trend(0,100,0,0),CLOUDIER);
        assert_eq!(lw_meaningful_points(),20);
    }
    #[test]
    fn missing_values_are_never_clear_skies(){
        assert_eq!(lw_spot_trend(U,12,0,0),UNKNOWN);
        assert_eq!(lw_spot_trend(12,U,0,0),UNKNOWN);
        assert_eq!(lw_spot_trend(12,101,0,0),UNKNOWN);
        assert_eq!(lw_spot_trend(12,12,2,0),UNKNOWN);
    }
    #[test]
    fn hazards_change_the_answer(){
        assert_eq!(lw_spot_trend(12,12,0,1),CLOUDIER);
        assert_eq!(lw_spot_trend(12,U,0,1),CLOUDIER);
        assert_eq!(lw_spot_trend(60,50,1,0),CLEARER);
        assert_eq!(lw_spot_trend(40,60,1,0),CLOUDIER);
        assert_eq!(lw_spot_trend(40,U,1,0),UNKNOWN);
        assert_eq!(lw_spot_trend(40,45,1,1),SAME);
    }
    #[test]
    fn windows_combine_both_spots(){
        assert_eq!(lw_window_trend(CLOUDIER,CLOUDIER),CLOUDIER);
        assert_eq!(lw_window_trend(SAME,SAME),SAME);
        assert_eq!(lw_window_trend(CLOUDIER,SAME),SPLIT);
        assert_eq!(lw_window_trend(CLEARER,CLOUDIER),SPLIT);
        assert_eq!(lw_window_trend(CLEARER,SAME),CLEARER);
        assert_eq!(lw_window_trend(CLEARER,CLEARER),CLEARER);
        assert_eq!(lw_window_trend(UNKNOWN,SAME),UNKNOWN);
        assert_eq!(lw_window_trend(SPLIT,SAME),UNKNOWN);
    }
    #[test]
    fn verdict_puts_the_lost_view_first(){
        assert_eq!(lw_slip_verdict(SAME,SAME,SAME),SAME);
        assert_eq!(lw_slip_verdict(SAME,CLOUDIER,CLEARER),CLOUDIER);
        assert_eq!(lw_slip_verdict(CLEARER,SPLIT,SAME),SPLIT);
        assert_eq!(lw_slip_verdict(CLEARER,SAME,UNKNOWN),CLEARER);
        assert_eq!(lw_slip_verdict(UNKNOWN,UNKNOWN,SAME),SAME);
        assert_eq!(lw_slip_verdict(UNKNOWN,UNKNOWN,UNKNOWN),UNKNOWN);
        assert_eq!(lw_slip_verdict(9,SAME,SAME),UNKNOWN);
        assert_eq!(lw_first_window(SAME,CLOUDIER,CLOUDIER,CLOUDIER),3);
        assert_eq!(lw_first_window(SAME,SAME,SAME,CLOUDIER),0);
        assert_eq!(lw_first_window(SAME,SAME,SAME,UNKNOWN),0);
    }
}
