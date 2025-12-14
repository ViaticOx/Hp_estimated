export async function fetchMakes(): Promise<string[]> {
    const res = await fetch("/api/vpic/makes");
    if (!res.ok) throw new Error("Errore caricamento marche (vPIC)");
    const data = (await res.json()) as { makes: string[] };
    return data.makes ?? [];
}

export async function fetchModels(make: string): Promise<string[]> {
    const res = await fetch(`/api/vpic/models?make=${encodeURIComponent(make)}`);
    if (!res.ok) throw new Error("Errore caricamento modelli (vPIC)");
    const data = (await res.json()) as { models: string[] };
    return data.models ?? [];
}
