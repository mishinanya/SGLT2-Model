export type DerivativeFn = (t: number, y: Float64Array, dydt: Float64Array) => void;

export type SolveOptions = {
  t0: number;
  t1: number;
  dtInitial?: number;
  dtMin?: number;
  dtMax?: number;
  rtol?: number;
  atol?: number;
  maxSteps?: number;
};

export type ODESolution = {
  t: number[];
  y: number[][];
};

