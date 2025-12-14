export type Drivetrain = "FWD_RWD" | "AWD";
export type BodyType = "HATCH" | "SEDAN" | "SUV" | "CUSTOM";

export const DEFAULTS = {
    rho: 1.20,
    crr: 0.015,
    eta: { FWD_RWD: 0.86, AWD: 0.80 } as const,
    cda: { HATCH: 0.68, SEDAN: 0.60, SUV: 0.82 } as const
};

export const bodyTypeLabel: Record<BodyType, string> = {
    HATCH: "Hatch / compatta",
    SEDAN: "Berlina / coupé",
    SUV: "SUV / crossover",
    CUSTOM: "Inserisco CdA a mano"
};

export const drivetrainLabel: Record<Drivetrain, string> = {
    FWD_RWD: "FWD / RWD",
    AWD: "AWD"
};
