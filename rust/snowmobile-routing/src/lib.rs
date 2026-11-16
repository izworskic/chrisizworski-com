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

// ---------------------------------------------------------------------------
// Loop finder (loop ABI v1). Additive: sm_solve and its ABI are unchanged.
//
// Proposes closed rides that start and finish at one junction and come close
// to a requested mileage. Like sm_solve it sees ONLY the legally-filtered
// official DNR graph and returns edge indices; the host recomputes every
// distance and rejects any walk it cannot prove against that graph.
//
// Candidates, all built from shortest paths inside the start's component:
//   F: every edge (u, v) off the start's shortest-path tree closes one
//      circuit: start -> u, the edge, v -> start.
//   P: every junction pair (A, B): start -> A, A -> B, B -> start. Only the
//      MAX_PAIR_WALKS pairs closest to the target mileage are walked.
// Each walk is scored |miles - target| + miles ridden a second time, so a
// real loop beats a lollipop of the same length. A walk that repeats more
// than 30% of its own length is not offered as a loop. The best walk is
// kept, then further walks within the mileage band that do not mostly share
// trail with one already kept. Ties break on miles, kind, then indices.
//
// Output words at sm_loop_ptr(): [count, then per option: kind, len, codes..].
// kind 0 = loop, kind 1 = out-and-back to the junction whose round trip is
// closest to the target. Return: option count, or -2 for malformed input.
const MAX_LOOP_OPTIONS: usize = 4;
const LOOP_WORDS: usize = 1 + MAX_LOOP_OPTIONS * (2 + 3 * MAX_NODES);
const EXTRA_OPTION_SHARE: f64 = 0.25; // pair search and extra loops stay within 25% of target
const EXTRA_OPTION_FLOOR: f64 = 5.0;  // or 5 miles, whichever is larger
const MAX_SHARED_SHARE: f64 = 0.6;    // options sharing more than this are duplicates
const MAX_REPEAT_SHARE: f64 = 0.3;    // repeated miles allowed in something called a loop
const MAX_PAIR_NODES: usize = 1200;   // larger components use F candidates only
const MAX_PAIR_WALKS: usize = 3000;
const NONE: u32 = u32::MAX;
static mut LOOP_OUT: [u32; LOOP_WORDS] = [0; LOOP_WORDS];

#[no_mangle]
pub extern "C" fn sm_loop_abi_version() -> u32 { 1 }
#[no_mangle]
pub extern "C" fn sm_loop_ptr() -> u32 { std::ptr::addr_of_mut!(LOOP_OUT).cast::<u32>() as u32 }
#[no_mangle]
pub extern "C" fn sm_loop_words() -> u32 { LOOP_WORDS as u32 }

struct Tree {
    distance: Vec<f64>,
    parent: Vec<u32>,
    code: Vec<u32>,
}

fn read_edges(n: usize, m: usize) -> Option<Vec<Edge>> {
    let mut edges = Vec::with_capacity(m);
    for i in 0..m {
        let edge = unsafe { *std::ptr::addr_of!(INPUT).cast::<Edge>().add(i) };
        if edge.from as usize >= n || edge.to as usize >= n
            || !edge.miles.is_finite() || edge.miles < 0.0 { return None; }
        edges.push(edge);
    }
    Some(edges)
}

fn shortest_tree(adjacency: &[Vec<(usize, f64, u32)>], start: usize) -> Tree {
    let n = adjacency.len();
    let mut tree = Tree { distance: vec![f64::INFINITY; n], parent: vec![NONE; n], code: vec![0; n] };
    let mut heap = BinaryHeap::new();
    let mut serial: usize = 0;
    tree.distance[start] = 0.0;
    heap.push(Candidate { distance: 0.0, node: start, serial });
    while let Some(current) = heap.pop() {
        if current.distance > tree.distance[current.node] { continue; }
        for &(next, weight, edge_code) in &adjacency[current.node] {
            let alternative = current.distance + weight;
            if alternative < tree.distance[next] {
                tree.distance[next] = alternative;
                tree.parent[next] = current.node as u32;
                tree.code[next] = edge_code;
                serial += 1;
                heap.push(Candidate { distance: alternative, node: next, serial });
            }
        }
    }
    tree
}

/// Edge codes root -> node along a tree, in riding order.
fn tree_path(tree: &Tree, root: usize, node: usize) -> Option<Vec<u32>> {
    let mut codes = Vec::new();
    let mut current = node;
    while current != root {
        if codes.len() > tree.parent.len() || tree.parent[current] == NONE { return None; }
        codes.push(tree.code[current]);
        current = tree.parent[current] as usize;
    }
    codes.reverse();
    Some(codes)
}

fn ride_back(out: &[u32]) -> Vec<u32> {
    out.iter().rev().map(|code| code ^ REVERSE_BIT).collect()
}

struct Walk { cost: f64, miles: f64, kind: u32, a: usize, b: usize, codes: Vec<u32> }

/// Miles and repeated miles in riding order; None when it repeats too much to be a loop.
fn score_walk(edges: &[Edge], seen: &mut [u32], stamp: u32, codes: Vec<u32>, target: f64, kind: u32, a: usize, b: usize) -> Option<Walk> {
    let mut miles = 0.0;
    let mut repeated = 0.0;
    for code in &codes {
        let index = (code & !REVERSE_BIT) as usize;
        miles += edges[index].miles;
        if seen[index] == stamp { repeated += edges[index].miles; } else { seen[index] = stamp; }
    }
    if !(miles > 0.0) || repeated > MAX_REPEAT_SHARE * miles { return None; }
    Some(Walk { cost: (miles - target).abs() + repeated, miles, kind, a, b, codes })
}

#[no_mangle]
pub extern "C" fn sm_loops(node_count: i32, edge_count: i32, start: i32, target_miles: f64, max_loops: i32) -> i32 {
    if node_count <= 0 || node_count as usize > MAX_NODES
        || edge_count < 0 || edge_count as usize > MAX_EDGES
        || start < 0 || start >= node_count
        || !target_miles.is_finite() || target_miles <= 0.0
        || max_loops < 1 || max_loops as usize >= MAX_LOOP_OPTIONS {
        return -2;
    }
    let n = node_count as usize;
    let m = edge_count as usize;
    let s = start as usize;
    let Some(edges) = read_edges(n, m) else { return -2; };
    let mut adjacency = vec![Vec::<(usize, f64, u32)>::new(); n];
    for (i, edge) in edges.iter().enumerate() {
        adjacency[edge.from as usize].push((edge.to as usize, edge.miles, i as u32));
        adjacency[edge.to as usize].push((edge.from as usize, edge.miles, (i as u32) | REVERSE_BIT));
    }
    let home = shortest_tree(&adjacency, s);
    let band = (target_miles * EXTRA_OPTION_SHARE).max(EXTRA_OPTION_FLOOR);
    let mut seen = vec![0u32; m];
    let mut stamp: u32 = 0;
    let mut pool = Vec::<Walk>::new();

    // F: one circuit per edge that is not on the start's tree.
    let mut on_tree = vec![false; m];
    for node in 0..n {
        if home.parent[node] != NONE { on_tree[(home.code[node] & !REVERSE_BIT) as usize] = true; }
    }
    for (i, edge) in edges.iter().enumerate() {
        let (u, v) = (edge.from as usize, edge.to as usize);
        if on_tree[i] || !home.distance[u].is_finite() || !home.distance[v].is_finite() { continue; }
        let Some(mut codes) = tree_path(&home, s, u) else { return -2; };
        let Some(back) = tree_path(&home, s, v) else { return -2; };
        codes.push(i as u32);
        codes.extend(ride_back(&back));
        stamp += 1;
        if let Some(walk) = score_walk(&edges, &mut seen, stamp, codes, target_miles, 0, i, 0) { pool.push(walk); }
    }

    // P: start -> A -> B -> start for the junction pairs nearest the target.
    let members: Vec<usize> = (0..n).filter(|&node| node != s && home.distance[node].is_finite()).collect();
    if members.len() < MAX_PAIR_NODES {
        let trees: Vec<Tree> = members.iter().map(|&node| shortest_tree(&adjacency, node)).collect();
        let mut pairs = Vec::<(f64, usize, usize)>::new();
        for (x, &a) in members.iter().enumerate() {
            for &b in &members[x + 1..] {
                let gap = (home.distance[a] + trees[x].distance[b] + home.distance[b] - target_miles).abs();
                if gap <= band { pairs.push((gap, x, b)); }
            }
        }
        pairs.sort_by(|p, q| p.0.total_cmp(&q.0)
            .then_with(|| members[p.1].cmp(&members[q.1]))
            .then_with(|| p.2.cmp(&q.2)));
        pairs.truncate(MAX_PAIR_WALKS);
        for &(_, x, b) in &pairs {
            let a = members[x];
            let Some(mut codes) = tree_path(&home, s, a) else { return -2; };
            let Some(middle) = tree_path(&trees[x], a, b) else { return -2; };
            let Some(back) = tree_path(&home, s, b) else { return -2; };
            codes.extend(middle);
            codes.extend(ride_back(&back));
            stamp += 1;
            if let Some(walk) = score_walk(&edges, &mut seen, stamp, codes, target_miles, 1, a, b) { pool.push(walk); }
        }
    }

    pool.sort_by(|p, q| p.cost.total_cmp(&q.cost)
        .then_with(|| p.miles.total_cmp(&q.miles))
        .then_with(|| p.kind.cmp(&q.kind))
        .then_with(|| p.a.cmp(&q.a))
        .then_with(|| p.b.cmp(&q.b)));

    let mut walks = Vec::<(u32, &[u32])>::new();
    let mut chosen_marks = Vec::<Vec<bool>>::new();
    for candidate in &pool {
        if walks.len() >= max_loops as usize { break; }
        if !walks.is_empty() && (candidate.miles - target_miles).abs() > band { continue; }
        let mut mark = vec![false; m];
        let mut unique_miles = 0.0;
        let mut shared = vec![0.0; chosen_marks.len()];
        for code in &candidate.codes {
            let index = (code & !REVERSE_BIT) as usize;
            if mark[index] { continue; }
            mark[index] = true;
            unique_miles += edges[index].miles;
            for (k, other) in chosen_marks.iter().enumerate() {
                if other[index] { shared[k] += edges[index].miles; }
            }
        }
        if shared.iter().any(|&miles| miles > MAX_SHARED_SHARE * unique_miles) { continue; }
        chosen_marks.push(mark);
        walks.push((0, &candidate.codes));
    }

    let mut turnaround: Option<(f64, usize)> = None;
    for node in 0..n {
        if node == s || !home.distance[node].is_finite() || !(home.distance[node] > 0.0) { continue; }
        let gap = (2.0 * home.distance[node] - target_miles).abs();
        if turnaround.map_or(true, |(best, _)| gap < best) { turnaround = Some((gap, node)); }
    }
    let out_and_back;
    if let Some((_, node)) = turnaround {
        let Some(mut codes) = tree_path(&home, s, node) else { return -2; };
        let back = ride_back(&codes);
        codes.extend(back);
        out_and_back = codes;
        walks.push((1, &out_and_back));
    }

    let mut at = 1usize;
    for (kind, codes) in &walks {
        if at + 2 + codes.len() > LOOP_WORDS { return -2; }
        unsafe {
            let out = std::ptr::addr_of_mut!(LOOP_OUT).cast::<u32>();
            *out.add(at) = *kind;
            *out.add(at + 1) = codes.len() as u32;
            for (i, code) in codes.iter().enumerate() { *out.add(at + 2 + i) = *code; }
        }
        at += 2 + codes.len();
    }
    unsafe { *std::ptr::addr_of_mut!(LOOP_OUT).cast::<u32>() = walks.len() as u32; }
    walks.len() as i32
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
    fn loop_words() -> Vec<Vec<u32>> {
        let read = |i: usize| unsafe { *std::ptr::addr_of!(LOOP_OUT).cast::<u32>().add(i) };
        let mut at = 1;
        let mut options = Vec::new();
        for _ in 0..read(0) {
            let len = read(at + 1) as usize;
            let mut option = vec![read(at)];
            option.extend((0..len).map(|i| read(at + 2 + i)));
            options.push(option);
            at += 2 + len;
        }
        options
    }
    #[test]
    fn loop_finder_prefers_a_real_loop_and_adds_an_out_and_back() {
        // Square 0-1-2-3-0 (4 mi around) with a 3 mi spur 2-4.
        edge(0, 0, 1, 1.0);
        edge(1, 1, 2, 1.0);
        edge(2, 2, 3, 1.0);
        edge(3, 3, 0, 1.0);
        edge(4, 2, 4, 3.0);
        assert_eq!(sm_loop_abi_version(), 1);
        assert_eq!(sm_loops(5, 5, 0, 4.0, 3), 2);
        let options = loop_words();
        // Tree reaches 2 through 1, so edge 2 (2-3) closes the square.
        assert_eq!(options[0], vec![0, 0, 1, 2, 3]);
        // Round trip closest to 4 mi is junction 2 (2 mi out).
        assert_eq!(options[1], vec![1, 0, 1, REVERSE_BIT | 1, REVERSE_BIT | 0]);
    }
    #[test]
    fn loop_finder_handles_trees_and_rejects_bad_input() {
        edge(0, 0, 1, 2.0);
        edge(1, 1, 2, 2.0);
        // No cycle anywhere: only the out-and-back is offered.
        assert_eq!(sm_loops(3, 2, 0, 8.0, 3), 1);
        assert_eq!(loop_words()[0], vec![1, 0, 1, REVERSE_BIT | 1, REVERSE_BIT | 0]);
        // An isolated start has nothing to ride.
        assert_eq!(sm_loops(4, 2, 3, 8.0, 3), 0);
        assert_eq!(sm_loops(3, 2, 0, 0.0, 3), -2);
        assert_eq!(sm_loops(3, 2, 0, f64::NAN, 3), -2);
        assert_eq!(sm_loops(3, 2, 9, 8.0, 3), -2);
        assert_eq!(sm_loops(3, 2, 0, 8.0, 4), -2);
        edge(1, 1, 2, -1.0);
        assert_eq!(sm_loops(3, 2, 0, 8.0, 3), -2);
    }
}
