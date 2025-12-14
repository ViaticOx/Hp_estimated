import { NextResponse } from "next/server";

type VpicMakesResponse = { Results: Array<{ Make_Name: string }> };

export const revalidate = 60 * 60 * 24;

export async function GET() {
    const url = "https://vpic.nhtsa.dot.gov/api/vehicles/getallmakes?format=json";
    const res = await fetch(url, { next: { revalidate } });

    if (!res.ok) {
        return NextResponse.json({ error: "VPIC makes fetch failed" }, { status: 502 });
    }

    const data = (await res.json()) as VpicMakesResponse;

    const makes = (data.Results ?? [])
        .map((x) => x.Make_Name)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

    return NextResponse.json({ makes });
}
