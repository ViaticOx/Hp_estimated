import cars from "@/data/cars.json";

export type CarRow = (typeof cars)[number];

export function listMakes() {
    return Array.from(new Set(cars.map((c) => c.make))).sort();
}

export function listModels(make: string) {
    return Array.from(new Set(cars.filter((c) => c.make === make).map((c) => c.model))).sort();
}

export function listSeries(make: string, model: string) {
    return Array.from(
        new Set(cars.filter((c) => c.make === make && c.model === model).map((c) => c.series))
    ).sort();
}

export function listVariants(make: string, model: string, series: string) {
    return cars
        .filter((c) => c.make === make && c.model === model && c.series === series)
        .map((c) => `${c.yearFrom}-${c.yearTo} · ${c.variant}`);
}

export function getCar(make: string, model: string, series: string, variantKey: string) {
    const [yearsPart, variant] = variantKey.split(" · ");
    const [yearFrom, yearTo] = yearsPart.split("-").map(Number);

    return cars.find(
        (c) =>
            c.make === make &&
            c.model === model &&
            c.series === series &&
            c.yearFrom === yearFrom &&
            c.yearTo === yearTo &&
            c.variant === variant
    );
}
