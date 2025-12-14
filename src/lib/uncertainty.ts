import { estimatePower, EstimatorInput } from "./physics";
import { clamp } from "./units";

export type RangeResult = {
    minEngineW: number;
    maxEngineW: number;
    minWheelW: number;
    maxWheelW: number;
};

type UncertaintyConfig = {
    massKgPlusMinus: number;
    gradePctPlusMinus: number;
    etaPlusMinus: number;
    rhoRelPlusMinus: number;
    crrRelPlusMinus: number;

    // usato solo se NON passi bounds CdA
    cdaRelPlusMinus: number;
};

export const DEFAULT_UNCERTAINTY: UncertaintyConfig = {
    massKgPlusMinus: 20,
    gradePctPlusMinus: 0.2,
    etaPlusMinus: 0.03,
    rhoRelPlusMinus: 0.04,
    crrRelPlusMinus: 0.10,
    cdaRelPlusMinus: 0.10
};

export function estimateRange(
    base: EstimatorInput,
    opts?: { cdaMin?: number; cdaMax?: number; u?: Partial<UncertaintyConfig> }
): RangeResult {
    const u: UncertaintyConfig = { ...DEFAULT_UNCERTAINTY, ...(opts?.u ?? {}) };

    const masses = [base.massKg - u.massKgPlusMinus, base.massKg + u.massKgPlusMinus];
    const grades = [
        (base.gradePct ?? 0) - u.gradePctPlusMinus,
        (base.gradePct ?? 0) + u.gradePctPlusMinus
    ];

    const etaCenter = base.eta;
    const etas = [
        clamp(etaCenter - u.etaPlusMinus, 0.5, 0.98),
        clamp(etaCenter + u.etaPlusMinus, 0.5, 0.98)
    ];

    const rhoCenter = base.rho ?? 1.20;
    const rhos = [rhoCenter * (1 - u.rhoRelPlusMinus), rhoCenter * (1 + u.rhoRelPlusMinus)];

    const crrCenter = base.crr;
    const crrs = [crrCenter * (1 - u.crrRelPlusMinus), crrCenter * (1 + u.crrRelPlusMinus)];

    // CdA bounds: se arrivano dal DB li usiamo, altrimenti fallback ±%
    const cdaMin = opts?.cdaMin;
    const cdaMax = opts?.cdaMax;

    const cdas =
        Number.isFinite(cdaMin) && Number.isFinite(cdaMax) && (cdaMax as number) > 0 && (cdaMin as number) > 0
            ? [cdaMin as number, cdaMax as number]
            : [base.cda * (1 - u.cdaRelPlusMinus), base.cda * (1 + u.cdaRelPlusMinus)];

    let minEngineW = Number.POSITIVE_INFINITY;
    let maxEngineW = Number.NEGATIVE_INFINITY;
    let minWheelW = Number.POSITIVE_INFINITY;
    let maxWheelW = Number.NEGATIVE_INFINITY;

    for (const massKg of masses)
        for (const gradePct of grades)
            for (const cda of cdas)
                for (const eta of etas)
                    for (const rho of rhos)
                        for (const crr of crrs) {
                            const res = estimatePower({ ...base, massKg, gradePct, cda, eta, rho, crr });
                            minEngineW = Math.min(minEngineW, res.enginePowerW);
                            maxEngineW = Math.max(maxEngineW, res.enginePowerW);
                            minWheelW = Math.min(minWheelW, res.wheelPowerW);
                            maxWheelW = Math.max(maxWheelW, res.wheelPowerW);
                        }

    return { minEngineW, maxEngineW, minWheelW, maxWheelW };
}
