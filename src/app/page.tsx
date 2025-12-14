"use client";

import { useMemo, useState } from "react";
import { estimatePower } from "@/lib/physics";
import { estimateRange } from "@/lib/uncertainty";
import { wattsToHp } from "@/lib/units";
import { DEFAULTS, BodyType, Drivetrain, bodyTypeLabel, drivetrainLabel } from "@/lib/defaults";
import { getCar, listMakes, listModels, listSeries, listVariants } from "@/lib/carDb";

function fmt(n: number, digits = 1) {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

export default function Page() {
  // Performance input
  const [massKg, setMassKg] = useState(1400);
  const [v1Kmh, setV1Kmh] = useState(100);
  const [v2Kmh, setV2Kmh] = useState(200);
  const [timeS, setTimeS] = useState(10.0);
  const [distanceM, setDistanceM] = useState(350);
  const [gradePct, setGradePct] = useState(0.0);

  // Aero/drive input
  const [bodyType, setBodyType] = useState<BodyType>("HATCH");
  const [drivetrain, setDrivetrain] = useState<Drivetrain>("FWD_RWD");
  const [useCustomCda, setUseCustomCda] = useState(false);
  const [cdaCustom, setCdaCustom] = useState(DEFAULTS.cda.HATCH);
  const [crr, setCrr] = useState(DEFAULTS.crr);
  const [rho, setRho] = useState(DEFAULTS.rho);

  // Car DB selection
  const makes = useMemo(() => listMakes(), []);
  const [make, setMake] = useState("");
  const models = useMemo(() => (make ? listModels(make) : []), [make]);
  const [model, setModel] = useState("");
  const seriesList = useMemo(() => (make && model ? listSeries(make, model) : []), [make, model]);
  const [series, setSeries] = useState("");
  const variants = useMemo(() => (make && model && series ? listVariants(make, model, series) : []), [make, model, series]);
  const [variantKey, setVariantKey] = useState("");

  const selectedCar = useMemo(() => {
    if (!make || !model || !series || !variantKey) return null;
    return getCar(make, model, series, variantKey) ?? null;
  }, [make, model, series, variantKey]);

  // Apply selected car CdA to inputs
  const appliedCda = useMemo(() => {
    const eta = DEFAULTS.eta[drivetrain];
    const cda =
        useCustomCda || bodyType === "CUSTOM"
            ? cdaCustom
            : DEFAULTS.cda[bodyType as Exclude<BodyType, "CUSTOM">];

    // If car selected -> override CdA
    return selectedCar?.cda?.value ?? cda;
  }, [selectedCar, useCustomCda, bodyType, cdaCustom, drivetrain]);

  const eta = DEFAULTS.eta[drivetrain];

  const baseInput = useMemo(
      () => ({
        massKg,
        v1Kmh,
        v2Kmh,
        timeS,
        distanceM,
        gradePct,
        rho,
        cda: appliedCda,
        crr,
        eta
      }),
      [massKg, v1Kmh, v2Kmh, timeS, distanceM, gradePct, rho, appliedCda, crr, eta]
  );

  const { result, range, error } = useMemo(() => {
    try {
      const result = estimatePower(baseInput);

      // If selected car has min/max CdA, use them for range
      const cdaMin = selectedCar?.cda?.min;
      const cdaMax = selectedCar?.cda?.max;

      const range = estimateRange(baseInput, { cdaMin, cdaMax });

      return { result, range, error: "" };
    } catch (e: any) {
      return { result: null as any, range: null as any, error: e?.message ?? "Errore" };
    }
  }, [baseInput, selectedCar]);

  const quality = useMemo(() => {
    let score = 0;
    if (distanceM > 0) score += 1;
    if (Number.isFinite(gradePct)) score += 1;
    if (Number.isFinite(rho) && rho > 0) score += 1;
    if (Number.isFinite(crr) && crr > 0) score += 1;
    if (selectedCar?.cda?.min && selectedCar?.cda?.max) score += 1; // best
    else score += 0;
    if (score >= 5) return "A";
    if (score === 4) return "B";
    return "C";
  }, [distanceM, gradePct, rho, crr, selectedCar]);

  return (
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
        <h1 style={{ fontSize: 22, marginBottom: 12 }}>HP Estimator (manuale + database CdA)</h1>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
            <h2 style={{ fontSize: 16, margin: 0, marginBottom: 12 }}>Auto (opzionale ma consigliata)</h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label>
                Marca
                <select
                    value={make}
                    onChange={(e) => {
                      setMake(e.target.value);
                      setModel("");
                      setSeries("");
                      setVariantKey("");
                    }}
                    style={{ width: "100%", padding: 8, marginTop: 6 }}
                >
                  <option value="">—</option>
                  {makes.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                  ))}
                </select>
              </label>

              <label>
                Modello
                <select
                    value={model}
                    onChange={(e) => {
                      setModel(e.target.value);
                      setSeries("");
                      setVariantKey("");
                    }}
                    disabled={!make}
                    style={{ width: "100%", padding: 8, marginTop: 6 }}
                >
                  <option value="">—</option>
                  {models.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
              <label>
                Serie
                <select
                    value={series}
                    onChange={(e) => {
                      setSeries(e.target.value);
                      setVariantKey("");
                    }}
                    disabled={!make || !model}
                    style={{ width: "100%", padding: 8, marginTop: 6 }}
                >
                  <option value="">—</option>
                  {seriesList.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                  ))}
                </select>
              </label>

              <label>
                Variante
                <select
                    value={variantKey}
                    onChange={(e) => setVariantKey(e.target.value)}
                    disabled={!make || !model || !series}
                    style={{ width: "100%", padding: 8, marginTop: 6 }}
                >
                  <option value="">—</option>
                  {variants.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                  ))}
                </select>
              </label>
            </div>

            {selectedCar ? (
                <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
                  <div style={{ fontSize: 13, color: "#666" }}>
                    CdA selezionato (m²)
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>
                    {fmt(selectedCar.cda.value, 3)}{" "}
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#666" }}>
                  (range: {fmt(selectedCar.cda.min, 3)} – {fmt(selectedCar.cda.max, 3)})
                </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
                    Fonte: {selectedCar.source?.name ?? "—"} {selectedCar.source?.url ? `· ${selectedCar.source.url}` : ""}
                    {selectedCar.notes ? ` · ${selectedCar.notes}` : ""}
                  </div>
                </div>
            ) : (
                <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
                  Se non trovi l’auto nel database, usa i campi manuali sotto.
                </div>
            )}

            <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid #eee" }} />

            <h2 style={{ fontSize: 16, margin: 0, marginBottom: 12 }}>Input run</h2>

            <label style={{ display: "block", marginBottom: 10 }}>
              Massa totale (kg)
              <input
                  type="number"
                  value={massKg}
                  onChange={(e) => setMassKg(Number(e.target.value))}
                  style={{ width: "100%", padding: 8, marginTop: 6 }}
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label>
                v1 (km/h)
                <input
                    type="number"
                    value={v1Kmh}
                    onChange={(e) => setV1Kmh(Number(e.target.value))}
                    style={{ width: "100%", padding: 8, marginTop: 6 }}
                />
              </label>
              <label>
                v2 (km/h)
                <input
                    type="number"
                    value={v2Kmh}
                    onChange={(e) => setV2Kmh(Number(e.target.value))}
                    style={{ width: "100%", padding: 8, marginTop: 6 }}
                />
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
              <label>
                Tempo (s)
                <input
                    type="number"
                    step="0.01"
                    value={timeS}
                    onChange={(e) => setTimeS(Number(e.target.value))}
                    style={{ width: "100%", padding: 8, marginTop: 6 }}
                />
              </label>
              <label>
                Distanza (m)
                <input
                    type="number"
                    value={distanceM}
                    onChange={(e) => setDistanceM(Number(e.target.value))}
                    style={{ width: "100%", padding: 8, marginTop: 6 }}
                />
              </label>
            </div>

            <label style={{ display: "block", marginTop: 10 }}>
              Pendenza media (%)
              <input
                  type="number"
                  step="0.01"
                  value={gradePct}
                  onChange={(e) => setGradePct(Number(e.target.value))}
                  style={{ width: "100%", padding: 8, marginTop: 6 }}
              />
            </label>

            <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid #eee" }} />

            <h2 style={{ fontSize: 16, margin: 0, marginBottom: 12 }}>Parametri (fallback/manuale)</h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label>
                Carrozzeria (fallback)
                <select
                    value={bodyType}
                    onChange={(e) => setBodyType(e.target.value as BodyType)}
                    style={{ width: "100%", padding: 8, marginTop: 6 }}
                >
                  {Object.entries(bodyTypeLabel).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                  ))}
                </select>
              </label>

              <label>
                Trazione
                <select
                    value={drivetrain}
                    onChange={(e) => setDrivetrain(e.target.value as Drivetrain)}
                    style={{ width: "100%", padding: 8, marginTop: 6 }}
                >
                  {Object.entries(drivetrainLabel).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                  ))}
                </select>
              </label>
            </div>

            <label style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
              <input
                  type="checkbox"
                  checked={useCustomCda}
                  onChange={(e) => setUseCustomCda(e.target.checked)}
                  disabled={!!selectedCar} // se c’è auto selezionata, CdA viene dal DB
              />
              Inserisco CdA a mano (m²)
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
              <label>
                CdA (m²)
                <input
                    type="number"
                    step="0.001"
                    value={selectedCar ? selectedCar.cda.value : cdaCustom}
                    onChange={(e) => setCdaCustom(Number(e.target.value))}
                    disabled={!!selectedCar || (!useCustomCda && bodyType !== "CUSTOM")}
                    style={{ width: "100%", padding: 8, marginTop: 6 }}
                />
              </label>
              <label>
                Crr
                <input
                    type="number"
                    step="0.0001"
                    value={crr}
                    onChange={(e) => setCrr(Number(e.target.value))}
                    style={{ width: "100%", padding: 8, marginTop: 6 }}
                />
              </label>
            </div>

            <label style={{ display: "block", marginTop: 10 }}>
              Densità aria ρ (kg/m³)
              <input
                  type="number"
                  step="0.01"
                  value={rho}
                  onChange={(e) => setRho(Number(e.target.value))}
                  style={{ width: "100%", padding: 8, marginTop: 6 }}
              />
            </label>

            <div style={{ marginTop: 10, fontSize: 13, color: "#555" }}>
              Valori attivi: CdA={fmt(appliedCda, 3)} · η={fmt(eta, 2)}
            </div>
          </section>

          <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
            <h2 style={{ fontSize: 16, margin: 0, marginBottom: 12 }}>Risultati</h2>

            {error ? (
                <div style={{ color: "crimson" }}>{error}</div>
            ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
                      <div style={{ fontSize: 13, color: "#666" }}>Wheel HP (medio tratto)</div>
                      <div style={{ fontSize: 26, fontWeight: 700 }}>
                        {fmt(wattsToHp(result.wheelPowerW), 0)} hp
                      </div>
                    </div>
                    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
                      <div style={{ fontSize: 13, color: "#666" }}>Engine HP (stimati)</div>
                      <div style={{ fontSize: 26, fontWeight: 700 }}>
                        {fmt(wattsToHp(result.enginePowerW), 0)} hp
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 14, border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
                    <div style={{ fontSize: 13, color: "#666" }}>Range (worst-case)</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>
                      {fmt(wattsToHp(range.minEngineW), 0)} – {fmt(wattsToHp(range.maxEngineW), 0)} hp (motore)
                    </div>
                    <div style={{ fontSize: 13, color: "#666", marginTop: 6 }}>
                      Qualità input: {quality}
                    </div>
                    {selectedCar?.cda?.min && selectedCar?.cda?.max ? (
                        <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                          Range usa CdA min/max dal database (più stretto e realistico).
                        </div>
                    ) : (
                        <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                          Range usa incertezza CdA ±10% (fallback).
                        </div>
                    )}
                  </div>

                  <div style={{ marginTop: 14, border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
                    <div style={{ fontSize: 13, color: "#666" }}>Breakdown energia (J)</div>
                    <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                      ΔE (cinetica): {fmt(result.breakdown.dE_J, 0)}
                      <br />
                      Drag: {fmt(result.breakdown.E_drag_J, 0)}
                      <br />
                      Rotolamento: {fmt(result.breakdown.E_roll_J, 0)}
                      <br />
                      Pendenza: {fmt(result.breakdown.E_grade_J, 0)}
                    </div>
                  </div>

                  <div style={{ marginTop: 12, fontSize: 12, color: "#666" }}>
                    Nota: è potenza media nel tratto (non “picco al banco”).
                  </div>
                </>
            )}
          </section>
        </div>
      </main>
  );
}
