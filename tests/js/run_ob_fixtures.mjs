/* Golden-fixture tests for the JS OB port. Dev-time only (Node is not an app
 * dependency); CI and developers run:  node tests/js/run_ob_fixtures.mjs
 *
 * Compares pivot sequence first (structural divergence reported as such),
 * then zones — times, direction and open/closed state exact, prices to tolerance.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { computeSwingStructure } from "../../web/indicators/ob-structure.js";
import { obZones, OB_PARAMS } from "../../web/indicators/ob.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = join(HERE, "..", "fixtures", "ob");

const ABS_TOL = 1e-9;
const REL_TOL = 1e-9;

let failures = 0;

function fail(fixture, message) {
  failures += 1;
  console.error(`FAIL ${fixture}: ${message}`);
}

function close(a, b) {
  if (Number.isNaN(a) && Number.isNaN(b)) return true;
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  return Math.abs(a - b) <= Math.max(ABS_TOL, REL_TOL * Math.max(Math.abs(a), Math.abs(b)));
}

function jsParams(p) {
  return {
    pivotBars: p.pivot_bars,
    confirmPoints: p.confirm_points,
    validityScanCap: p.validity_scan_cap,
  };
}

function comparePivots(name, actual, expected) {
  if (actual.length !== expected.length) {
    fail(name, `pivot count ${actual.length} != ${expected.length}`);
    return false;
  }
  for (let i = 0; i < expected.length; i++) {
    const got = actual[i];
    const want = expected[i];
    const exact = ["time", "type", "confirmation_time", "move_type"];
    for (const key of exact) {
      if (got[key] !== want[key]) {
        fail(name, `pivot[${i}].${key}: ${got[key]} != ${want[key]}`);
        return false;
      }
    }
    if (!close(got.extreme, want.extreme)) {
      fail(name, `pivot[${i}].extreme: ${got.extreme} != ${want.extreme}`);
      return false;
    }
    if (!close(got.confirm_price, want.confirm_price)) {
      fail(name, `pivot[${i}].confirm_price: ${got.confirm_price} != ${want.confirm_price}`);
      return false;
    }
  }
  return true;
}

function zoneKey(zone) {
  return `${zone.time}:${zone.direction}`;
}

function compareZones(name, actual, expected) {
  if (actual.length !== expected.length) {
    fail(name, `zone count ${actual.length} != ${expected.length}`);
    return;
  }

  const gotByKey = new Map(actual.map((zone) => [zoneKey(zone), zone]));
  for (const want of expected) {
    const got = gotByKey.get(zoneKey(want));
    if (!got) {
      fail(name, `missing zone ${zoneKey(want)}`);
      continue;
    }
    for (const key of ["time", "direction", "open"]) {
      if (got[key] !== want[key]) {
        fail(name, `zone ${zoneKey(want)}.${key}: ${got[key]} != ${want[key]}`);
      }
    }
    if (!want.open && got.time_to !== want.time_to) {
      fail(name, `zone ${zoneKey(want)}.time_to: ${got.time_to} != ${want.time_to}`);
    }
    for (const key of ["price_low", "price_high"]) {
      if (!close(got[key], want[key])) {
        fail(name, `zone ${zoneKey(want)}.${key}: ${got[key]} != ${want[key]}`);
      }
    }
  }
}

const files = readdirSync(FIXTURE_DIR).filter((f) => f.endsWith(".json"));
if (!files.length) {
  console.error(
    `no fixtures found in ${FIXTURE_DIR}; run MT5 export then tools/generate_ob_fixtures.py`,
  );
  process.exit(1);
}

for (const file of files) {
  const fixture = JSON.parse(readFileSync(join(FIXTURE_DIR, file), "utf-8"));
  const name = fixture.name;
  const bars = fixture.bars;
  const params = jsParams(fixture.params);

  const structure = computeSwingStructure(bars, fixture.point_size, params);
  const actualPivots = structure.exportPivots();
  const structureOk = comparePivots(name, actualPivots, fixture.pivots);

  const { zones, warning } = obZones(bars, fixture.point_size, params, structure);
  if ((warning || null) !== (fixture.warning || null)) {
    fail(name, `warning ${JSON.stringify(warning)} != ${JSON.stringify(fixture.warning)}`);
  }

  if (structureOk) {
    compareZones(name, zones, fixture.zones);
  } else {
    fail(name, "skipping zone comparison due to structural divergence");
  }

  if (!failures) {
    console.log(`ok ${name}: ${actualPivots.length} pivots, ${zones.length} zones`);
  }
}

if (failures) {
  console.error(`${failures} failure(s)`);
  process.exit(1);
}
console.log(`all ${files.length} fixtures pass`);
