"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { cx } from "./ui";

/* Data colours: validated categorical slots (blue, orange). Text never wears these. */
export const SERIES = ["#2a78d6", "#eb6834"] as const;
const GRID = "#e2e8f0";
const INK_MUTED = "#64748b";
const SURFACE = "#ffffff";

export const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}K` : String(Math.round(n)));
const shortDate = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

function niceMax(v: number) {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((s) => (s * pow * 4) >= v)! * pow;
  return step * 4;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

/* --------------------------------- Legend -------------------------------- */

export function Legend({ items, shape = "line" }: { items: { label: string; color: string }[]; shape?: "line" | "rect" }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span aria-hidden className={shape === "line" ? "h-0.5 w-3.5 rounded" : "h-2.5 w-2.5 rounded-sm"} style={{ backgroundColor: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------- Line chart ------------------------------ */

export type Series = { label: string; values: number[]; color: string };

/** Time series with area wash, crosshair, and an every-series tooltip. One y-axis, shared units. */
export function LineChart({ dates, series, height = 260, dim }: { dates: string[]; series: Series[]; height?: number; dim?: boolean }) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const reduce = useReducedMotion();
  const gradientId = useId();
  const pad = { top: 12, right: 16, bottom: 26, left: 36 };
  const w = Math.max(width, 280);
  const innerW = w - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const n = dates.length;
  const x = (i: number) => pad.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;
  const ticks = [0, 1, 2, 3, 4].map((t) => (max / 4) * t);
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(innerW / 70))));

  const paths = useMemo(
    () =>
      series.map((s) => {
        const pts = s.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
        return { line: `M${pts.join("L")}`, area: `M${x(0)},${y(0)}L${pts.join("L")}L${x(n - 1)},${y(0)}Z` };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [series, w, height, max],
  );

  function locate(clientX: number, el: Element) {
    const r = el.getBoundingClientRect();
    const px = ((clientX - r.left) / r.width) * w;
    const i = Math.round(((px - pad.left) / innerW) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, i)));
  }

  const tipLeft = hover !== null ? (x(hover) / w) * 100 : 0;

  return (
    <div ref={ref} className={cx("relative transition-opacity", dim && "opacity-50")}>
      {width > 0 && (
        <svg
          width={w}
          height={height}
          viewBox={`0 0 ${w} ${height}`}
          role="img"
          aria-label={`${series.map((s) => s.label).join(" and ")} per day. Use arrow keys to read values.`}
          tabIndex={0}
          className="block touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
          onPointerMove={(e) => locate(e.clientX, e.currentTarget)}
          onPointerLeave={() => setHover(null)}
          onFocus={() => setHover((h) => h ?? n - 1)}
          onBlur={() => setHover(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? n - 1) - 1));
            if (e.key === "ArrowRight") setHover((h) => Math.min(n - 1, (h ?? 0) + 1));
          }}
        >
          <defs>
            {series.map((s, i) => (
              <linearGradient key={i} id={`${gradientId}-${i}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.14} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={w - pad.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
              <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={INK_MUTED}>
                {compact(t)}
              </text>
            </g>
          ))}
          {dates.map((d, i) =>
            // Regular ticks, plus the last date; a regular tick too close to the last one is dropped.
            (i % labelEvery === 0 && n - 1 - i >= labelEvery * 0.7) || i === n - 1 ? (
              <text key={d} x={x(i)} y={height - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize={11} fill={INK_MUTED}>
                {shortDate(d)}
              </text>
            ) : null,
          )}
          {/* Lines and washes are revealed left-to-right by a clip that widens; replays when the range changes. */}
          <clipPath id={`${gradientId}-reveal`}>
            <motion.rect
              key={`${dates[0]}-${n}`}
              x={0}
              y={0}
              height={height}
              initial={{ width: reduce ? w : 0 }}
              animate={{ width: w }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            />
          </clipPath>
          <g clipPath={`url(#${gradientId}-reveal)`}>
            {paths.map((p, i) => (
              <path key={`a${i}`} d={p.area} fill={`url(#${gradientId}-${i})`} />
            ))}
            {paths.map((p, i) => (
              <path key={`l${i}`} d={p.line} fill="none" stroke={series[i].color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            ))}
          </g>
          {/* End markers: the latest value of each series */}
          {series.map((s, i) => (
            <circle key={`e${i}`} cx={x(n - 1)} cy={y(s.values[n - 1] ?? 0)} r={4} fill={s.color} stroke={SURFACE} strokeWidth={2} />
          ))}
          {hover !== null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + innerH} stroke="#94a3b8" strokeWidth={1} />
              {series.map((s, i) => (
                <circle key={i} cx={x(hover)} cy={y(s.values[hover] ?? 0)} r={5} fill={s.color} stroke={SURFACE} strokeWidth={2} />
              ))}
            </g>
          )}
        </svg>
      )}
      {hover !== null && (
        <div
          role="status"
          className="pointer-events-none absolute top-1 z-10 min-w-36 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
          style={{ left: `${tipLeft}%`, transform: `translateX(${tipLeft > 65 ? "calc(-100% - 12px)" : "12px"})` }}
        >
          <p className="mb-1 font-medium text-slate-500">{shortDate(dates[hover])}</p>
          {series.map((s) => (
            <p key={s.label} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="h-0.5 w-3 rounded" style={{ backgroundColor: s.color }} />
                {s.label}
              </span>
              <b className="text-sm text-navy-900">{s.values[hover]?.toLocaleString()}</b>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Bar list ------------------------------- */

/** Horizontal bars for magnitude by category: single colour, value at the tip, hover lift. */
export function BarList({ items, color = SERIES[0], format = (v: number) => v.toLocaleString(), onSelect }: { items: { label: string; value: number; hint?: string }[]; color?: string; format?: (v: number) => string; onSelect?: (label: string) => void }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const [hover, setHover] = useState<string | null>(null);
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item, i) => {
        const pct = (item.value / max) * 100;
        return (
          <li
            key={item.label}
            tabIndex={0}
            onPointerEnter={() => setHover(item.label)}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(item.label)}
            onBlur={() => setHover(null)}
            onClick={() => onSelect?.(item.label)}
            className={cx("group grid grid-cols-[minmax(6rem,9rem)_1fr] items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-gold-500", onSelect && "cursor-pointer")}
            title={item.hint ? `${item.label}: ${format(item.value)} — ${item.hint}` : `${item.label}: ${format(item.value)}`}
          >
            <span className={cx("truncate text-sm", hover === item.label ? "font-semibold text-navy-900" : "text-slate-600")}>{item.label}</span>
            <div className="flex items-center gap-2">
              <div className="relative h-3.5 flex-1">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-r-[4px]"
                  style={{ backgroundColor: color, filter: hover === item.label ? "brightness(1.12)" : undefined, minWidth: item.value ? 4 : 0 }}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${pct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <span className="w-10 text-right text-sm font-semibold tabular-nums text-navy-900">{format(item.value)}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------ Sparkline ------------------------------ */

/** Tiny trend: de-emphasised line with the latest point in the accent colour. */
export function Sparkline({ values, color = SERIES[0], width = 120, height = 32 }: { values: number[]; color?: string; width?: number; height?: number }) {
  const max = Math.max(1, ...values);
  const n = values.length;
  const x = (i: number) => (n <= 1 ? width / 2 : 2 + (i / (n - 1)) * (width - 6));
  const y = (v: number) => height - 4 - (v / max) * (height - 8);
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="overflow-visible">
      <motion.path d={d} fill="none" stroke="#cbd5e1" strokeWidth={1.5} strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }} />
      <circle cx={x(n - 1)} cy={y(values[n - 1] ?? 0)} r={3} fill={color} stroke={SURFACE} strokeWidth={1.5} />
    </svg>
  );
}

/* -------------------------------- Meter -------------------------------- */

/** Proportion bar: fill in the accent, track a lighter step of the same hue. */
export function Meter({ value, max, color = SERIES[0], track = "#cde2fb", label }: { value: number; max: number; color?: string; track?: string; label: string }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div role="meter" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: track }}>
      <motion.div className="h-full rounded-full" style={{ backgroundColor: color }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} />
    </div>
  );
}

/* ------------------------------ Chart card ----------------------------- */

/** Card with a Chart / Table toggle so every value is reachable without hovering. */
export function ChartCard({ title, subtitle, legend, table, children, className, actions }: { title: string; subtitle?: string; legend?: ReactNode; table: { headers: string[]; rows: (string | number)[][] }; children: ReactNode; className?: string; actions?: ReactNode }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  return (
    <section className={cx("rounded-2xl border border-slate-200 bg-white p-5 shadow-sm", className)}>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-navy-900">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs" role="tablist" aria-label={`${title} view`}>
            {(["chart", "table"] as const).map((v) => (
              <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={cx("rounded-md px-2.5 py-1 font-medium capitalize transition", view === v ? "bg-white text-navy-900 shadow-sm" : "text-slate-500 hover:text-navy-900")}>
                {v}
              </button>
            ))}
          </div>
        </div>
      </header>
      {view === "chart" ? (
        <>
          {legend && <div className="mb-3">{legend}</div>}
          {children}
        </>
      ) : (
        <div className="max-h-72 overflow-auto rounded-lg border border-slate-100">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {table.headers.map((h) => (
                  <th key={h} className="px-3 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {table.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j} className={cx("px-3 py-1.5", j ? "text-right tabular-nums text-navy-900" : "text-slate-600")}>
                      {typeof c === "number" ? c.toLocaleString() : c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
