import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_ORBIT,
  TAU,
  deg,
  equalAreaEnd,
  field,
  orbitalPoint,
  orbitPoints,
  parseCSV,
  potential,
  rad,
  radius,
  sweptArea,
  trueAnomaly,
} from "../src/math";
const close = (a: number, b: number, tolerance = 1e-8) =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} ≠ ${b} (tol ${tolerance})`);
// Independent closed-form area using eccentric anomaly and mean anomaly.
function primitive(p: number, e: number, theta: number) {
  const turns = Math.floor((theta + Math.PI) / TAU);
  const local = theta - turns * TAU;
  const E =
    2 *
      Math.atan2(
        Math.sqrt(1 - e) * Math.sin(local / 2),
        Math.sqrt(1 + e) * Math.cos(local / 2),
      ) +
    turns * TAU;
  return ((p * p) / (2 * (1 - e * e) ** 1.5)) * (E - e * Math.sin(E));
}
test("rotation and translation preserve distance from the focus", () => {
  for (const alpha of [-180, 0, 25, 90, 180])
    for (const theta of [-2, 0, 1, 3]) {
      const orbit = { ...DEFAULT_ORBIT, h: 2, k: -3, alpha };
      const point = orbitalPoint(theta, orbit)!;
      close(
        Math.hypot(point.x - orbit.h, point.y - orbit.k),
        radius(theta, orbit.p, orbit.e),
      );
    }
  const pt = orbitalPoint(0, { p: 3, e: 0.5, alpha: 90, h: 1, k: 2 })!;
  close(pt.x, 1);
  close(pt.y, 4);
});
test("circular orbit has constant radius and sector area p² Δθ/2", () => {
  for (const theta of [-3, 0, 2, 7]) close(radius(theta, 3, 0), 3);
  close(sweptArea(3, 0, -1, 2), 13.5);
});
test("Simpson area matches analytic ellipse primitive across angles and eccentricities", () => {
  for (const e of [0, 0.35, 0.65, 0.85])
    for (const [start, end] of [
      [-0.7, 0.8],
      [2.5, 4],
      [-2, 5],
      [5, 8],
      [-1, TAU - 1],
    ]) {
      close(
        sweptArea(3, e, start, end),
        primitive(3, e, end) - primitive(3, e, start),
        2e-7,
      );
    }
});
test("equal area search agrees with an independent analytic check for the full slider domain", () => {
  for (const e of [0, 0.1, 0.65, 0.8, 0.85])
    for (const start of [-90, 0, 90])
      for (const delta of [10, 70, 120])
        for (const second of [100, 145, 260]) {
          const a = sweptArea(3, e, rad(start), rad(start + delta));
          const end = equalAreaEnd(3, e, rad(second), a);
          close(a, sweptArea(3, e, rad(second), end), 1e-9);
          close(a, primitive(3, e, end) - primitive(3, e, rad(second)), 3e-7);
        }
});
test("angles agree for a circle and differ on an eccentric ellipse", () => {
  const a = sweptArea(3, 0, rad(-35), rad(35));
  close(deg(equalAreaEnd(3, 0, rad(145), a)) - 145, 70);
  const eccentricArea = sweptArea(3, 0.65, rad(-35), rad(35));
  assert.ok(deg(equalAreaEnd(3, 0.65, rad(145), eccentricArea)) - 145 < 15);
});
test("Kepler animation sweeps equal areas at equal time increments", () => {
  for (const e of [0, 0.6, 0.85]) {
    const dt = 0.2;
    const factor = 9 / (2 * (1 - e * e) ** 1.5);
    for (const m of [0.2, 1.4, 3, 5]) {
      const t1 = trueAnomaly(m, e),
        t2 = trueAnomaly(m + dt, e);
      close(sweptArea(3, e, t1, t2), factor * dt, 1e-7);
    }
  }
});
test("open conics sample only the physical positive-radius branch", () => {
  for (const e of [1, 1.35]) {
    const points = orbitPoints({ ...DEFAULT_ORBIT, e, alpha: 0, h: 0, k: 0 });
    assert.equal(points.length, 901);
    assert.ok(
      points.every((pt) => Number.isFinite(pt.x) && Number.isFinite(pt.y)),
    );
    assert.notDeepEqual(points[0], points.at(-1));
  }
  assert.ok(Number.isNaN(radius(Math.PI, 3, 1.35)));
  assert.equal(orbitalPoint(Math.PI, { ...DEFAULT_ORBIT, e: 1 }), null);
});
test("potential and negative gradient point to translated focus; singularity is excluded", () => {
  close(potential(4, 6, 1, 2)!, -0.2);
  const v = field(4, 6, 1, 2)!;
  close(v.x, -3 / 125);
  close(v.y, -4 / 125);
  assert.equal(potential(1, 2, 1, 2), null);
  assert.equal(field(1, 2, 1, 2), null);
  const eps = 1e-5;
  close(
    v.x,
    -(potential(4 + eps, 6, 1, 2)! - potential(4 - eps, 6, 1, 2)!) / (2 * eps),
  );
});
test("CSV imports only actual numeric observations with optional headers", () => {
  assert.deepEqual(parseCSV("\ufeffx,y\r\n1,2\r\n-3,4.5\r\n"), [
    { x: 1, y: 2 },
    { x: -3, y: 4.5 },
  ]);
  assert.deepEqual(parseCSV("x;y\n1,5;2,5"), [{ x: 1.5, y: 2.5 }]);
  assert.deepEqual(parseCSV("1e-2,3"), [{ x: 0.01, y: 3 }]);
  for (const input of [
    "",
    "x,y",
    "x,y\n1,2,3",
    "x,y\nfoo,2",
    ",2",
    "NaN,2",
    "Infinity,1",
    "1e9,2",
  ])
    assert.throws(() => parseCSV(input));
  assert.throws(() => parseCSV(Array(5002).fill("1,2").join("\n")));
});
test("invalid integration domains cannot silently produce an area", () => {
  assert.throws(() => sweptArea(3, 1, 0, 1));
  assert.throws(() => sweptArea(3, 0.5, 1, 0));
  assert.throws(() => equalAreaEnd(3, 0.5, 0, -1));
});
