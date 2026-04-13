"use client";

import { useState } from "react";
import { TopBar } from "../../../components/TopBar";
import CustomDatePicker from "../../../components/CustomDatePicker";

// =============================================
// Crews & Partners Directory
// =============================================

type CrewStatus = "Available" | "Opening Soon" | "Booked Out";

interface DailyCapacity {
  dayLabel: string;
  percentage: number;
  state: "free" | "partial" | "booked";
}

interface AssignedJob {
  id: string;
  client: string;
  address: string;
  startDate: string;
  endDate: string;
  status: "Active" | "Scheduled";
}

interface CompletedJob {
  id: string;
  client: string;
  completedDate: string;
  duration: string;
  rating: number;
}

interface Crew {
  id: string;
  name: string;
  size: number;
  rating: number;
  overallLoad: number;
  status: CrewStatus;
  skills: string[];
  weekCapacity: DailyCapacity[];
  assignedJobs: AssignedJob[];
  completedJobs: CompletedJob[];
}

interface ServiceCategory {
  id: string;
  label: string;
  icon: string;
  accentColor: string;
  crews: Crew[];
}

// ─── Helpers ────────────────────────────────
const mkWeek = (loads: number[]): DailyCapacity[] => {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  return loads.map((p, i) => ({
    dayLabel: days[i],
    percentage: p,
    state: p >= 90 ? "booked" : p >= 50 ? "partial" : "free",
  }));
};

// ─── Mock Projects (para o Assign Job) ───────
const PROJECTS = [
  { id: "#1402", client: "Modern Homes LLC",  address: "234 Oak Ave, Atlanta" },
  { id: "#1399", client: "Modern Homes LLC",  address: "890 Elm St, Decatur" },
  { id: "#1398", client: "Apex Dev",           address: "12 Builder Rd, Marietta" },
  { id: "#1397", client: "Zenith Group",        address: "456 Pine St, Roswell" },
  { id: "#1396", client: "Riverdale Co.",       address: "78 Cedar Ln, Sandy Springs" },
];

// ─── Real Data ──────────────────────────────
const serviceCategories: ServiceCategory[] = [
  {
    id: "siding",
    label: "Siding Crews",
    icon: "home_work",
    accentColor: "#aeee2a",
    crews: [
      {
        id: "xicara-01",
        name: "XICARA",
        size: 5,
        rating: 4.9,
        overallLoad: 85,
        status: "Available",
        skills: ["VINYL SIDING", "HARDIEPLANK"],
        weekCapacity: mkWeek([100, 100, 60, 40, 80, 0, 0]),
        assignedJobs: [
          { id: "#1402", client: "Modern Homes LLC", address: "234 Oak Ave, Atlanta", startDate: "2026-04-14", endDate: "2026-04-18", status: "Active" },
          { id: "#1396", client: "Riverdale Co.", address: "78 Cedar Ln, Sandy Springs", startDate: "2026-04-21", endDate: "2026-04-25", status: "Scheduled" },
        ],
        completedJobs: [
          { id: "#1380", client: "Harbor Plaza", completedDate: "Mar 28, 2026", duration: "5 days", rating: 5.0 },
          { id: "#1365", client: "Apex Dev", completedDate: "Mar 10, 2026", duration: "4 days", rating: 4.8 },
        ],
      },
      {
        id: "xicara-02",
        name: "XICARA 2",
        size: 4,
        rating: 4.7,
        overallLoad: 100,
        status: "Booked Out",
        skills: ["CEDAR SHAKES", "VINYL SIDING"],
        weekCapacity: mkWeek([100, 100, 100, 100, 100, 60, 0]),
        assignedJobs: [
          { id: "#1399", client: "Modern Homes LLC", address: "890 Elm St, Decatur", startDate: "2026-04-07", endDate: "2026-04-19", status: "Active" },
        ],
        completedJobs: [
          { id: "#1370", client: "Zenith Group", completedDate: "Mar 20, 2026", duration: "7 days", rating: 4.7 },
        ],
      },
      {
        id: "wilmar-01",
        name: "WILMAR",
        size: 6,
        rating: 4.8,
        overallLoad: 70,
        status: "Available",
        skills: ["HARDIEPLANK", "OSHA 30"],
        weekCapacity: mkWeek([80, 60, 100, 40, 60, 0, 0]),
        assignedJobs: [],
        completedJobs: [
          { id: "#1375", client: "Riverdale Co.", completedDate: "Apr 02, 2026", duration: "6 days", rating: 4.9 },
        ],
      },
      {
        id: "wilmar-02",
        name: "WILMAR 2",
        size: 5,
        rating: 4.6,
        overallLoad: 40,
        status: "Opening Soon",
        skills: ["VINYL SIDING"],
        weekCapacity: mkWeek([30, 50, 40, 20, 0, 0, 0]),
        assignedJobs: [],
        completedJobs: [],
      },
      {
        id: "sula",
        name: "SULA",
        size: 3,
        rating: 4.5,
        overallLoad: 55,
        status: "Available",
        skills: ["VINYL SIDING", "SAFETY CERTIFIED"],
        weekCapacity: mkWeek([60, 60, 40, 80, 0, 0, 0]),
        assignedJobs: [],
        completedJobs: [
          { id: "#1355", client: "Harbor Plaza", completedDate: "Feb 18, 2026", duration: "3 days", rating: 4.5 },
        ],
      },
      {
        id: "luis",
        name: "LUIS",
        size: 3,
        rating: 4.4,
        overallLoad: 30,
        status: "Available",
        skills: ["HARDIEPLANK"],
        weekCapacity: mkWeek([20, 40, 30, 20, 0, 0, 0]),
        assignedJobs: [],
        completedJobs: [],
      },
    ],
  },
  {
    id: "windows-doors",
    label: "Doors / Windows",
    icon: "sensor_door",
    accentColor: "#60b8f5",
    crews: [
      {
        id: "sergio",
        name: "SERGIO",
        size: 4,
        rating: 4.9,
        overallLoad: 90,
        status: "Available",
        skills: ["WINDOWS INSTALL", "DOORS", "SAFETY CERTIFIED"],
        weekCapacity: mkWeek([100, 80, 100, 80, 100, 0, 0]),
        assignedJobs: [
          { id: "#1397", client: "Zenith Group", address: "456 Pine St, Roswell", startDate: "2026-04-14", endDate: "2026-04-16", status: "Active" },
        ],
        completedJobs: [
          { id: "#1360", client: "Modern Homes LLC", completedDate: "Mar 15, 2026", duration: "2 days", rating: 5.0 },
        ],
      },
    ],
  },
  {
    id: "paint",
    label: "Paint Crews",
    icon: "format_paint",
    accentColor: "#f5a623",
    crews: [
      {
        id: "osvin-01",
        name: "OSVIN",
        size: 4,
        rating: 4.8,
        overallLoad: 75,
        status: "Available",
        skills: ["EXTERIOR PAINT", "SPRAY"],
        weekCapacity: mkWeek([100, 60, 80, 80, 60, 0, 0]),
        assignedJobs: [],
        completedJobs: [
          { id: "#1368", client: "Apex Dev", completedDate: "Mar 25, 2026", duration: "5 days", rating: 4.8 },
        ],
      },
      {
        id: "osvin-02",
        name: "OSVIN 2",
        size: 3,
        rating: 4.6,
        overallLoad: 100,
        status: "Booked Out",
        skills: ["EXTERIOR PAINT", "ROLLER"],
        weekCapacity: mkWeek([100, 100, 100, 100, 100, 80, 0]),
        assignedJobs: [
          { id: "#1398", client: "Apex Dev", address: "12 Builder Rd, Marietta", startDate: "2026-04-07", endDate: "2026-04-19", status: "Active" },
        ],
        completedJobs: [],
      },
      {
        id: "victor",
        name: "VICTOR",
        size: 3,
        rating: 4.7,
        overallLoad: 60,
        status: "Available",
        skills: ["EXTERIOR PAINT", "TRIM WORK"],
        weekCapacity: mkWeek([80, 40, 60, 80, 40, 0, 0]),
        assignedJobs: [],
        completedJobs: [
          { id: "#1350", client: "Riverdale Co.", completedDate: "Feb 10, 2026", duration: "4 days", rating: 4.7 },
        ],
      },
      {
        id: "juan",
        name: "JUAN",
        size: 2,
        rating: 4.5,
        overallLoad: 50,
        status: "Available",
        skills: ["EXTERIOR PAINT"],
        weekCapacity: mkWeek([60, 60, 20, 60, 60, 0, 0]),
        assignedJobs: [],
        completedJobs: [],
      },
    ],
  },
  {
    id: "gutters",
    label: "Gutters",
    icon: "water_drop",
    accentColor: "#c084fc",
    crews: [
      {
        id: "leandro",
        name: "LEANDRO",
        size: 3,
        rating: 4.4,
        overallLoad: 35,
        status: "Available",
        skills: ["GUTTERS", "DOWNSPOUTS"],
        weekCapacity: mkWeek([40, 20, 60, 20, 0, 0, 0]),
        assignedJobs: [],
        completedJobs: [
          { id: "#1345", client: "Harbor Plaza", completedDate: "Jan 30, 2026", duration: "2 days", rating: 4.4 },
        ],
      },
    ],
  },
  {
    id: "roofing",
    label: "Roofing",
    icon: "roofing",
    accentColor: "#fb923c",
    crews: [
      {
        id: "josue",
        name: "JOSUE",
        size: 2,
        rating: 4.3,
        overallLoad: 20,
        status: "Available",
        skills: ["ROOFING", "SHINGLES"],
        weekCapacity: mkWeek([20, 20, 20, 20, 0, 0, 0]),
        assignedJobs: [],
        completedJobs: [],
      },
    ],
  },
];

// ─── Visual Helpers ────────────
const getStatusDot = (status: CrewStatus) => {
  if (status === "Available") return "bg-[#aeee2a]";
  if (status === "Booked Out") return "bg-[#ff7351]";
  return "bg-[#eedc47]";
};

const getLoadLabel = (load: number) => {
  if (load >= 90) return "text-[#ff7351]";
  if (load >= 60) return "text-[#aeee2a]";
  return "text-[#eedc47]";
};

const getBarColor = (state: DailyCapacity["state"]) => {
  if (state === "booked") return "bg-[#ff7351]";
  if (state === "partial") return "bg-[#eedc47]";
  return "bg-[#aeee2a]";
};

// ─── Crew Card Component ────────────
function CrewCard({
  crew,
  accentColor,
  onViewDetails,
  onAssignJob,
}: {
  crew: Crew;
  accentColor: string;
  onViewDetails: (crew: Crew) => void;
  onAssignJob: (crew: Crew) => void;
}) {
  return (
    <div className="bg-[#121412] rounded-2xl p-6 border border-[#242624] flex flex-col hover:border-[#474846]/60 transition-colors duration-300 min-h-[420px]">

      {/* Header */}
      <div className="flex justify-between items-start mb-5">
        <div>
          <h3
            className="text-2xl font-black text-[#faf9f5] tracking-wide leading-tight"
            style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
          >
            {crew.name}
          </h3>
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${getStatusDot(crew.status)}`} />
            <span className="text-[10px] font-black text-[#ababa8] uppercase tracking-widest">{crew.status}</span>
          </div>
        </div>
        <button className="text-[#ababa8] hover:text-[#faf9f5] transition-colors mt-1">
          <span className="material-symbols-outlined" translate="no">more_vert</span>
        </button>
      </div>

      {/* Skills */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {crew.skills.map((skill, i) => (
          <span
            key={i}
            className="px-2.5 py-1 bg-[#242624] text-[#ababa8] text-[9px] font-black uppercase tracking-wide rounded-full"
          >
            {skill}
          </span>
        ))}
      </div>

      {/* Capacity Section */}
      <div className="mt-auto">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] font-black text-[#ababa8] tracking-widest uppercase">Weekly Capacity</span>
          <span className={`text-xs font-black uppercase ${getLoadLabel(crew.overallLoad)}`}>
            {crew.overallLoad}% Busy
          </span>
        </div>

        {/* Bar Chart M-T-W-T-F-S-S */}
        <div className="flex items-end gap-1.5 h-14 mb-1">
          {crew.weekCapacity.map((day, idx) => {
            const barH = Math.max((day.percentage / 100) * 100, 12);
            return (
              <div key={idx} className="flex flex-col items-center flex-1">
                <div className="w-full bg-[#1e201e] rounded-sm flex items-end h-full">
                  <div
                    className={`w-full rounded-sm transition-all duration-700 ${getBarColor(day.state)}`}
                    style={{ height: `${barH}%` }}
                  />
                </div>
                <span className="text-[9px] text-[#3a3c3a] font-bold mt-1">{day.dayLabel}</span>
              </div>
            );
          })}
        </div>

        {/* CTAs */}
        <div className="flex gap-2 mt-5">
          <button
            onClick={() => onViewDetails(crew)}
            className="flex-1 py-2.5 border border-[#474846]/40 rounded-xl text-[10px] font-black text-[#faf9f5] hover:bg-[#181a18] transition-colors uppercase tracking-widest"
          >
            View Details
          </button>
          <button
            onClick={() => onAssignJob(crew)}
            className="flex-1 py-2.5 rounded-xl text-[10px] font-black text-[#121412] uppercase tracking-widest hover:brightness-110 transition-all active:scale-95"
            style={{ backgroundColor: accentColor }}
          >
            Assign Job
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-5 pt-4 border-t border-[#242624] flex justify-between items-center">
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[13px] text-[#ababa8]" translate="no">group</span>
          <span className="text-[10px] font-bold text-[#ababa8]">{crew.size} Members</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px] text-[#aeee2a]" translate="no">star</span>
          <span className="text-[11px] font-bold text-[#faf9f5]">{crew.rating.toFixed(1)}</span>
        </div>
      </div>

    </div>
  );
}

// ─── Main Page ────────────
export default function CrewsPage() {
  const [categories, setCategories] = useState<ServiceCategory[]>(serviceCategories);

  // ── Add Partner Modal ──
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [targetCategory, setTargetCategory] = useState<ServiceCategory | null>(null);

  // ── View Details Modal ──
  const [detailCrew, setDetailCrew] = useState<Crew | null>(null);

  // ── Assign Job Modal ──
  const [assignCrew, setAssignCrew] = useState<Crew | null>(null);
  const [assignProjectId, setAssignProjectId] = useState("");
  const [assignStart, setAssignStart] = useState("");
  const [assignEnd,   setAssignEnd]   = useState("");
  const [assignSuccess, setAssignSuccess] = useState(false);

  const totalCrews = categories.reduce((acc, c) => acc + c.crews.length, 0);

  const openAddModal = (cat: ServiceCategory) => { setTargetCategory(cat); setIsAddModalOpen(true); };
  const closeAddModal = () => { setIsAddModalOpen(false); setTargetCategory(null); };

  const closeDetailModal = () => setDetailCrew(null);

  const openAssignModal = (crew: Crew) => {
    setAssignCrew(crew);
    setAssignProjectId("");
    setAssignStart("");
    setAssignEnd("");
    setAssignSuccess(false);
  };
  const closeAssignModal = () => { setAssignCrew(null); setAssignSuccess(false); };

  const handleConfirmAssign = () => {
    if (!assignProjectId || !assignStart || !assignEnd || !assignCrew) return;
    const project = PROJECTS.find((p) => p.id === assignProjectId);
    if (!project) return;

    // Add to crew's assignedJobs
    const newJob: AssignedJob = {
      id: assignProjectId,
      client: project.client,
      address: project.address,
      startDate: assignStart,
      endDate: assignEnd,
      status: "Scheduled",
    };

    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        crews: cat.crews.map((c) =>
          c.id === assignCrew.id
            ? { ...c, assignedJobs: [...c.assignedJobs, newJob] }
            : c
        ),
      }))
    );

    setAssignSuccess(true);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <TopBar />

      <div className="flex-1 overflow-auto p-6 md:p-10 lg:p-14">

        {/* Page Header */}
        <div className="max-w-[1600px] mx-auto w-full mb-12">
          <h1
            className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2"
            style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
          >
            Crews & Partners <span className="text-[#aeee2a]">Directory</span>
          </h1>
          <p className="text-[#ababa8] text-sm font-medium">
            {totalCrews} active partners across {categories.length} service disciplines
          </p>
        </div>

        {/* Service Category Sections */}
        <div className="max-w-[1600px] mx-auto w-full space-y-14 pb-24">
          {categories.map((cat) => (
            <section key={cat.id}>

              {/* Category Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#1e201e]">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${cat.accentColor}18`, border: `1px solid ${cat.accentColor}30` }}
                  >
                    <span
                      className="material-symbols-outlined text-xl"
                      style={{ color: cat.accentColor }}
                      translate="no"
                    >
                      {cat.icon}
                    </span>
                  </div>
                  <div>
                    <h2
                      className="text-lg font-black text-[#faf9f5] uppercase tracking-widest"
                      style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                    >
                      {cat.label}
                    </h2>
                    <p className="text-[10px] text-[#ababa8] font-bold uppercase tracking-widest mt-0.5">
                      {cat.crews.length} {cat.crews.length === 1 ? "Partner" : "Partners"} Active
                    </p>
                  </div>
                </div>

                {/* Add Crew Button */}
                <button
                  onClick={() => openAddModal(cat)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors group"
                  style={{
                    backgroundColor: `${cat.accentColor}12`,
                    border: `1px solid ${cat.accentColor}25`,
                    color: cat.accentColor,
                  }}
                >
                  <span className="material-symbols-outlined text-[16px] group-hover:rotate-90 transition-transform duration-300" translate="no">add</span>
                  Add Partner
                </button>
              </div>

              {/* Crew Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {cat.crews.map((crew) => (
                  <CrewCard
                    key={crew.id}
                    crew={crew}
                    accentColor={cat.accentColor}
                    onViewDetails={setDetailCrew}
                    onAssignJob={openAssignModal}
                  />
                ))}
              </div>

            </section>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          VIEW DETAILS MODAL
      ══════════════════════════════════════════════════ */}
      {detailCrew && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={closeDetailModal}
        >
          <div
            className="bg-[#121412] w-full max-w-lg rounded-2xl border border-[#242624] shadow-2xl flex flex-col overflow-hidden"
            style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-[#242624] flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black text-[#faf9f5]">{detailCrew.name}</h2>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${getStatusDot(detailCrew.status)}`} />
                  <span className="text-[10px] font-bold text-[#ababa8] uppercase tracking-widest">{detailCrew.status}</span>
                </div>
              </div>
              <button onClick={closeDetailModal} className="text-[#ababa8] hover:text-[#faf9f5] transition-colors">
                <span className="material-symbols-outlined" translate="no">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">

              {/* Weekly Availability */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#ababa8] mb-3">Weekly Availability</p>
                <div className="flex items-end gap-1.5 h-12">
                  {detailCrew.weekCapacity.map((day, idx) => {
                    const free = 100 - day.percentage;
                    return (
                      <div key={idx} className="flex flex-col items-center flex-1">
                        <div className="w-full bg-[#1e201e] rounded-sm flex items-end h-full">
                          <div
                            className={`w-full rounded-sm ${getBarColor(day.state)}`}
                            style={{ height: `${Math.max((day.percentage / 100) * 100, 8)}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-[#474846] font-bold mt-1">{day.dayLabel}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#aeee2a]"/><span className="text-[9px] text-[#ababa8]">Free</span></div>
                  <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#eedc47]"/><span className="text-[9px] text-[#ababa8]">Partial</span></div>
                  <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#ff7351]"/><span className="text-[9px] text-[#ababa8]">Booked</span></div>
                </div>
              </div>

              {/* Assigned Jobs */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#ababa8] mb-3">
                  Assigned Jobs ({detailCrew.assignedJobs.length})
                </p>
                {detailCrew.assignedJobs.length === 0 ? (
                  <div className="rounded-xl bg-[#1e201e] px-4 py-4 text-center text-[11px] text-[#474846] font-bold">
                    No active assignments
                  </div>
                ) : (
                  <div className="space-y-2">
                    {detailCrew.assignedJobs.map((job) => (
                      <div
                        key={job.id}
                        className="rounded-xl bg-[#1a1c1a] border border-[#242624] px-4 py-3 flex justify-between items-center gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-[#aeee2a]">{job.id}</span>
                            <span
                              className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                                job.status === "Active"
                                  ? "bg-[#aeee2a]/15 text-[#aeee2a]"
                                  : "bg-[#e3eb5d]/15 text-[#e3eb5d]"
                              }`}
                            >
                              {job.status}
                            </span>
                          </div>
                          <p className="text-[11px] font-bold text-[#faf9f5] mt-0.5">{job.client}</p>
                          <p className="text-[10px] text-[#474846] mt-0.5">{job.address}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[9px] text-[#ababa8] font-bold">{job.startDate}</p>
                          <span className="text-[9px] text-[#474846]">→</span>
                          <p className="text-[9px] text-[#ababa8] font-bold">{job.endDate}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Completed Jobs */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#ababa8] mb-3">
                  Completed Jobs ({detailCrew.completedJobs.length})
                </p>
                {detailCrew.completedJobs.length === 0 ? (
                  <div className="rounded-xl bg-[#1e201e] px-4 py-4 text-center text-[11px] text-[#474846] font-bold">
                    No completed jobs yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {detailCrew.completedJobs.map((job) => (
                      <div
                        key={job.id}
                        className="rounded-xl bg-[#1a1c1a] border border-[#242624] px-4 py-3 flex justify-between items-center"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-[#ababa8]">{job.id}</span>
                            <span className="text-[9px] font-bold text-[#474846]">{job.duration}</span>
                          </div>
                          <p className="text-[11px] font-bold text-[#faf9f5] mt-0.5">{job.client}</p>
                          <p className="text-[10px] text-[#474846]">{job.completedDate}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px] text-[#aeee2a]" translate="no">star</span>
                          <span className="text-[11px] font-black text-[#faf9f5]">{job.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="p-5 border-t border-[#242624] bg-[#0a0a0a] flex justify-end">
              <button
                onClick={closeDetailModal}
                className="px-6 py-2.5 text-xs font-black uppercase tracking-widest text-[#faf9f5] bg-[#242624] hover:bg-[#2a2c2a] rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ASSIGN JOB MODAL
      ══════════════════════════════════════════════════ */}
      {assignCrew && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={closeAssignModal}
        >
          <div
            className="bg-[#121412] w-full max-w-md rounded-2xl border border-[#242624] shadow-2xl flex flex-col overflow-hidden"
            style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-[#242624] flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black text-[#faf9f5]">Assign Job</h2>
                <p className="text-[10px] text-[#ababa8] mt-0.5 uppercase tracking-widest">
                  Partner: <span className="text-[#aeee2a] font-black">{assignCrew.name}</span>
                </p>
              </div>
              <button onClick={closeAssignModal} className="text-[#ababa8] hover:text-[#faf9f5] transition-colors">
                <span className="material-symbols-outlined" translate="no">close</span>
              </button>
            </div>

            {assignSuccess ? (
              /* ── Success State ── */
              <div className="p-10 flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[#aeee2a]/15 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#aeee2a] text-4xl" translate="no">check_circle</span>
                </div>
                <div className="text-center">
                  <p className="text-lg font-black text-[#faf9f5]">Job Assigned!</p>
                  <p className="text-sm text-[#ababa8] mt-1">
                    <span className="text-[#aeee2a] font-bold">{assignCrew.name}</span> was added to the Operational Schedule.
                  </p>
                </div>
                <button
                  onClick={closeAssignModal}
                  className="mt-2 px-8 py-2.5 bg-[#aeee2a] text-[#121412] text-xs font-black uppercase tracking-widest rounded-xl hover:brightness-110 transition-all active:scale-95"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                {/* Body */}
                <div className="p-6 space-y-5">

                  {/* Project selection */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#ababa8] mb-2">
                      Select Project
                    </label>
                    <select
                      value={assignProjectId}
                      onChange={(e) => setAssignProjectId(e.target.value)}
                      className="w-full bg-[#181a18] border border-[#474846]/30 rounded-xl px-4 py-3 text-sm text-[#faf9f5] focus:outline-none focus:border-[#aeee2a]/50 transition-all appearance-none cursor-pointer"
                    >
                      <option value="">— Choose a job —</option>
                      {PROJECTS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.id} · {p.client}
                        </option>
                      ))}
                    </select>
                    {assignProjectId && (
                      <p className="text-[10px] text-[#474846] mt-1.5 pl-1">
                        {PROJECTS.find((p) => p.id === assignProjectId)?.address}
                      </p>
                    )}
                  </div>

                  {/* Date range */}
                  <div className="grid grid-cols-2 gap-4">
                    <CustomDatePicker
                      label="Start Date"
                      value={assignStart}
                      onChange={setAssignStart}
                      placeholder="Start"
                      disableSundays={true}
                    />
                    <CustomDatePicker
                      label="End Date"
                      value={assignEnd}
                      onChange={setAssignEnd}
                      placeholder="End"
                      disableSundays={true}
                      alignRight={true}
                    />
                  </div>

                  {/* Summary preview */}
                  {assignProjectId && assignStart && assignEnd && (
                    <div className="rounded-xl bg-[#aeee2a]/5 border border-[#aeee2a]/15 px-4 py-3 space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#aeee2a]">Assignment Preview</p>
                      <p className="text-[11px] text-[#faf9f5] font-bold">
                        {assignCrew.name} → Job {assignProjectId}
                      </p>
                      <p className="text-[10px] text-[#ababa8]">{assignStart} → {assignEnd}</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-[#242624] bg-[#0a0a0a] flex justify-end gap-3">
                  <button
                    onClick={closeAssignModal}
                    className="px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-[#faf9f5] hover:bg-[#181a18] rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmAssign}
                    disabled={!assignProjectId || !assignStart || !assignEnd}
                    className="px-6 py-2.5 font-black uppercase tracking-widest text-[11px] rounded-xl hover:brightness-110 transition-all active:scale-95 shadow-lg flex items-center gap-2 bg-[#aeee2a] text-[#121412] disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                  >
                    <span className="material-symbols-outlined text-[16px]" translate="no">check</span>
                    Confirm
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ADD PARTNER MODAL */}
      {isAddModalOpen && targetCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#121412] w-full max-w-md rounded-2xl border border-[#242624] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-6 border-b border-[#242624] flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-[#faf9f5]">Add New Partner</h2>
                <p className="text-[10px] text-[#ababa8] mt-0.5 uppercase tracking-widest">
                  Adding to{" "}
                  <span className="font-bold" style={{ color: targetCategory.accentColor }}>
                    {targetCategory?.label}
                  </span>
                </p>
              </div>
              <button onClick={closeAddModal} className="text-[#ababa8] hover:text-[#faf9f5] transition-colors">
                <span className="material-symbols-outlined" translate="no">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#ababa8] mb-2">Partner Name / Identifier</label>
                <input type="text" className="w-full bg-[#181a18] border border-[#474846]/30 rounded-xl px-4 py-3 text-sm text-[#faf9f5] placeholder-[#474846] focus:outline-none focus:border-[#aeee2a]/50 transition-all" placeholder="Ex: XICARA 3, WILMAR 3..." autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#ababa8] mb-2">Team Size</label>
                  <input type="number" min="1" className="w-full bg-[#181a18] border border-[#474846]/30 rounded-xl px-4 py-3 text-sm text-[#faf9f5] focus:outline-none focus:border-[#aeee2a]/50 transition-all" placeholder="Ex: 3" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#ababa8] mb-2">Initial Status</label>
                  <select className="w-full bg-[#181a18] border border-[#474846]/30 rounded-xl px-4 py-3 text-sm text-[#faf9f5] focus:outline-none focus:border-[#aeee2a]/50 transition-all appearance-none cursor-pointer">
                    <option value="Available">Available 🟢</option>
                    <option value="Opening Soon">Opening Soon 🟡</option>
                    <option value="Booked Out">Booked Out 🔴</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#242624] bg-[#0a0a0a] flex justify-end gap-3">
              <button onClick={closeAddModal} className="px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-[#faf9f5] hover:bg-[#181a18] rounded-xl transition-colors">Cancel</button>
              <button onClick={closeAddModal} className="px-5 py-2.5 font-black uppercase tracking-widest text-[11px] rounded-xl hover:brightness-110 transition-all active:scale-95 shadow-lg flex items-center gap-2" style={{ backgroundColor: targetCategory?.accentColor, color: "#121412" }}>
                <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                Register Partner
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
