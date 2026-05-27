"use client";

import { APP_NAME } from "@web-template/shared";
import { useMemo, useState } from "react";
import { solveRK45 } from "../physiology/rk45";
import {
  createRosenBrockTripleDerivative,
  rosenBrockTripleInitialVector,
  rosenBrockTripleStateNames,
  type RosenBrockTripleInputs,
} from "../physiology/rosenbrockTripleModel";
import { SimplePlot } from "../physiology/simplePlot";

export default function HomePage() {
  const [inputs, setInputs] = useState<RosenBrockTripleInputs>({
    VmaxreabsSGLT2hs: 60,
    VmaxreabsSGLT2t2d: 75,
    GFR: 0.12,
    MPGinitial: 7,
    kt2d: 0,
    use_empa: 1,
  });

  const [tEnd, setTEnd] = useState(24);
  const [dapasc0, setDapasc0] = useState(0);
  const [empaDepot0, setEmpaDepot0] = useState(0);
  const [selected, setSelected] = useState<(typeof rosenBrockTripleStateNames)[number]>("UGEmmol");
  const [result, setResult] = useState<{ t: number[]; y: number[][] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedIdx = useMemo(() => rosenBrockTripleStateNames.indexOf(selected), [selected]);

  const run = () => {
    setError(null);
    try {
      const y0 = rosenBrockTripleInitialVector({
        Dapasc: dapasc0,
        Empa_depot: empaDepot0,
      });
      const f = createRosenBrockTripleDerivative(inputs);
      const sol = solveRK45(f, y0, {
        t0: 0,
        t1: tEnd,
        dtInitial: Math.max(1e-3, tEnd / 400),
        dtMin: 1e-8,
        dtMax: Math.max(1e-2, tEnd / 20),
        rtol: 1e-6,
        atol: 1e-9,
        maxSteps: 200_000,
      });
      setResult(sol);
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "2rem",
      }}
    >
      <section style={{ maxWidth: 980, margin: "0 auto" }}>
        <header style={{ marginBottom: "1.25rem" }}>
          <p style={{ fontSize: "0.75rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)" }}>
            Client-side physiology solver
          </p>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginTop: "0.25rem" }}>{APP_NAME}</h1>
          <p style={{ color: "var(--muted)", marginTop: "0.25rem" }}>
            ODE system: <span style={{ color: "var(--foreground)" }}>RosenBrocktriple</span> (numeric solve + plot)
          </p>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "1rem",
          }}
        >
          <div
            style={{
              padding: "1rem",
              borderRadius: "1rem",
              background: "var(--card)",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "0.75rem" }}>
              <Field
                label="VmaxreabsSGLT2hs"
                value={inputs.VmaxreabsSGLT2hs}
                onChange={(v) => setInputs((s) => ({ ...s, VmaxreabsSGLT2hs: v }))}
              />
              <Field
                label="VmaxreabsSGLT2t2d"
                value={inputs.VmaxreabsSGLT2t2d}
                onChange={(v) => setInputs((s) => ({ ...s, VmaxreabsSGLT2t2d: v }))}
              />
              <Field label="GFR" value={inputs.GFR} onChange={(v) => setInputs((s) => ({ ...s, GFR: v }))} />
              <Field
                label="MPGinitial"
                value={inputs.MPGinitial}
                onChange={(v) => setInputs((s) => ({ ...s, MPGinitial: v }))}
              />
              <Field label="kt2d" value={inputs.kt2d} onChange={(v) => setInputs((s) => ({ ...s, kt2d: v }))} />
              <SelectField
                label="use_empa"
                value={String(inputs.use_empa)}
                options={[
                  { value: "1", label: "1 (Empa inhibition)" },
                  { value: "0", label: "0 (Dapa inhibition)" },
                ]}
                onChange={(v) => setInputs((s) => ({ ...s, use_empa: v === "1" ? 1 : 0 }))}
              />
              <Field label="t_end" value={tEnd} onChange={setTEnd} />
              <Field label="Dapasc(0)" value={dapasc0} onChange={setDapasc0} />
              <Field label="Empa_depot(0)" value={empaDepot0} onChange={setEmpaDepot0} />
            </div>

            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "0.9rem" }}>
              <button
                type="button"
                onClick={run}
                style={{
                  padding: "0.625rem 1.25rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: "var(--accent)",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Solve ODE
              </button>

              <SelectField
                label="Plot"
                value={selected}
                options={rosenBrockTripleStateNames.map((k) => ({ value: k, label: k }))}
                onChange={(v) => setSelected(v as (typeof rosenBrockTripleStateNames)[number])}
              />

              {error ? <span style={{ color: "#fb7185" }}>{error}</span> : null}
              {result ? (
                <span style={{ color: "var(--muted)" }}>
                  Steps: {result.t.length.toLocaleString()} · t=[0, {tEnd}]
                </span>
              ) : (
                <span style={{ color: "var(--muted)" }}>Ready</span>
              )}
            </div>
          </div>

          <div>
            {result ? (
              <SimplePlot
                series={[
                  {
                    t: result.t,
                    y: result.y.map((row) => row[selectedIdx] ?? 0),
                    label: selected,
                  },
                ]}
              />
            ) : (
              <div
                style={{
                  padding: "1rem",
                  borderRadius: "1rem",
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  color: "var(--muted)",
                }}
              >
                Click <b style={{ color: "var(--foreground)" }}>Solve ODE</b> to see trajectories.
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label style={{ display: "grid", gap: "0.35rem" }}>
      <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{label}</span>
      <input
        value={String(value)}
        inputMode="decimal"
        onChange={(e) => {
          const v = Number(e.target.value);
          onChange(Number.isFinite(v) ? v : 0);
        }}
        style={inputStyle}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label style={{ display: "grid", gap: "0.35rem" }}>
      <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.55rem 0.6rem",
  borderRadius: "0.5rem",
  border: "1px solid var(--border)",
  background: "rgba(15, 20, 25, 0.6)",
  color: "var(--foreground)",
  outline: "none",
};
