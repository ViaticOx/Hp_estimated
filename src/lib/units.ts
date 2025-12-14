export const kmhToMps = (kmh: number) => kmh / 3.6;

export const wattsToHp = (w: number) => w / 745.699872;

export const clamp = (x: number, min: number, max: number) =>
    Math.min(max, Math.max(min, x));
