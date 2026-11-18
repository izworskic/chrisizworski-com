//! Deterministic Rideau source-distance and trip-policy kernel.
//! This is a reference implementation for cross-language quality gates, NOT navigation.
//! No routing geometry, live access permissions or calculated arrival times.
#![no_std]

/// 0 mainline; 1 Tay Canal; others are unsupported.
pub fn channel_distance_dm(from_branch: u32, from_dm: u32, to_branch: u32, to_dm: u32, junction_main_dm: u32) -> Option<u32> {
    const MAIN_END: u32 = 2021;
    const TAY_END: u32 = 100;
    if from_branch > 1 || to_branch > 1 || junction_main_dm > MAIN_END { return None; }
    if from_branch == 0 && from_dm > MAIN_END || to_branch == 0 && to_dm > MAIN_END ||
       from_branch == 1 && from_dm > TAY_END || to_branch == 1 && to_dm > TAY_END { return None; }
    if from_branch == to_branch { return Some(from_dm.abs_diff(to_dm)); }
    let main = if from_branch == 0 { from_dm } else { to_dm };
    let tay = if from_branch == 1 { from_dm } else { to_dm };
    main.abs_diff(junction_main_dm).checked_add(tay)
}

/// 0 invalid, 1 channel reference only, 2 estimated branch join.
#[no_mangle]
pub extern "C" fn rd_route_kind(from_branch: u32, from_dm: u32, to_branch: u32, to_dm: u32) -> u32 {
    if from_branch == to_branch && from_dm == to_dm { return 0; }
    match channel_distance_dm(from_branch,from_dm,to_branch,to_dm,1104) {
        None => 0,
        Some(_) if from_branch != to_branch => 2,
        Some(_) => 1
    }
}
/// Distance in 0.1 km. Negative means invalid, never a navigation guarantee.
#[no_mangle]
pub extern "C" fn rd_distance_dm(from_branch: u32, from_dm: u32, to_branch: u32, to_dm: u32) -> i32 {
    if from_branch == to_branch && from_dm == to_dm { return -1; }
    match channel_distance_dm(from_branch,from_dm,to_branch,to_dm,1104) {
        Some(d) => d as i32,
        None => -1
    }
}
/// 0 unsupported speed, else underway minutes rounded up.
/// Excludes every lock, bridge, waiting period and weather delay.
#[no_mangle]
pub extern "C" fn rd_underway_minutes(distance_dm: u32, speed_kmh: u32) -> u32 {
    if speed_kmh != 4 && speed_kmh != 6 && speed_kmh != 8 { return 0; }
    let numerator = (distance_dm as u64).saturating_mul(6);
    ((numerator + speed_kmh as u64 - 1)/(speed_kmh as u64)) as u32
}

/// A proposed number never becomes passage authorization; always require official sources.
#[no_mangle]
pub extern "C" fn rd_clearance_approved(_dimensions_fit_general_reference: u32, _historical_hours: u32) -> u32 {0}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn main_chainage() { assert_eq!(rd_distance_dm(0,0,0,1590),1590);assert_eq!(rd_distance_dm(0,1590,0,738),852); }
    #[test] fn tay_chainage() { assert_eq!(rd_distance_dm(1,3,1,100),97);assert_eq!(rd_distance_dm(1,100,1,3),97); }
    #[test] fn branch_reconciled_as_estimate() { assert_eq!(rd_route_kind(0,0,1,100),2);assert_eq!(rd_distance_dm(0,0,1,100),1204); }
    #[test] fn invalid_inputs_fail_closed() { assert_eq!(rd_distance_dm(2,0,0,5),-1);assert_eq!(rd_distance_dm(0,2022,1,5),-1);assert_eq!(rd_route_kind(0,5,0,5),0); }
    #[test] fn underway_not_lockage() { assert_eq!(rd_underway_minutes(120,6),120);assert_eq!(rd_underway_minutes(100,7),0);assert_eq!(rd_clearance_approved(1,1),0); }
}
