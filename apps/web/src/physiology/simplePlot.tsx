import { useMemo } from "react";

export type Series = { t: number[]; y: number[]; label: string };

export function SimplePlot({
  series,
  width = 860,
  height = 320,
}: {
  series: Series[];
  width?: number;
  height?: number;
}) {
  const pad = 36;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const { tMin, tMax, yMin, yMax } = useMemo(() => {
    let tMin = Number.POSITIVE_INFINITY;
    let tMax = Number.NEGATIVE_INFINITY;
    let yMin = Number.POSITIVE_INFINITY;
    let yMax = Number.NEGATIVE_INFINITY;
    for (const s of series) {
      for (let i = 0; i < s.t.length; i += 1) {
        const t = s.t[i]!;
        const y = s.y[i]!;
        if (!Number.isFinite(t) || !Number.isFinite(y)) continue;
        tMin = Math.min(tMin, t);
        tMax = Math.max(tMax, t);
        yMin = Math.min(yMin, y);
        yMax = Math.max(yMax, y);
      }
    }
    if (!Number.isFinite(tMin) || !Number.isFinite(tMax) || tMin === tMax) {
      tMin = 0;
      tMax = 1;
    }
    if (!Number.isFinite(yMin) || !Number.isFinite(yMax) || yMin === yMax) {
      yMin = 0;
      yMax = 1;
    }
    // small padding
    const yPad = 0.05 * (yMax - yMin);
    return { tMin, tMax, yMin: yMin - yPad, yMax: yMax + yPad };
  }, [series]);

  const xScale = (t: number) => pad + ((t - tMin) / (tMax - tMin)) * innerW;
  const yScale = (v: number) => pad + (1 - (v - yMin) / (yMax - yMin)) * innerH;

  const colors = ["#60a5fa", "#34d399", "#fbbf24", "#f472b6", "#a78bfa", "#fb7185"];

  return (
    <svg width={width} height={height} style={{ display: "block", width: "100%" }}>
      <rect x={0} y={0} width={width} height={height} fill="var(--card)" stroke="var(--border)" rx={12} />

      {/* axes */}
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="var(--border)" />
      <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="var(--border)" />

      {/* labels */}
      <text x={pad} y={pad - 12} fill="var(--muted)" fontSize={12}>
        y
      </text>
      <text x={width - pad} y={height - pad + 22} fill="var(--muted)" fontSize={12} textAnchor="end">
        t
      </text>

      {/* y min/max */}
      <text x={pad - 8} y={height - pad} fill="var(--muted)" fontSize={11} textAnchor="end" dominantBaseline="middle">
        {formatNum(yMin)}
      </text>
      <text x={pad - 8} y={pad} fill="var(--muted)" fontSize={11} textAnchor="end" dominantBaseline="middle">
        {formatNum(yMax)}
      </text>

      {/* x min/max */}
      <text x={pad} y={height - pad + 18} fill="var(--muted)" fontSize={11} textAnchor="start">
        {formatNum(tMin)}
      </text>
      <text x={width - pad} y={height - pad + 18} fill="var(--muted)" fontSize={11} textAnchor="end">
        {formatNum(tMax)}
      </text>

      {series.map((s, idx) => {
        const color = colors[idx % colors.length]!;
        let d = "";
        for (let i = 0; i < s.t.length; i += 1) {
          const x = xScale(s.t[i]!);
          const y = yScale(s.y[i]!);
          d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
        }
        return (
          <g key={s.label}>
            <path d={d} fill="none" stroke={color} strokeWidth={2} opacity={0.95} />
          </g>
        );
      })}
    </svg>
  );
}

function formatNum(x: number) {
  if (!Number.isFinite(x)) return "NaN";
  const ax = Math.abs(x);
  if (ax !== 0 && (ax < 1e-3 || ax >= 1e4)) return x.toExponential(2);
  return x.toFixed(3).replace(/\.?0+$/, "");
}

