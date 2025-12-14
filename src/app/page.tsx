"use client";

import { useEffect, useMemo, useState } from "react";
import { DEFAULTS, BodyType, Drivetrain, bodyTypeLabel, drivetrainLabel } from "@/lib/defaults";
import { estimatePower } from "@/lib/physics";
import { estimateRange } from "@/lib/uncertainty";
import { wattsToHp } from "@/lib/units";
import { fetchMakes, fetchModels } from "@/lib/vpicClient";
import { findProfiles, profileKey, CarRow } from "@/lib/carDb";

const fmt = (n: number, d = 1) => (Number.isFinite(n) ? n.toFixed(d) : "—");

export default function Page() {
  // Run
  const [massKg, setMassKg] = useState<number>(1400);
  const [v1Kmh, setV1Kmh] = useState<number>(100);
  const [v2Kmh, setV2Kmh] = useState<number>(200);
  const [timeS, setTimeS] = useState<number>(10);
  const [distanceM, setDistanceM] = useState<number>(350);
  const [gradePct, setGradePct] = useState<number>(0);

  // Params
  const [bodyType, setBodyType] = useState<BodyType>("HATCH");
  const [drivetrain, setDrivetrain] = useState<Drivetrain>("FWD_RWD");
  const [rho, setRho] = useState<number>(DEFAULTS.rho);
  const [crr, setCrr] = useState<number>(DEFAULTS.crr);

  // CdA
  const [useCustomCda, setUseCustomCda] = useState<boolean>(false);
  const [cdaCustom, setCdaCustom] = useState<number>(DEFAULTS.cda.HATCH);

  // vPIC
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [make, setMake] = useState<string>("");
  const [model, setModel] = useState<string>("");

  const [vpicError, setVpicError] = useState<string>("");
  const [loadingMakes, setLoadingMakes] = useState<boolean>(true);
  const [loadingModels, setLoadingModels] = useState<boolean>(false);

  // Profiles (cars.json)
  const profiles = useMemo(() => (make && model ? findProfiles(make, model) : []), [make, model]);
  const [profileSel, setProfileSel] = useState<string>("");
  const selectedProfile: CarRow | null = useMemo(() => {
    if (!profileSel) return null;
    return profiles.find((p) => profileKey(p) === profileSel) ?? null;
  }, [profiles, profileSel]);

  // Load makes once
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingMakes(true);
        const m = await fetchMakes();
        if (!alive) return;
        setMakes(m);
        setVpicError("");
      } catch (e: any) {
        if (!alive) return;
        setVpicError(e?.message ?? "Errore vPIC (makes)");
      } finally {
        if (alive) setLoadingMakes(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Load models when make changes
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!make) {
        setModels([]);
        return;
      }
      try {
        setLoadingModels(true);
        const m = await fetchModels(make);
        if (!alive) return;
        setModels(m);
        setVpicError("");
      } catch (e: any) {
        if (!alive) return;
        setVpicError(e?.message ?? "Errore vPIC (models)");
        setModels([]);
      } finally {
        if (alive) setLoadingModels(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [make]);

  // Sync selected profile CdA into state (keeps input types consistent)
  useEffect(() => {
    const val = selectedProfile?.cda?.value;
    if (typeof val === "number" && Number.isFinite(val)) setCdaCustom(val);
  }, [selectedProfile]);

  const eta = DEFAULTS.eta[drivetrain];

  const fallbackCda =
      useCustomCda || bodyType === "CUSTOM"
          ? cdaCustom
          : DEFAULTS.cda[bodyType as Exclude<BodyType, "CUSTOM">];

  const activeCda = selectedProfile?.cda?.value ?? fallbackCda;

  const baseInput = useMemo(
      () => ({
        massKg,
        v1Kmh,
        v2Kmh,
        timeS,
        distanceM,
        gradePct,
        rho,
        cda: activeCda,
        crr,
        eta
      }),
      [massKg, v1Kmh, v2Kmh, timeS, distanceM, gradePct, rho, activeCda, crr, eta]
  );

  const { result, range, error } = useMemo(() => {
    try {
      const r = estimatePower(baseInput);
      const rg = estimateRange(baseInput, {
        cdaMin: selectedProfile?.cda?.min,
        cdaMax: selectedProfile?.cda?.max
      });
      return { result: r, range: rg, error: "" };
    } catch (e: any) {
      return { result: null as any, range: null as any, error: e?.message ?? "Errore" };
    }
  }, [baseInput, selectedProfile]);

  return (
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
        <h1 className="h1">HP Estimator (manuale + vPIC + CdA)</h1>

        <div className="grid2">
          <section className="card">
            <h2 className="h2">Auto</h2>

            {vpicError ? (
                <div className="bad" style={{ marginBottom: 10 }}>
                  {vpicError}
                </div>
            ) : null}

            <div className="grid2tight">
              <label className="label">
                Marca (vPIC)
                <select
                    value={make}
                    onChange={(e) => {
                      setMake(e.target.value);
                      setModel("");
                      setProfileSel("");
                    }}
                    disabled={loadingMakes}
                >
                  <option value="">{loadingMakes ? "Caricamento..." : "—"}</option>
                  {makes.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                  ))}
                </select>
              </label>

              <label className="label">
                Modello (vPIC)
                <select
                    value={model}
                    onChange={(e) => {
                      setModel(e.target.value);
                      setProfileSel("");
                    }}
                    disabled={!make || loadingModels}
                >
                  <option value="">{loadingModels ? "Caricamento..." : "—"}</option>
                  {models.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="label" style={{ marginTop: 10 }}>
              Profilo CdA (dal tuo database)
              <select
                  value={profileSel}
                  onChange={(e) => setProfileSel(e.target.value)}
                  disabled={!make || !model || profiles.length === 0}
              >
                <option value="">{profiles.length === 0 ? "Nessun CdA: usa fallback/manuale" : "—"}</option>
                {profiles.map((p) => {
                  const k = profileKey(p);
                  return (
                      <option key={k} value={k}>
                        {k}
                      </option>
                  );
                })}
              </select>
            </label>

            {selectedProfile ? (
                <div className="kpi" style={{ marginTop: 12 }}>
                  <div className="t">CdA selezionato (m²)</div>
                  <div className="v" style={{ fontSize: 20 }}>
                    {fmt(selectedProfile.cda.value, 3)}{" "}
                    <small>
                      (range {fmt(selectedProfile.cda.min, 3)} – {fmt(selectedProfile.cda.max, 3)})
                    </small>
                  </div>
                  <small>
                    Fonte: {selectedProfile.source?.name ?? "—"}
                    {selectedProfile.notes ? ` · ${selectedProfile.notes}` : ""}
                  </small>
                </div>
            ) : null}

            <hr />

            <h2 className="h2">Input run</h2>

            <label className="label">
              Massa totale (kg)
              <input type="number" value={massKg} onChange={(e) => setMassKg(Number(e.target.value))} />
            </label>

            <div className="grid2tight">
              <label className="label">
                v1 (km/h)
                <input type="number" value={v1Kmh} onChange={(e) => setV1Kmh(Number(e.target.value))} />
              </label>
              <label className="label">
                v2 (km/h)
                <input type="number" value={v2Kmh} onChange={(e) => setV2Kmh(Number(e.target.value))} />
              </label>
            </div>

            <div className="grid2tight">
              <label className="label">
                Tempo (s)
                <input type="number" step="0.01" value={timeS} onChange={(e) => setTimeS(Number(e.target.value))} />
              </label>
              <label className="label">
                Distanza (m)
                <input type="number" value={distanceM} onChange={(e) => setDistanceM(Number(e.target.value))} />
              </label>
            </div>

            <label className="label">
              Pendenza media (%)
              <input type="number" step="0.01" value={gradePct} onChange={(e) => setGradePct(Number(e.target.value))} />
            </label>

            <hr />

            <h2 className="h2">Parametri (fallback/manuale)</h2>

            <div className="grid2tight">
              <label className="label">
                Carrozzeria
                <select value={bodyType} onChange={(e) => setBodyType(e.target.value as BodyType)}>
                  {Object.entries(bodyTypeLabel).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                  ))}
                </select>
              </label>

              <label className="label">
                Trazione
                <select value={drivetrain} onChange={(e) => setDrivetrain(e.target.value as Drivetrain)}>
                  {Object.entries(drivetrainLabel).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="label" style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                  type="checkbox"
                  checked={useCustomCda}
                  onChange={(e) => setUseCustomCda(e.target.checked)}
                  style={{ width: 18, height: 18, marginTop: 0 }}
              />
              Inserisco CdA a mano (m²)
            </label>

            <div className="grid2tight">
              <label className="label">
                CdA (m²)
                <input
                    type="number"
                    step="0.001"
                    value={cdaCustom}
                    onChange={(e) => setCdaCustom(Number(e.target.value))}
                    disabled={!!selectedProfile || (!useCustomCda && bodyType !== "CUSTOM")}
                />
                <small>
                  Attivo: {fmt(activeCda, 3)} · η={fmt(eta, 2)}
                </small>
              </label>

              <label className="label">
                Crr
                <input type="number" step="0.0001" value={crr} onChange={(e) => setCrr(Number(e.target.value))} />
              </label>
            </div>

            <label className="label">
              Densità aria ρ (kg/m³)
              <input type="number" step="0.01" value={rho} onChange={(e) => setRho(Number(e.target.value))} />
            </label>
          </section>

          <section className="card">
            <h2 className="h2">Risultati</h2>

            {error ? (
                <div className="bad">{error}</div>
            ) : (
                <>
                  <div className="grid2tight">
                    <div className="kpi">
                      <div className="t">Wheel HP (medio tratto)</div>
                      <div className="v">{fmt(wattsToHp(result.wheelPowerW), 0)} hp</div>
                    </div>
                    <div className="kpi">
                      <div className="t">Engine HP (stimati)</div>
                      <div className="v">{fmt(wattsToHp(result.enginePowerW), 0)} hp</div>
                    </div>
                  </div>

                  <div className="kpi" style={{ marginTop: 12 }}>
                    <div className="t">Range (worst-case)</div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>
                      {fmt(wattsToHp(range.minEngineW), 0)} – {fmt(wattsToHp(range.maxEngineW), 0)} hp (motore)
                    </div>
                    <small>
                      {selectedProfile?.cda?.min && selectedProfile?.cda?.max
                          ? "Range CdA dal database (min/max)."
                          : "Range CdA fallback (±10%)."}
                    </small>
                  </div>

                  <div className="kpi" style={{ marginTop: 12 }}>
                    <div className="t">Breakdown energia (J)</div>
                    <small>
                      ΔE (cinetica): {fmt(result.breakdown.dE_J, 0)}
                      <br />
                      Drag: {fmt(result.breakdown.E_drag_J, 0)}
                      <br />
                      Rotolamento: {fmt(result.breakdown.E_roll_J, 0)}
                      <br />
                      Pendenza: {fmt(result.breakdown.E_grade_J, 0)}
                    </small>
                  </div>

                  <small style={{ display: "block", marginTop: 10 }}>
                    Nota: potenza media nel tratto (non “picco al banco”).
                  </small>
                </>
            )}
          </section>
        </div>
      </main>
  );
}
