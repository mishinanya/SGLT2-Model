import type { DerivativeFn, ODESolution, SolveOptions } from "./odeTypes";

// Dormand–Prince 5(4) adaptive step RK.
// Returns only accepted steps (good enough for plotting in UI).
export function solveRK45(f: DerivativeFn, y0: number[], opts: SolveOptions): ODESolution {
  const t0 = opts.t0;
  const t1 = opts.t1;
  const maxSteps = opts.maxSteps ?? 200_000;
  const rtol = opts.rtol ?? 1e-6;
  const atol = opts.atol ?? 1e-9;
  const dtMin = opts.dtMin ?? 1e-8;
  const dtMax = opts.dtMax ?? Math.max(1e-3, (t1 - t0) / 10);
  let h = clamp(opts.dtInitial ?? (t1 - t0) / 200, dtMin, dtMax);

  const n = y0.length;
  let t = t0;
  const y = new Float64Array(y0);
  const yTmp = new Float64Array(n);
  const y4 = new Float64Array(n);
  const y5 = new Float64Array(n);
  const err = new Float64Array(n);

  const k1 = new Float64Array(n);
  const k2 = new Float64Array(n);
  const k3 = new Float64Array(n);
  const k4 = new Float64Array(n);
  const k5 = new Float64Array(n);
  const k6 = new Float64Array(n);
  const k7 = new Float64Array(n);

  const outT: number[] = [t];
  const outY: number[][] = [Array.from(y)];

  let steps = 0;
  while (t < t1 && steps < maxSteps) {
    steps += 1;
    const hEff = Math.min(h, t1 - t);

    f(t, y, k1);

    // a2=1/5
    axpyTo(y, hEff * (1 / 5), k1, yTmp);
    f(t + hEff * (1 / 5), yTmp, k2);

    // a3=3/10
    combineTo(y, hEff, [
      [3 / 40, k1],
      [9 / 40, k2],
    ], yTmp);
    f(t + hEff * (3 / 10), yTmp, k3);

    // a4=4/5
    combineTo(y, hEff, [
      [44 / 45, k1],
      [-56 / 15, k2],
      [32 / 9, k3],
    ], yTmp);
    f(t + hEff * (4 / 5), yTmp, k4);

    // a5=8/9
    combineTo(y, hEff, [
      [19372 / 6561, k1],
      [-25360 / 2187, k2],
      [64448 / 6561, k3],
      [-212 / 729, k4],
    ], yTmp);
    f(t + hEff * (8 / 9), yTmp, k5);

    // a6=1
    combineTo(y, hEff, [
      [9017 / 3168, k1],
      [-355 / 33, k2],
      [46732 / 5247, k3],
      [49 / 176, k4],
      [-5103 / 18656, k5],
    ], yTmp);
    f(t + hEff, yTmp, k6);

    // a7=1
    combineTo(y, hEff, [
      [35 / 384, k1],
      [0, k2],
      [500 / 1113, k3],
      [125 / 192, k4],
      [-2187 / 6784, k5],
      [11 / 84, k6],
    ], yTmp);
    f(t + hEff, yTmp, k7);

    // 5th order
    combineTo(y, hEff, [
      [35 / 384, k1],
      [0, k2],
      [500 / 1113, k3],
      [125 / 192, k4],
      [-2187 / 6784, k5],
      [11 / 84, k6],
    ], y5);

    // 4th order (embedded)
    combineTo(y, hEff, [
      [5179 / 57600, k1],
      [0, k2],
      [7571 / 16695, k3],
      [393 / 640, k4],
      [-92097 / 339200, k5],
      [187 / 2100, k6],
      [1 / 40, k7],
    ], y4);

    // error estimate
    for (let i = 0; i < n; i += 1) {
      err[i] = y5[i] - y4[i];
    }

    const errNorm = weightedRmsNorm(err, y, y5, atol, rtol);
    if (!Number.isFinite(errNorm)) {
      // Something blew up; force step shrink to try again.
      h = Math.max(dtMin, h * 0.1);
      continue;
    }

    if (errNorm <= 1) {
      // accept
      t += hEff;
      y.set(y5);
      outT.push(t);
      outY.push(Array.from(y));
    }

    // adapt
    const safety = 0.9;
    const minScale = 0.2;
    const maxScale = 5.0;
    const scale = errNorm === 0 ? maxScale : clamp(safety * Math.pow(1 / errNorm, 1 / 5), minScale, maxScale);
    h = clamp(h * scale, dtMin, dtMax);
  }

  if (steps >= maxSteps) {
    throw new Error(`RK45 exceeded maxSteps=${maxSteps}`);
  }

  return { t: outT, y: outY };
}

function weightedRmsNorm(e: Float64Array, yOld: Float64Array, yNew: Float64Array, atol: number, rtol: number) {
  const n = e.length;
  let sum = 0;
  for (let i = 0; i < n; i += 1) {
    const sc = atol + rtol * Math.max(Math.abs(yOld[i]), Math.abs(yNew[i]));
    const v = e[i] / sc;
    sum += v * v;
  }
  return Math.sqrt(sum / n);
}

function axpyTo(x: Float64Array, a: number, y: Float64Array, out: Float64Array) {
  for (let i = 0; i < x.length; i += 1) out[i] = x[i] + a * y[i];
}

function combineTo(
  base: Float64Array,
  h: number,
  terms: Array<[number, Float64Array]>,
  out: Float64Array,
) {
  for (let i = 0; i < base.length; i += 1) {
    let v = base[i];
    for (const [c, k] of terms) v += h * c * k[i];
    out[i] = v;
  }
}

function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}

