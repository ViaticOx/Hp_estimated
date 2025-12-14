import cars from "@/data/cars.json";

export type CarRow = (typeof cars)[number];

export function findProfiles(make: string, model: string) {
    return cars.filter((c) => c.make === make && c.model === model);
}

export function profileKey(p: CarRow) {
    return `${p.series} · ${p.yearFrom}-${p.yearTo} · ${p.variant}`;
}
