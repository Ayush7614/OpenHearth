import type { SavedRun } from "./storage";

/** Lightweight SVG multi-series chart (no chart library). */
export function renderTrendChart(runs: SavedRun[]): string {
  if (runs.length === 0) {
    return `<div class="empty chart-empty"><strong>No chart yet</strong>Save at least one month to see trends.</div>`;
  }

  const chronological = [...runs].sort((a, b) => a.month.localeCompare(b.month));
  const w = 640;
  const h = 220;
  const pad = { t: 24, r: 16, b: 36, l: 44 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  const totals = chronological.map((r) => r.insights.totalContributions);
  const hidden = chronological.map((r) => r.insights.reposHiddenByFeed);
  const maxY = Math.max(1, ...totals, ...hidden);

  const xAt = (i: number) =>
    pad.l + (chronological.length === 1 ? innerW / 2 : (i / (chronological.length - 1)) * innerW);
  const yAt = (v: number) => pad.t + innerH - (v / maxY) * innerH;

  const line = (values: number[]) =>
    values
      .map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`)
      .join(" ");

  const dots = (values: number[], cls: string) =>
    values
      .map(
        (v, i) =>
          `<circle class="${cls}" cx="${xAt(i).toFixed(1)}" cy="${yAt(v).toFixed(1)}" r="3.5"><title>${chronological[i].month}: ${v}</title></circle>`
      )
      .join("");

  const labels = chronological
    .map((r, i) => {
      if (chronological.length > 8 && i % 2 === 1 && i !== chronological.length - 1) return "";
      return `<text class="chart-label" x="${xAt(i).toFixed(1)}" y="${h - 10}" text-anchor="middle">${r.month.slice(2)}</text>`;
    })
    .join("");

  return `
    <div class="chart-card">
      <div class="chart-legend">
        <span><i class="swatch total"></i> Contributions</span>
        <span><i class="swatch hidden"></i> Likely hidden repos</span>
      </div>
      <svg class="trend-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Contribution and hidden-repo trend">
        <line class="chart-grid" x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${pad.t + innerH}" />
        <line class="chart-grid" x1="${pad.l}" y1="${pad.t + innerH}" x2="${pad.l + innerW}" y2="${pad.t + innerH}" />
        <text class="chart-label" x="${pad.l - 8}" y="${pad.t + 4}" text-anchor="end">${maxY}</text>
        <text class="chart-label" x="${pad.l - 8}" y="${pad.t + innerH}" text-anchor="end">0</text>
        <path class="chart-line total" d="${line(totals)}" fill="none" />
        <path class="chart-line hidden" d="${line(hidden)}" fill="none" />
        ${dots(totals, "chart-dot total")}
        ${dots(hidden, "chart-dot hidden")}
        ${labels}
      </svg>
    </div>`;
}

/** Year month-grid from saved runs (intensity = total contributions). */
export function renderYearHeatmap(runs: SavedRun[], year?: number): string {
  if (runs.length === 0) {
    return `<div class="empty chart-empty"><strong>No year view yet</strong>Save months to build a timeline.</div>`;
  }

  const byMonth = new Map(runs.map((r) => [r.month, r]));
  const years = [...new Set(runs.map((r) => Number(r.month.slice(0, 4))))].sort();
  const y = year ?? years[years.length - 1];
  const max = Math.max(
    1,
    ...[...byMonth.entries()]
      .filter(([m]) => m.startsWith(String(y)))
      .map(([, r]) => r.insights.totalContributions)
  );

  const cells = Array.from({ length: 12 }, (_, i) => {
    const month = `${y}-${String(i + 1).padStart(2, "0")}`;
    const run = byMonth.get(month);
    const v = run?.insights.totalContributions ?? 0;
    const hidden = run?.insights.reposHiddenByFeed ?? 0;
    const intensity = v === 0 ? 0 : Math.max(0.18, v / max);
    return `<div class="heat-cell" style="--heat:${intensity}" title="${month}: ${v} contribs · ~${hidden} hidden">
      <span class="heat-label">${month.slice(5)}</span>
      <strong>${v || "·"}</strong>
    </div>`;
  }).join("");

  return `
    <div class="year-heat">
      <div class="chart-legend"><span>Year timeline · ${y} (saved months)</span></div>
      <div class="heat-grid">${cells}</div>
    </div>`;
}
