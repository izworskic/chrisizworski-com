# rocket-launch-weather

Rust/WebAssembly decision for the Rocket Launch Live delay planner
("What if launch moves back an hour?").

**Question it answers:** if the launch slips 1, 3 or 6 hours, does the
forecast sky at the two viewing spots get worse, better, or stay about the same?

- Input: the NWS cloud cover and surface assessment the national API already
  returns in `weather.slip.scenarios`. No new requests.
- Each spot is compared only with itself at the scheduled time. A change of
  20 points or more is meaningful, the same threshold the API uses between spots.
- Rain or storms arriving counts as worse. A missing value is unknown, never clear.
- The overall verdict ranks "both spots cloudier" first, then "one spot holds
  up", then "clearer", then "same sky".

It never predicts a delay, rocket visibility or flight-weather clearance.

Build (pinned, reproducible):

```
rustc +1.90.0 --edition=2021 --test src/lib.rs -o /tmp/lw-tests && /tmp/lw-tests
rustc +1.90.0 --edition=2021 --crate-type cdylib --target wasm32-unknown-unknown \
  -C opt-level=z -C codegen-units=1 -C lto=fat -C panic=abort -C strip=symbols \
  -o /tmp/rocket-launch-weather.wasm src/lib.rs
base64 -w0 /tmp/rocket-launch-weather.wasm > ../../public/assets/rocket-launch-weather.wasm.b64
node ../../scripts/verify-rocket-launch-weather-rust.cjs --wasm=/tmp/rocket-launch-weather.wasm
```

Browser loader: `public/assets/rocket-launch-weather-rust.js`. If the module
is missing or fails its self-check, the planner shows its original content.
