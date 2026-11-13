//! Michigan DNR snowmobile trail shortest-path engine (ABI v1).
//! Consumes ONLY the already legally-filtered official DNR graph supplied by
//! lib/snowmobile/routing.mjs. No snow, grooming, trail-opening or access
//! inference happens in Rust. Coordinates and measured distances stay in JS.
//! Output: ordered edge indices, with bit 31 set when traversed in reverse.

use std::cmp::Ordering;
use std::collections::BinaryHeap;

const MAX_NODES: usize = 4096;
const MAX_EDGES: usize = 16384;
const REVERSE_BIT: u32 = 0x8000_0000;

#[repr(C)]
#[derive(Clone, Copy)]
pub struct Edge {
    from: u32,
    to: u32,
    miles: f64,
}

// ABI is a 16-byte record: u32 from, u32 to, f64 miles. Host must write
// little-endian values, after checking memory bounds and the ABI version.
// All input/output storage lives in WASM memory; the host never supplies a
// pointer to JavaScript-owned memory. Single-threaded synchronous calls only.
static mut INPUT: [Edge; MAX_EDGES] = [Edge { from: 0, to: 0, miles: 0.0 }; MAX_EDGES];
static mut OUTPUT: [u32; MAX_NODES] = [0; MAX_NODES];

#[no_mangle]
pub extern "C" fn sm_abi_version() -> u32 { 1 }
#[no_mangle]
pub extern "C" fn sm_max_nodes() -> u32 { MAX_NODES as u32 }
#[no_mangle]
pub extern "C" fn sm_max_edges() -> u32 { MAX_EDGES as u32 }
#[no_mangle]
pub extern "C" fn sm_edge_stride() -> u32 { std::mem::size_of::<Edge>() as u32 }
#[no_mangle]
pub extern "C" fn sm_edges_ptr() -> u32 { std::ptr::addr_of_mut!(INPUT).cast::<Edge>() as u32 }
#[no_mangle]
pub extern "C" fn sm_path_ptr() -> u32 { std::ptr::addr_of_mut!(OUTPUT).cast::<u32>() as u32 }

#[derive(Clone, Copy, Debug)]
struct Candidate { distance: f64, node: usize, serial: usize }
impl PartialEq for Candidate {
    fn eq(&self, other: &Self) -> bool {
        self.distance == other.distance && self.node == other.node && self.serial == other.serial
    }
}
impl Eq for Candidate {}
impl PartialOrd for Candidate {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> { Some(self.cmp(other)) }
}
impl Ord for Candidate {
    fn cmp(&self, other: &Self) -> Ordering {
        // BinaryHeap is a max heap: reverse cost, then preserve first-discovered
        // order on exact ties for deterministic route selection.
        other.distance.total_cmp(&self.distance)
            .then_with(|| other.serial.cmp(&self.serial))
            .then_with(|| other.node.cmp(&self.node))
    }
}

/// Solve a nonnegative undirected graph.
///
/// Return values: >= 0 edge count; -1 disconnected; -2 malformed input.
/// The caller MUST reject unexpected return values and validate the returned
/// path against the legally-filtered graph before rendering any geometry.
#[no_mangle]
pub extern "C" fn sm_solve(node_count: i32, edge_count: i32, start: i32, goal: i32) -> i32 {
    if node_count <= 0 || node_count as usize > MAX_NODES
        || edge_count < 0 || edge_count as usize > MAX_EDGES
        || start < 0 || goal < 0 || start >= node_count || goal >= node_count {
        return -2;
    }
    if start == goal { return 0; }
    let n = node_count as usize;
    let m = edge_count as usize;
    let mut adjacency = vec![Vec::<(usize, f64, u32)>::new(); n];
    for i in 0..m {
        let edge = unsafe { *std::ptr::addr_of!(INPUT).cast::<Edge>().add(i) };
        if edge.from as usize >= n || edge.to as usize >= n
            || !edge.miles.is_finite() || edge.miles < 0.0 { return -2; }
        adjacency[edge.from as usize].push((edge.to as usize, edge.miles, i as u32));
        adjacency[edge.to as usize].push((edge.from as usize, edge.miles, (i as u32) | REVERSE_BIT));
    }

    let mut distance = vec![f64::INFINITY; n];
    let mut previous = vec![None::<(usize, u32)>; n];
    let mut heap = BinaryHeap::new();
    let mut serial: usize = 0;
    distance[start as usize] = 0.0;
    heap.push(Candidate { distance: 0.0, node: start as usize, serial });
    while let Some(current) = heap.pop() {
        if current.distance > distance[current.node] { continue; }
        if current.node == goal as usize { break; }
        for &(next, weight, edge_code) in &adjacency[current.node] {
            let alternative = current.distance + weight;
            if alternative < distance[next] {
                distance[next] = alternative;
                previous[next] = Some((current.node, edge_code));
                serial += 1;
                heap.push(Candidate { distance: alternative, node: next, serial });
            }
        }
    }
    if !distance[goal as usize].is_finite() { return -1; }

    let mut reversed = Vec::<u32>::new();
    let mut current = goal as usize;
    while current != start as usize {
        if reversed.len() >= n { return -2; } // never emit a partial/cyclic path
        let Some((parent, edge_code)) = previous[current] else { return -2; };
        reversed.push(edge_code);
        current = parent;
    }
    reversed.reverse();
    for (i, code) in reversed.iter().enumerate() {
        unsafe { *std::ptr::addr_of_mut!(OUTPUT).cast::<u32>().add(i) = *code; }
    }
    reversed.len() as i32
}

#[cfg(test)]
mod tests {
    use super::*;
    fn edge(i: usize, from: u32, to: u32, miles: f64) {
        unsafe { *std::ptr::addr_of_mut!(INPUT).cast::<Edge>().add(i) = Edge { from, to, miles }; }
    }
    fn result(n: usize) -> Vec<u32> {
        (0..n).map(|i| unsafe { *std::ptr::addr_of!(OUTPUT).cast::<u32>().add(i) }).collect()
    }
    #[test]
    fn abi_is_stable() {
        assert_eq!(sm_abi_version(), 1);
        assert_eq!(sm_edge_stride(), 16);
        assert_eq!(sm_max_nodes(), 4096);
        assert_eq!(sm_max_edges(), 16384);
    }
    #[test]
    fn chooses_short_path_and_keeps_edge_order() {
        edge(0, 0, 1, 1.0);
        edge(1, 1, 2, 1.0);
        edge(2, 0, 2, 9.0);
        assert_eq!(sm_solve(3, 3, 0, 2), 2);
        assert_eq!(result(2), vec![0, 1]);
        assert_eq!(sm_solve(3, 3, 2, 0), 2);
        assert_eq!(result(2), vec![REVERSE_BIT | 1, REVERSE_BIT | 0]);
    }
    #[test]
    fn disconnected_and_invalid_input_fail_closed() {
        edge(0, 0, 1, 1.0);
        assert_eq!(sm_solve(3, 1, 0, 2), -1);
        assert_eq!(sm_solve(0, 1, 0, 0), -2);
        edge(0, 0, 1, -1.0);
        assert_eq!(sm_solve(2, 1, 0, 1), -2);
        edge(0, 0, 1, f64::NAN);
        assert_eq!(sm_solve(2, 1, 0, 1), -2);
    }
}
