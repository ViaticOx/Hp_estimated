import { kmhToMps, clamp } from "./units";

export type EstimatorInput = {
    massKg: number;
    v1Kmh: number;
    v2Kmh: number;
    timeS: number;
    distanceM: number;

    gradePct?: number;
    rho?: number;

    // CdA (m^2)
    cda: number;

    // rolling
    crr: number;

    // drivetrain efficiency
    eta: number;
};

export type EstimatorResult = {
    wheelPowerW: number;
    enginePowerW: number;
    vEqMps: number;
    breakdown: {
        dE_J: number;
        E_drag_J: number;
        E_roll_J: number;
        E_grade_J: number;
    };
};

export function estimatePower(input: EstimatorInput): EstimatorResult {
    const g = 9.80665;

    const m = input.massKg;
    const t = input.timeS;
    const s = input.distanceM;

    if (!(m > 0) || !(t > 0) || !(s > 0)) {
        throw new Error("Massa, tempo e metri devono essere > 0");
    }

    const v1 = kmhToMps(input.v1Kmh);
    const v2 = kmhToMps(input.v2Kmh);

    if (!(v2 > v1) || v1 < 0) throw new Error("Velocità non valida");

    const rho = input.rho ?? 1.20;
    const cda = input.cda;
    const crr = input.crr;
    const eta = clamp(input.eta, 0.5, 0.98);

    // velocità equivalente (media quadratica) per drag ~ v^2
    const vEq = Math.sqrt((v1 * v1 + v2 * v2) / 2);

    const dE = 0.5 * m * (v2 * v2 - v1 * v1);

    const F_drag_eq = 0.5 * rho * cda * (vEq * vEq);
    const E_drag = F_drag_eq * s;

    const F_roll = m * g * crr;
    const E_roll = F_roll * s;

    const grade = (input.gradePct ?? 0) / 100;
    const F_grade = m * g * grade;
    const E_grade = F_grade * s;

    const wheelPowerW = (dE + E_drag + E_roll + E_grade) / t;
    const enginePowerW = wheelPowerW / eta;

    return {
        wheelPowerW,
        enginePowerW,
        vEqMps: vEq,
        breakdown: { dE_J: dE, E_drag_J: E_drag, E_roll_J: E_roll, E_grade_J: E_grade }
    };
}
