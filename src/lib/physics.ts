import { kmhToMps, clamp } from "./units";

export type EstimatorInput = {
    massKg: number;
    v1Kmh: number;
    v2Kmh: number;
    timeS: number;
    distanceM: number;
    gradePct?: number;
    rho?: number;
    cda: number; // CdA (m²)
    crr: number;
    eta: number;
};

export type EstimatorResult = {
    wheelPowerW: number;
    enginePowerW: number;
    vEqMps: number;
    breakdown: { dE_J: number; E_drag_J: number; E_roll_J: number; E_grade_J: number };
};

export function estimatePower(input: EstimatorInput): EstimatorResult {
    const g = 9.80665;

    const m = input.massKg;
    const t = input.timeS;
    const s = input.distanceM;
    if (!(m > 0) || !(t > 0) || !(s > 0)) throw new Error("Massa, tempo e metri devono essere > 0");

    const v1 = kmhToMps(input.v1Kmh);
    const v2 = kmhToMps(input.v2Kmh);
    if (!(v2 > v1) || v1 < 0) throw new Error("Velocità non valida");

    const rho = input.rho ?? 1.20;
    const cda = input.cda;
    const crr = input.crr;
    const eta = clamp(input.eta, 0.5, 0.98);

    const vEq = Math.sqrt((v1 * v1 + v2 * v2) / 2);
    const dE = 0.5 * m * (v2 * v2 - v1 * v1);

    const E_drag = (0.5 * rho * cda * (vEq * vEq)) * s;
    const E_roll = (m * g * crr) * s;

    const grade = (input.gradePct ?? 0) / 100;
    const E_grade = (m * g * grade) * s;

    const wheelPowerW = (dE + E_drag + E_roll + E_grade) / t;
    const enginePowerW = wheelPowerW / eta;

    return { wheelPowerW, enginePowerW, vEqMps: vEq, breakdown: { dE_J: dE, E_drag_J: E_drag, E_roll_J: E_roll, E_grade_J: E_grade } };
}
