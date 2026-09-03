"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatMinor, minorUnitDigits } from "@/lib/invoice/money";
import type { MonthlyTotals } from "@/lib/dashboard";

/**
 * Invoiced against received, by month.
 *
 * The stat tiles above answer "where do I stand today"; a total cannot show
 * whether the work is trending up, or how far behind the money runs from the
 * invoicing. The gap between the two bars is the reason this chart exists, so
 * they sit side by side rather than stacked — a stacked bar would make the
 * paid portion look like part of a whole rather than a race against it.
 *
 * The two hues are validated for colour-vision deficiency (deutan ΔE 22.1,
 * normal-vision ΔE 27.1) rather than picked by eye, and both are also
 * distinguished by position and by the legend, so identity never rests on
 * colour alone.
 */
const INVOICED = "#4f46e5";
const PAID = "#0d9488";

function money(value: number, currency: string): string {
  const minor = BigInt(Math.round(value * 10 ** minorUnitDigits(currency)));
  return formatMinor(minor, currency);
}

/** Compact axis ticks: 250000 reads as 2.5L in India, 250K elsewhere. */
function compactTick(value: number, currency: string): string {
  if (value === 0) return "0";

  if (currency === "INR") {
    if (value >= 10_000_000) return `${(value / 10_000_000).toFixed(1)}Cr`;
    if (value >= 100_000) return `${(value / 100_000).toFixed(1)}L`;
    if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
    return String(Math.round(value));
  }

  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(Math.round(value));
}

function ChartTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
  currency: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-popover text-popover-foreground rounded-lg border p-3 text-sm shadow-md">
      <p className="mb-1.5 font-medium">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-[2px]"
            style={{ background: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}</span>
          <span className="ml-auto font-medium tabular-nums">
            {money(entry.value ?? 0, currency)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function RevenueChart({
  data,
  currency,
}: {
  data: MonthlyTotals[];
  currency: string;
}) {
  const hasAnything = data.some((d) => d.invoiced > 0 || d.paid > 0);

  if (!hasAnything) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        Once you send a few invoices, this is where the last six months show up.
      </p>
    );
  }

  return (
    <>
      {/* Legend: two series, so identity is never carried by colour alone. */}
      <div className="text-muted-foreground mb-3 flex items-center gap-4 text-xs">
        {[
          { label: "Invoiced", color: INVOICED },
          { label: "Received", color: PAID },
        ].map((s) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-2.5 rounded-[2px]"
              style={{ background: s.color }}
            />
            {s.label}
          </span>
        ))}
      </div>

      <div className="h-[200px] w-full sm:h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 4, right: 4, bottom: 0, left: -12 }}
            barGap={2}
          >
            {/* Recessive grid: horizontal only, so bars stay the loudest mark. */}
            <CartesianGrid
              vertical={false}
              stroke="currentColor"
              className="text-border"
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "currentColor" }}
              className="text-muted-foreground"
            />
            <YAxis
              width={44}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "currentColor" }}
              className="text-muted-foreground"
              tickFormatter={(v: number) => compactTick(v, currency)}
            />
            <Tooltip
              cursor={{ fill: "currentColor", className: "text-muted/40" }}
              content={<ChartTooltip currency={currency} />}
            />
            <Bar
              dataKey="invoiced"
              name="Invoiced"
              fill={INVOICED}
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
            <Bar
              dataKey="paid"
              name="Received"
              fill={PAID}
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* The table view: the chart is not the only way to read the numbers. */}
      <details className="mt-3">
        <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs">
          View as table
        </summary>
        <table className="mt-2 w-full text-sm">
          <thead className="text-muted-foreground text-xs">
            <tr>
              <th className="py-1 text-left font-medium">Month</th>
              <th className="py-1 text-right font-medium">Invoiced</th>
              <th className="py-1 text-right font-medium">Received</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {data.map((row) => (
              <tr key={row.month} className="border-t">
                <td className="py-1">{row.label}</td>
                <td className="py-1 text-right">{money(row.invoiced, currency)}</td>
                <td className="py-1 text-right">{money(row.paid, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}
