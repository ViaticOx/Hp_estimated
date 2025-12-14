import { estimatePower, EstimatorInput } from "./physics";
import { clamp } from "./units";

export type RangeResult = { minEngineW: number; maxEngineW: number; minWheelW: number; maxWheelW: number };

export function estimateRange(
    base: EstimatorInput,
    opts?: { cdaMin?: number; cdaMax?: number }
): RangeResult {
    const massPM = 20;
    const gradePM = 0.2;
    const etaPM = 0.03;
    const rhoRel = 0.04;
    const crrRel = 0.10;
    const cdaRel = 0.10;

    const masses = [base.massKg - massPM, base.massKg + massPM];
    const grades = [(base.gradePct ?? 0) - gradePM, (base.gradePct ?? 0) + gradePM];
    const etas = [clamp(base.eta - etaPM, 0.5, 0.98), clamp(base.eta + etaPM, 0.5, 0.98)];
    const rho0 = base.rho ?? 1.20;
    const rhos = [rho0 * (1 - rhoRel), rho0 * (1 + rhoRel)];
    const crrs = [base.crr * (1 - crrRel), base.crr * (1 + crrRel)];

    const useBounds = Number.isFinite(opts?.cdaMin) && Number.isFinite(opts?.cdaMax) && (opts!.cdaMin! > 0) && (opts!.cdaMax! > 0);
    const cdas = useBounds
        ? [opts!.cdaMin!, opts!.cdaMax!]
        : [base.cda * (1 - cdaRel), base.cda * (1 + cdaRel)];

    let minEngineW = Infinity, maxEngineW = -Infinity, minWheelW = Infinity, maxWheelW = -Infinity;

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
