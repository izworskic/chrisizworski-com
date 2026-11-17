// Independent, dependency-free science parity auditor. This is not production code.
// rustc --edition=2021 -O tools/frozen-lighthouse-audit.rs -o /tmp/lighthouse-audit
use std::fs;
fn number(s: &str)->Option<f64> { if s=="-" {None} else {s.parse().ok()} }
fn evaluate(p:&[&str])->(&'static str,Option<i32>){
    let v:Vec<_>=p[1..6].iter().map(|x|number(x)).collect();
    if v.iter().any(|x|x.map_or(true,|a|!a.is_finite())) {return ("unknown",None);}
    let (wind,air,water,from,axis)=(v[0].unwrap(),v[1].unwrap(),v[2].unwrap(),v[3].unwrap(),v[4].unwrap());
    let ice=number(p[6]);
    if p[6]!="-"&&ice.is_none(){return ("unknown",None);}
    if ice.map_or(false,|i|!i.is_finite()||i<0.||i>100.) {return ("unknown",None);}
    if ice.map_or(false,|i|i>=80.){return ("suppressed",Some(0));}
    let offset=((from-axis+540.).rem_euclid(360.)-180.).abs();
    if offset>55.||wind<15.||air>=32.||water>=40. {return ("none",Some(0));}
    let va=wind*0.44704;
    let ta=(air-32.)*5./9.;
    let tw=(water-32.)*5./9.;
    let denom=1.+0.3*tw;
    if denom<=0. {return ("unknown",None);}
    let pr=va*(-ta)/denom;
    let (category,base)=if pr<=0.{("none",0.)}else if pr<22.4{("light",25.)}
      else if pr<53.3{("moderate",55.)}else if pr<83.{("heavy",80.)}else{("extreme",100.)};
    let scale=ice.map_or(1.,|i|(1.-i/100.).max(0.));
    (category,Some((base*scale).round() as i32))
}
fn main(){
 let path=std::env::args().nth(1).unwrap_or("benchmarks/frozen-lighthouse-physics-cases.tsv".into());
 let content=fs::read_to_string(path).expect("Missing fixtures");
 let mut count=0;
 for line in content.lines().skip(1).filter(|s|!s.is_empty()){
  let p:Vec<_>=line.split('|').collect();
  assert_eq!(p.len(),9,"Malformed fixture");
  let expected=(p[7],if p[8]=="unknown"{None}else{Some(p[8].parse::<i32>().unwrap())});
  assert_eq!(evaluate(&p),expected,"Divergent case {}",p[0]);count+=1;
 }
 assert!(count>=10);
 println!("Rust: {count} independent icing physics cases passed");
}
