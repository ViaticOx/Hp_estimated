import { NextResponse } from "next/server";

type VpicModelsResponse = { Results: Array<{ Model_Name: string }> };

export const revalidate = 60 * 60 * 24;

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const make = (searchParams.get("make") ?? "").trim();

    if (!make) {
        return NextResponse.json({ error: "Missing make" }, { status: 400 });
    }

    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformake/${encodeURIComponent(make)}?format=json`;
    const res = await fetch(url, { next: { revalidate } });

    if (!res.ok) {
        return NextResponse.json({ error: "VPIC models fetch failed" }, { status: 502 });
    }

    const data = (await res.json()) as VpicModelsResponse;

    const models = (data.Results ?? [])
        .map((x) => x.Model_Name)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

    return NextResponse.json({ models });
}
