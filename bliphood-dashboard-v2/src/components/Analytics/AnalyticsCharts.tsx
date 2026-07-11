"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart } from "recharts";
import { fetchDailyMints, fetchStats, fetchPuzzleInfo } from "@/lib/api";
import { HALVING_SUPPLY_MILESTONES } from "@/lib/constants";
import type { DailyMintData } from "@/lib/types";

// Custom tooltip
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-300 border border-white/10 rounded-sm px-3 py-2 shadow-xl">
      <p className="font-mono text-[10px] text-white/30 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="font-mono text-xs" style={{ color: p.color }}>
          {p.name}: {p.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

export function AnalyticsCharts() {
  const [interval, setInterval] = useState<"daily" | "weekly">("daily");
  const [days, setDays] = useState(30);

  const { data: mints } = useQuery({
    queryKey: ["dailyMints", days],
    queryFn: () => fetchDailyMints(days),
    refetchInterval: 30000,
  });

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: () => fetchStats(),
    refetchInterval: 10000,
  });

  const { data: puzzle } = useQuery({
    queryKey: ["puzzle"],
    queryFn: () => fetchPuzzleInfo(),
    refetchInterval: 10000,
  });

  const currentEra = puzzle?.era ?? 0;
  const minedInEra = stats ? stats.totalMinted % 100_000_000 : 0;
  const eraSupplyUsed = minedInEra / 100_000_000 * 100;

  // Supply curve data
  const supplyCurve = HALVING_SUPPLY_MILESTONES.map((milestone, i) => ({
    era: i,
    label: `ERA ${i}`,
    supplyLeft: milestone,
    reward: [20000, 15000, 10000, 5000][i],
    isCompleted: stats ? stats.totalMinted > milestone : false,
    isActive: i === currentEra,
  }));

  return (
    <section className="py-20 px-6 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="font-mono text-xs text-accent tracking-[0.3em] uppercase">03</span>
            <span className="w-px h-4 bg-white/10" />
            <span className="font-mono text-xs text-white/20 tracking-[0.2em] uppercase">Data</span>
          </div>
          <h2 className="font-display text-5xl md:text-7xl text-white leading-none">
            ANALYTICS
          </h2>
          <p className="font-mono text-sm text-white/30 mt-3">
            On-chain mining data, difficulty trends, and supply progression.
          </p>
        </div>

        <div className="flex gap-1 bg-dark-300 rounded-sm p-1 self-start">
          {(["daily", "weekly"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setInterval(mode)}
              className={`px-4 py-2 text-xs font-mono font-semibold transition-all rounded-sm uppercase ${
                interval === mode ? "bg-accent text-black" : "text-white/30 hover:text-white/60"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Charts Grid - Asymmetric */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Mint Volume Chart - spans 3 cols */}
        <div className="lg:col-span-3 border border-white/5 bg-dark-100 rounded-sm p-6">
          <h3 className="font-mono text-xs text-white/30 uppercase tracking-wider mb-6">
            MINT VOLUME — {interval.toUpperCase()}
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={mints}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "rgba(255,255,255,0.2)", fontFamily: "JetBrains Mono" }}
                axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "rgba(255,255,255,0.2)", fontFamily: "JetBrains Mono" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="mints" fill="#00FF88" opacity={0.3} radius={[2, 2, 0, 0]} name="SOLVES" />
              <Line
                type="monotone"
                dataKey="avgSolveMs"
                stroke="#FFFFFF"
                strokeWidth={1.5}
                dot={false}
                strokeOpacity={0.3}
                name="AVG MS"
                yAxisId={1}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Supply Curve - spans 2 cols */}
        <div className="lg:col-span-2 border border-white/5 bg-dark-100 rounded-sm p-6">
          <h3 className="font-mono text-xs text-white/30 uppercase tracking-wider mb-6">
            SUPPLY CURVE
          </h3>
          <div className="space-y-4">
            {supplyCurve.map((era) => (
              <div key={era.era} className="group">
                <div className="flex justify-between items-baseline mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-white/40">{era.label}</span>
                    {era.isActive && (
                      <span className="font-mono text-[10px] bg-accent/15 text-accent px-1.5 py-0.5 rounded-sm animate-pulse-live">ACTIVE</span>
                    )}
                    {era.isCompleted && !era.isActive && (
                      <span className="font-mono text-[10px] text-white/15">✓</span>
                    )}
                  </div>
                  <span className="font-mono text-xs text-accent">{era.reward.toLocaleString()} BLIPHD/SOLVE</span>
                </div>
                <div className="h-8 bg-dark-300 rounded-sm overflow-hidden relative">
                  <div
                    className={`h-full transition-all ${era.isActive ? "bg-gray-to-r from-accent/30 to-accent/60" : era.isCompleted ? "bg-accent/10" : "bg-white/5"}`}
                    style={{ width: era.isCompleted ? "100%" : era.isActive ? `${Math.min(eraSupplyUsed, 100)}%` : "0%" }}
                  />
                  <div className="absolute inset-0 flex items-center px-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${era.isCompleted ? "bg-accent/30" : era.isActive ? "bg-accent animate-pulse-live" : "bg-white/10"}`} />
                      <span className="font-mono text-[10px] text-white/30">
                        {era.isCompleted ? "COMPLETED" : era.isActive ? `${eraSupplyUsed.toFixed(1)}% MINED` : `${era.supplyLeft.toLocaleString()} AT START`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          {stats && (
            <div className="mt-6 pt-6 border-t border-white/5">
              <div className="flex justify-between items-baseline mb-2">
                <span className="font-mono text-[10px] text-white/20 tracking-wider uppercase">TOTAL MINED</span>
                <span className="font-mono text-xs text-accent">{stats.progressPct}%</span>
              </div>
              <div className="h-2 bg-dark-300 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-1000"
                  style={{ width: `${Number(stats.progressPct)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="font-mono text-[10px] text-white/20">{stats.totalMinted.toLocaleString()}</span>
                <span className="font-mono text-[10px] text-white/20">{stats.maxSupply.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Difficulty vs Solve Time - full width, asymmetric */}
        <div className="lg:col-span-5 border border-white/5 bg-dark-100 rounded-sm p-6">
          <h3 className="font-mono text-xs text-white/30 uppercase tracking-wider mb-6">
            DIFFICULTY × SOLVE TIME — SCATTER
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={mints}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "rgba(255,255,255,0.2)", fontFamily: "JetBrains Mono" }}
                axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 10, fill: "rgba(255,255,255,0.2)", fontFamily: "JetBrains Mono" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10, fill: "rgba(255,255,255,0.2)", fontFamily: "JetBrains Mono" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="difficulty"
                stroke="#FFAA00"
                strokeWidth={2}
                dot={false}
                name="DIFFICULTY"
                yAxisId="right"
              />
              <Area
                type="monotone"
                dataKey="avgSolveMs"
                stroke="#00FF88"
                fill="rgba(0,255,136,0.05)"
                strokeWidth={2}
                dot={false}
                name="AVG SOLVE MS"
                yAxisId="left"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
