import type { DerivativeFn } from "./odeTypes";

export const rosenBrockTripleStateNames = [
  "Dapasc",
  "Dt1",
  "Dt2",
  "Dt3",
  "Dt4",
  "Dt5",
  "Dapacomp1",
  "Dapacomp2",
  "Dapalumen1",
  "Dapalumen2",
  "Dapabladder",
  "Dapaurine",
  "Empa_depot",
  "Empa_central",
  "Empa_periph",
  "Empa_lumen1",
  "Empa_lumen2",
  "Empa_bladder",
  "Empa_urine",
  "Glucoselumen1",
  "Glucoselumen2",
  "Glucosebladder",
  "UGEmmol",
] as const;

export type RosenBrockTripleStateName = (typeof rosenBrockTripleStateNames)[number];

export type RosenBrockTripleInputs = {
  VmaxreabsSGLT2hs: number;
  VmaxreabsSGLT2t2d: number;
  GFR: number;
  MPGinitial: number;
  kt2d: number;

  // Optional switches / dosing-like initial conditions (not in the RxODE block, but needed to drive dynamics in a UI).
  use_empa: 0 | 1;
};

export const rosenBrockTripleSuggestedInits: Record<RosenBrockTripleStateName, number> = {
  Dapasc: 0,
  Dt1: 0,
  Dt2: 0,
  Dt3: 0,
  Dt4: 0,
  Dt5: 0,
  Dapacomp1: 0,
  Dapacomp2: 0,
  Dapalumen1: 0,
  Dapalumen2: 0,
  Dapabladder: 0,
  Dapaurine: 0,
  Empa_depot: 0,
  Empa_central: 0,
  Empa_periph: 0,
  Empa_lumen1: 0,
  Empa_lumen2: 0,
  Empa_bladder: 0,
  Empa_urine: 0,
  Glucoselumen1: 0,
  Glucoselumen2: 0,
  Glucosebladder: 0,
  UGEmmol: 0,
};

export function rosenBrockTripleInitialVector(overrides?: Partial<Record<RosenBrockTripleStateName, number>>) {
  const vec = rosenBrockTripleStateNames.map((k) => overrides?.[k] ?? rosenBrockTripleSuggestedInits[k]);
  return vec;
}

export function createRosenBrockTripleDerivative(inputs: RosenBrockTripleInputs): DerivativeFn {
  // Parameters / inputs
  const VmaxreabsSGLT2hs = inputs.VmaxreabsSGLT2hs;
  const VmaxreabsSGLT2t2d = inputs.VmaxreabsSGLT2t2d;
  const GFR = inputs.GFR;
  const MPGinitial = inputs.MPGinitial;
  const kt2d = inputs.kt2d;
  const use_empa = inputs.use_empa;

  // Physiological
  const Vpl = 2.75;
  const Vlumen1 = 0.045;
  const Vlumen2 = 0.019;
  const Vbladder = 0.2;
  const Qlumen = 2.7;
  const Qbladder = 0.72;
  const Qurine = 0.06;

  // Glucose
  const MWglucose = 180;

  // Reabsorption
  const KmreabsSGLT1 = 0.5;
  const KmreabsSGLT2 = 4;
  const Vmax_hs = 105.6;
  const Vmax_t2d = 140;

  // Dapagliflozin PK/PD (as in file)
  const fupdapa = 0.086;
  const kabsdapa = 0.5071;
  const Qdapa = 13.65;
  const Vprfdapa = 98.57;
  const CLdapapls = 13.07;
  const k_tr_d = 10.38;
  const KidapaSGLT2ex = 103.1;
  const KidapaSGLT1ex = 119.3;

  // Empagliflozin popPK submodel (Riggs et al.)
  const Ka_empa = 0.224;
  const CL_empa = 9.87;
  const Vc_empa = 3.02;
  const Q_empa = 5.16;
  const Vp_empa = 60.4;
  const fupempa = 0.0;
  const KiempaSGLT2ex = 103.1;
  const KiempaSGLT1ex = 119.3;

  // Derived variables (constant w.r.t. state)
  const KidapaSGLT2 = KidapaSGLT2ex / 1_000_000_000;
  const KidapaSGLT1 = KidapaSGLT1ex / 1_000_000;
  const KiempSGLT2 = KiempaSGLT2ex * 1000;
  const KiempSGLT1 = KiempaSGLT1ex * 1000;
  const VmaxreabsSGLT1hs = Vmax_hs - VmaxreabsSGLT2hs;
  const VmaxreabsSGLT1t2d = Vmax_t2d - VmaxreabsSGLT2t2d;
  const VmaxSGLT1 = VmaxreabsSGLT1hs * (1 - kt2d) + VmaxreabsSGLT1t2d * kt2d;
  const VmaxSGLT2 = VmaxreabsSGLT2hs * (1 - kt2d) + VmaxreabsSGLT2t2d * kt2d;

  const Inhib_KiSGLT2 = KiempSGLT2 * use_empa + KidapaSGLT2 * (1 - use_empa);
  const Inhib_KiSGLT1 = KiempSGLT1 * use_empa + KidapaSGLT1 * (1 - use_empa);

  return (_t, y, dydt) => {
    // State unpack
    const Dapasc = y[0]!;
    const Dt1 = y[1]!;
    const Dt2 = y[2]!;
    const Dt3 = y[3]!;
    const Dt4 = y[4]!;
    const Dt5 = y[5]!;
    const Dapacomp1 = y[6]!;
    const Dapacomp2 = y[7]!;
    const Dapalumen1 = y[8]!;
    const Dapalumen2 = y[9]!;
    const Dapabladder = y[10]!;

    const Empa_depot = y[12]!;
    const Empa_central = y[13]!;
    const Empa_periph = y[14]!;
    const Empa_lumen1 = y[15]!;
    const Empa_lumen2 = y[16]!;
    const Empa_bladder = y[17]!;

    const Glucoselumen1 = y[19]!;
    const Glucoselumen2 = y[20]!;
    const Glucosebladder = y[21]!;
    const UGEmmol = y[22]!;

    // Concentrations
    const Dapacomp1conc = Dapacomp1 / Vpl;
    const Dapacomp2conc = Dapacomp2 / Vprfdapa;
    const Dapalumen1conc = Dapalumen1 / Vlumen1;
    const Dapalumen2conc = Dapalumen2 / Vlumen2;
    const Dapabladderconc = Dapabladder / Vbladder;

    const Empa_central_conc = Empa_central / Vc_empa;
    const Empa_lumen1_conc = Empa_lumen1 / Vlumen1;
    const Empa_lumen2_conc = Empa_lumen2 / Vlumen2;
    const Empa_bladder_conc = Empa_bladder / Vbladder;

    const Inhib_lumen1_conc = Empa_lumen1_conc * use_empa + Dapalumen1conc * (1 - use_empa);
    const Inhib_lumen2_conc = Empa_lumen2_conc * use_empa + Dapalumen2conc * (1 - use_empa);

    const Glucosepls = MPGinitial;
    const Glucoselumen1conc = Glucoselumen1 / Vlumen1;
    const Glucoselumen2conc = Glucoselumen2 / Vlumen2;
    const Glucosebladderconc = Glucosebladder / Vbladder;

    const reabsSGLT1dr =
      (VmaxSGLT1 * Glucoselumen2conc) /
      (KmreabsSGLT1 * (1 + Inhib_lumen2_conc / Inhib_KiSGLT1) + Glucoselumen2conc);
    const reabsSGLT2dr =
      (VmaxSGLT2 * Glucoselumen1conc) /
      (KmreabsSGLT2 * (1 + Inhib_lumen1_conc / Inhib_KiSGLT2) + Glucoselumen1conc);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const UGE = (UGEmmol * MWglucose) / 1000;

    // ODE system
    // Dapagliflozin PK
    dydt[0] = -k_tr_d * Dapasc;
    dydt[1] = k_tr_d * Dapasc - k_tr_d * Dt1;
    dydt[2] = k_tr_d * Dt1 - k_tr_d * Dt2;
    dydt[3] = k_tr_d * Dt2 - k_tr_d * Dt3;
    dydt[4] = k_tr_d * Dt3 - k_tr_d * Dt4;
    dydt[5] = k_tr_d * Dt4 - kabsdapa * Dt5;
    dydt[6] =
      kabsdapa * Dt5 -
      CLdapapls * Dapacomp1conc -
      GFR * fupdapa * Dapacomp1conc -
      Qdapa * Dapacomp1conc +
      Qdapa * Dapacomp2conc;
    dydt[7] = Qdapa * Dapacomp1conc - Qdapa * Dapacomp2conc;
    dydt[8] = GFR * fupdapa * Dapacomp1conc - Qlumen * Dapalumen1conc;
    dydt[9] = Qlumen * Dapalumen1conc - Qbladder * Dapalumen2conc;
    dydt[10] = Qbladder * Dapalumen2conc - Dapabladderconc * Qurine;
    dydt[11] = Dapabladderconc * Qurine;

    // Empagliflozin popPK + kidney lumen
    dydt[12] = -Ka_empa * Empa_depot;
    dydt[13] =
      Ka_empa * Empa_depot -
      (CL_empa / Vc_empa) * Empa_central -
      (Q_empa / Vc_empa) * Empa_central +
      (Q_empa / Vp_empa) * Empa_periph;
    dydt[14] = (Q_empa / Vc_empa) * Empa_central - (Q_empa / Vp_empa) * Empa_periph;

    dydt[15] = GFR * fupempa * Empa_central_conc - Qlumen * Empa_lumen1_conc;
    dydt[16] = Qlumen * Empa_lumen1_conc - Qbladder * Empa_lumen2_conc;
    dydt[17] = Qbladder * Empa_lumen2_conc - Empa_bladder_conc * Qurine;
    dydt[18] = Empa_bladder_conc * Qurine;

    // Glucose
    dydt[19] = Glucosepls * GFR - reabsSGLT2dr - Qlumen * Glucoselumen1conc;
    dydt[20] = Qlumen * Glucoselumen1conc - reabsSGLT1dr - Qbladder * Glucoselumen2conc;
    dydt[21] = Qbladder * Glucoselumen2conc - Qurine * Glucosebladderconc;
    dydt[22] = Qurine * Glucosebladderconc;
  };
}

