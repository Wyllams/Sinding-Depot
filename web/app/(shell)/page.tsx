"use client";

import { TopBar } from "../../components/TopBar";

// =============================================
// BuildFlow Dashboard - React/Next.js version
// Ported from Stitch HTML design (DASHBOARD.txt)
// =============================================

const projects = [
  {
    name: "Zenith Heights Phase II",
    location: "Austin, TX",
    startDate: "Oct 12, 2024",
    client: "Nexus Real Estate",
    budget: "$12.4M",
    status: "In Review",
    statusColor: "tertiary",
    manager: "Sarah Jenkins",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCAr49BTqxnBNk3ZbuUU5LnvdhRxtmDjgUmbYR16gpZXv1hoaIYD5sfN9_V_7TsWcUaeEMZtBrHgfURSBUjuxD0gNOf2z_nY1pk2KU1lIWU2imiVnJLieYSduIO74OGqodWpU_KWHlkkGGXFuvt_HLKpPSRFaVn4q7HMnjc5Teq06PxtPs4eJy75F7nQgDtJOsneoYEKTyiHHg1dBYy-MTmcyi7P5ohobg31xjjxE5JYtPvAVLxJ3fumIzqLIdSuxIFoGQSnXryaFo",
  },
  {
    name: "Harbor Bridge Renovation",
    location: "Miami, FL",
    startDate: "Nov 04, 2024",
    client: "Coastal Authorities",
    budget: "$4.8M",
    status: "Planning",
    statusColor: "secondary",
    manager: "David Chen",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuBdKiFohH6tuKyjMA3re5OJERUZbLHyRy6HmSCoNx-1pwtFU1vdX2xqkawE-Dv7eIPSHRSZ6dTDhZsFRK-TNE9kil1ldQqHxyv6fXscAcBypMPNCfzfAPBEvJRJQ0wBpxnk2MyKkajDnAagwqR_RD0QrlF70PYumB9oWbgEC4aq_xwNv3Dn5-bJBbu3ec5JvhEU039BSRca-cdUqopdGJG87OpDvIHg56ivvkqYvSLtH3qz4hMlGkA4-w6wvF87rK4EQ4_io8symBg",
  },
  {
    name: "Eco-Park Logistics Hub",
    location: "Seattle, WA",
    startDate: "Dec 01, 2024",
    client: "Green Global Inc.",
    budget: "$32.0M",
    status: "Pending",
    statusColor: "neutral",
    manager: "Elena Rodriguez",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuD8txlBQQHc_KmiSRefMVYqtrzvt6Hzgxxowg165D-uRX6dL61XOwpOb-A5O5SxcqI5SLskgLA6Wgi8jv8iPjs1THiIpe4kSjxB4-PZclB0NcTg1dHbVca7bKWRx-oQz-YsLynj5FhrwvKLiZZKU66eZtp40D5yIX3tJ6BeNTUUlbRiMeCnzo-_D0nCR7xybY5EJYi_WZ35IbPt3MyxVGp6fzGr-V-djNoR3CYIltu9lId8E2xQTelykXmqcVMMb8gyu4vdcegAGq0",
  },
  {
    name: "The Pinnacle Residences",
    location: "Chicago, IL",
    startDate: "Jan 15, 2025",
    client: "Vantage Living",
    budget: "$18.2M",
    status: "In Review",
    statusColor: "tertiary",
    manager: "Michael Watts",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAx6be4T46k3P_itQKrnBTzprvwAKOHTtPfPOe9Xf8vbm_ZspFsT30eXLMqd5YRV2W5eD7PXNvBoo_t0Cc--f02CQPN2hEU7Y5-STS9DBMNskc5vwqE2UXtlSSjGRqHoW_vq_wt1qwYim7BSAF7skNqCGx2y5QWEI0AvfNZj_WlfaAxM37TQVR3xDClqkBXE2L6_BNWv3DRElDUw08-5eXtCz14xcspvbO25M1MHj9FdQ0XVT2AE41-chaptZLjO098kvIgYgNkSlM",
  },
];

const statusBadge: Record<string, string> = {
  tertiary: "bg-[#fdeb54] text-[#5f5600]",
  secondary: "bg-[#5e6300] text-[#f9ff8b]",
  neutral: "bg-[#242624] text-[#ababa8]",
};

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
            Overview
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

        {/* ── Project Table ── */}
        <div className="bg-[#121412] rounded-3xl overflow-hidden border border-[#474846]/15">
          <div className="px-8 py-6 flex justify-between items-center bg-[#181a18]/50">
            <h3
              className="text-xl font-bold tracking-tight"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              Upcoming Projects
            </h3>
            <button className="text-[#aeee2a] hover:bg-[#aeee2a]/10 px-4 py-2 rounded-lg text-sm font-bold transition-colors">
              View All Schedule
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1e201e]/30">
                  {["Project Name", "Location", "Start Date", "Client", "Budget", "Status", "Manager"].map(
                    (col) => (
                      <th
                        key={col}
                        className="px-6 py-4 text-[10px] font-bold tracking-[0.1em] text-[#ababa8] uppercase first:px-8 last:px-8"
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#474846]/10">
                {projects.map((p) => (
                  <tr key={p.name} className="hover:bg-[#1e201e] transition-colors">
                    <td className="px-8 py-5 font-bold text-sm">{p.name}</td>
                    <td className="px-6 py-5 text-sm text-[#ababa8]">{p.location}</td>
                    <td className="px-6 py-5 text-sm text-[#ababa8]">{p.startDate}</td>
                    <td className="px-6 py-5 text-sm font-medium">{p.client}</td>
                    <td className="px-6 py-5 text-sm font-bold text-[#aeee2a]">{p.budget}</td>
                    <td className="px-6 py-5">
                      <span
                        className={`px-3 py-1 text-[10px] font-bold rounded-full ${statusBadge[p.statusColor]}`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#242624] border border-[#474846]/30 overflow-hidden">
                          <img className="w-full h-full object-cover" src={p.avatar} alt={p.manager} />
                        </div>
                        <span className="text-xs font-medium">{p.manager}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
