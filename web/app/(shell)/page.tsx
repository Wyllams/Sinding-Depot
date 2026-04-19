"use client";

import { TopBar } from "../../components/TopBar";
import { WeeklyWeather } from "../../components/WeeklyWeather";

// =============================================
// BuildFlow Dashboard - React/Next.js version
// Ported from Stitch HTML design (DASHBOARD.txt)
// =============================================



export default function Dashboard() {
  return (
    <>
      <TopBar />

      {/* Main Canvas */}
      <main className="px-4 sm:px-6 lg:px-8 pb-12 pt-6 sm:pt-8">
        {/* Page Title */}
        <div className="mb-8">
          <h2
            className="text-2xl sm:text-4xl font-extrabold tracking-tighter text-[#faf9f5]"
            style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
          >
            Dashboard
          </h2>
          <p className="text-[#ababa8]">Global project metrics and operational health.</p>
        </div>

        {/* ── Bento Grid Metrics ── */}
        <div className="grid grid-cols-12 gap-4 sm:gap-6 mb-8 sm:mb-10">

          {/* Card 1: Active Projects */}
          <div className="col-span-12 lg:col-span-4 glass-card rounded-2xl p-6 border-t border-white/5">
            <div className="flex justify-between items-start mb-6">
              <span className="text-[11px] font-bold tracking-[0.2em] text-[#ababa8] uppercase">
                Active Projects
              </span>
              <span className="material-symbols-outlined text-[#aeee2a]" translate="no">analytics</span>
            </div>
            <div className="flex items-baseline gap-2 mb-4">
              <span
                className="text-4xl font-extrabold"
                style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
              >
                24
              </span>
              <span className="text-[#ababa8] font-medium">projects</span>
            </div>

            {/* Mini Bar Chart */}
            <div className="relative h-[80px] w-full mb-4 overflow-hidden rounded-lg bg-[#181a18]">
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, transparent 50%, rgba(174,238,42,0.1) 50%), linear-gradient(0deg, transparent 50%, rgba(174,238,42,0.1) 50%)",
                  backgroundSize: "10px 10px",
                }}
              />
              <div className="absolute bottom-0 left-0 w-full h-[60%] flex items-end px-2 gap-1">
                <div className="bg-[#aeee2a]/20 w-full h-[40%] rounded-t-sm" />
                <div className="bg-[#aeee2a]/40 w-full h-[70%] rounded-t-sm" />
                <div className="bg-[#aeee2a] w-full h-[55%] rounded-t-sm" />
                <div className="bg-[#aeee2a] w-full h-[90%] rounded-t-sm" />
                <div className="bg-[#aeee2a]/60 w-full h-[45%] rounded-t-sm" />
                <div className="bg-[#aeee2a] w-full h-[75%] rounded-t-sm" />
                <div
                  className="bg-[#aeee2a] w-full h-[100%] rounded-t-sm"
                  style={{ boxShadow: "0 0 15px rgba(174,238,42,0.5)" }}
                />
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[#ababa8]">Fleet Utilization</span>
                <span className="text-[#aeee2a] font-bold">88%</span>
              </div>
              <div className="h-1.5 w-full bg-[#242624] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#aeee2a] w-[88%]"
                  style={{ boxShadow: "0 0 8px rgba(174,238,42,0.6)" }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Pending Change Orders */}
          <div className="col-span-12 lg:col-span-5 glass-card rounded-2xl p-6 border-t border-white/5 relative overflow-hidden">
            <div className="flex justify-between items-start mb-6">
              <span className="text-[11px] font-bold tracking-[0.2em] text-[#ababa8] uppercase">
                Pending Change Orders
              </span>
              <span className="px-3 py-1 bg-[#5e6300] text-[#f9ff8b] text-[10px] font-bold rounded-full">
                Highlighted
              </span>
            </div>
            <div className="flex flex-col gap-1 mb-8">
              <div className="flex items-baseline gap-2">
                <span
                  className="text-4xl font-extrabold"
                  style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                >
                  17
                </span>
                <span className="text-[#ababa8] font-medium">orders</span>
              </div>
              <span
                className="text-[#aeee2a] text-2xl font-bold"
                style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
              >
                $89,450
              </span>
              <span className="text-xs text-[#ababa8]">Total Value Pending Approval</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#1e201e] rounded-xl">
                <p className="text-[10px] text-[#ababa8] uppercase font-bold mb-1">Average Wait</p>
                <p
                  className="text-lg font-bold"
                  style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                >
                  4.2 Days
                </p>
              </div>
              <div className="p-4 bg-[#1e201e] rounded-xl">
                <p className="text-[10px] text-[#ababa8] uppercase font-bold mb-1">Impact Risk</p>
                <p
                  className="text-lg font-bold text-[#e3eb5d]"
                  style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                >
                  Medium
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: Blocking Issues */}
          <div className="col-span-12 lg:col-span-3 glass-card rounded-2xl p-6 border-t border-white/5">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[11px] font-bold tracking-[0.2em] text-[#ababa8] uppercase">
                Blocking Issues
              </span>
              <span
                className="material-symbols-outlined text-[#ff7351]"
                translate="no"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                warning
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-6">
              <span
                className="text-4xl font-extrabold text-[#ff7351]"
                style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
              >
                9
              </span>
              <span className="text-[#ababa8] font-medium">critical issues</span>
            </div>
            <div className="space-y-4">
              {[
                { icon: "plumbing", label: "MEP Team", width: "75%" },
                { icon: "construction", label: "Structural Eng.", width: "50%" },
                { icon: "electric_bolt", label: "Grid Systems", width: "25%", green: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#242624] flex items-center justify-center">
                    <span
                      className="material-symbols-outlined text-sm text-[#ababa8]"
                      translate="no"
                    >
                      {item.icon}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold">{item.label}</p>
                    <div className="h-1 w-full bg-[#242624] rounded-full mt-1">
                      <div
                        className={`h-full rounded-full ${item.green ? "bg-[#aeee2a]" : "bg-[#ff7351]"}`}
                        style={{ width: item.width }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Weekly Weather Forecast ── */}
        <WeeklyWeather />
      </main>
    </>
  );
}
