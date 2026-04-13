"use client";

import { useState } from "react";
import { ArrowLeft, User, MapPin, Hammer, PaintRoller, Grip, Home, Calendar, FileText } from "lucide-react";
import Link from "next/link";
import CustomDatePicker from "../../../components/CustomDatePicker";

export default function CreateJob() {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [startDate,  setStartDate]  = useState("");
  const [endDate,    setEndDate]    = useState("");

  const toggleService = (id: string) => {
    setSelectedServices(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const services = [
    { id: 'siding', name: 'Siding Installation', icon: Home, desc: 'Hardie, Vinyl, Wood, or Metal' },
    { id: 'gutters', name: 'Gutters & Downspouts', icon: Grip, desc: 'Seamless gutters, guards, cleaning' },
    { id: 'painting', name: 'Exterior Painting', icon: PaintRoller, desc: 'Full exterior, trim, doors' },
    { id: 'roofing', name: 'Roofing Repair', icon: Hammer, desc: 'Shingles, flashing, leaks' },
  ];

  return (
    <main className="min-h-full bg-[#0B0B0B] pb-10">
      
      {/* SOLID TOPBAR (No Glass) */}
      <header className="sticky top-0 z-20 flex justify-between items-center px-8 py-5 bg-[#0a0a0a] border-b border-[#27272a]">
        <div className="flex items-center gap-4">
          <Link href="/jobs" className="text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-[18px] font-bold tracking-tight text-white mb-0.5">Create New Job</h1>
            <p className="text-[13px] text-zinc-500">Add a new client and select required services.</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
            <button className="text-[13px] font-medium text-zinc-400 hover:text-white transition-colors">
              Cancel
            </button>
            <button className="bg-[#b2d234] hover:bg-[#a1cd20] text-black font-semibold px-6 py-2 text-[13px] rounded-full transition-colors">
              Save Job Pipeline
            </button>
        </div>
      </header>

      <div className="p-8 max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Data Entry */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Customer Panel */}
          <section className="bg-[#0e0e11] border border-[#27272a] rounded-[20px] p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-10 h-10 rounded-full bg-[#18181b] border border-[#27272a] flex items-center justify-center text-[#b2d234] shrink-0">
                <User size={16} />
              </div>
              <h2 className="text-[15px] font-bold text-white tracking-wide">Customer Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">First Name</label>
                <input type="text" placeholder="e.g. John" className="w-full bg-[#121214] border border-[#27272a] text-[14px] text-white rounded-xl px-4 py-3 outline-none focus:border-[#b2d234] transition-colors placeholder:text-zinc-600" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Last Name</label>
                <input type="text" placeholder="e.g. Doe" className="w-full bg-[#121214] border border-[#27272a] text-[14px] text-white rounded-xl px-4 py-3 outline-none focus:border-[#b2d234] transition-colors placeholder:text-zinc-600" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Email Address</label>
                <input type="email" placeholder="john@example.com" className="w-full bg-[#121214] border border-[#27272a] text-[14px] text-white rounded-xl px-4 py-3 outline-none focus:border-[#b2d234] transition-colors placeholder:text-zinc-600" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Phone Number</label>
                <input type="tel" placeholder="(555) 000-0000" className="w-full bg-[#121214] border border-[#27272a] text-[14px] text-white rounded-xl px-4 py-3 outline-none focus:border-[#b2d234] transition-colors placeholder:text-zinc-600" />
              </div>
            </div>
          </section>

          {/* Location Panel */}
          <section className="bg-[#0e0e11] border border-[#27272a] rounded-[20px] p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-10 h-10 rounded-full bg-[#18181b] border border-[#27272a] flex items-center justify-center text-orange-500 shrink-0">
                <MapPin size={16} />
              </div>
              <h2 className="text-[15px] font-bold text-white tracking-wide">Job Location</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Street Address</label>
                <input type="text" placeholder="123 Builder Way" className="w-full bg-[#121214] border border-[#27272a] text-[14px] text-white rounded-xl px-4 py-3 outline-none focus:border-[#b2d234] transition-colors placeholder:text-zinc-600" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">City</label>
                <input type="text" placeholder="Atlanta" className="w-full bg-[#121214] border border-[#27272a] text-[14px] text-white rounded-xl px-4 py-3 outline-none focus:border-[#b2d234] transition-colors placeholder:text-zinc-600" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Zip Code</label>
                <input type="text" placeholder="30033" className="w-full bg-[#121214] border border-[#27272a] text-[14px] text-white rounded-xl px-4 py-3 outline-none focus:border-[#b2d234] transition-colors placeholder:text-zinc-600" />
              </div>
            </div>
          </section>

          {/* Job Details Panel */}
          <section className="bg-[#0e0e11] border border-[#27272a] rounded-[20px] p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-10 h-10 rounded-full bg-[#18181b] border border-[#27272a] flex items-center justify-center text-blue-500 shrink-0">
                <Calendar size={16} />
              </div>
              <h2 className="text-[15px] font-bold text-white tracking-wide">Job Details</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <CustomDatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Select start date"
                  disableSundays={false}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <CustomDatePicker
                  label="Expected Completion"
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="Select completion date"
                  disableSundays={false}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Est. Budget ($)</label>
                <input type="number" placeholder="0.00" className="w-full bg-[#121214] border border-[#27272a] text-[14px] text-white rounded-xl px-4 py-3 outline-none focus:border-[#b2d234] transition-colors placeholder:text-zinc-600" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Project Manager</label>
                <select className="w-full bg-[#121214] border border-[#27272a] text-[14px] text-zinc-400 rounded-xl px-4 py-3 outline-none focus:border-[#b2d234] transition-colors appearance-none">
                  <option value="">Select Manager...</option>
                  <option value="mark">Mark S.</option>
                  <option value="sarah">Sarah J.</option>
                </select>
              </div>
            </div>
          </section>

          {/* Additional Info Panel */}
          <section className="bg-[#0e0e11] border border-[#27272a] rounded-[20px] p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-10 h-10 rounded-full bg-[#18181b] border border-[#27272a] flex items-center justify-center text-purple-500 shrink-0">
                <FileText size={16} />
              </div>
              <h2 className="text-[15px] font-bold text-white tracking-wide">Additional Information</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Requirements & Notes</label>
                <textarea rows={4} placeholder="Gate codes, permit requirements, special instructions..." className="w-full bg-[#121214] border border-[#27272a] text-[14px] text-white rounded-xl px-4 py-3 outline-none focus:border-[#b2d234] transition-colors placeholder:text-zinc-600 resize-none"></textarea>
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: Services Selection */}
        <div className="lg:col-span-5 h-full">
          <div className="bg-[#0e0e11] border border-[#27272a] rounded-[20px] p-8 h-full">
            <h2 className="text-[16px] font-bold text-white mb-2 tracking-wide">Required Services</h2>
            <p className="text-[13px] text-zinc-500 mb-8">Select one or more services to add to this pipeline.</p>
            
            <div className="space-y-4">
              {services.map((svc) => {
                const isSelected = selectedServices.includes(svc.id);
                return (
                  <div 
                    key={svc.id}
                    onClick={() => toggleService(svc.id)}
                    className={`cursor-pointer group flex items-center gap-5 p-4 rounded-[16px] border transition-all duration-200 ${
                      isSelected 
                        ? 'bg-[#18181b] border-[#b2d234] shadow-[0_0_20px_rgba(178,210,52,0.1)]' 
                        : 'bg-[#121214] border-[#27272a] hover:border-[#3f3f46]'
                    }`}
                  >
                    {/* Icon Wrapper */}
                    <div className="w-12 h-12 rounded-[12px] bg-[#1d1d20] flex items-center justify-center shrink-0">
                       <svc.icon size={18} className={isSelected ? 'text-[#b2d234]' : 'text-zinc-400'} />
                    </div>

                    <div className="flex-1">
                      <h4 className={`text-[14px] font-bold ${isSelected ? 'text-white' : 'text-zinc-200'}`}>
                        {svc.name}
                      </h4>
                      <p className="text-[12px] text-zinc-500 mt-0.5">{svc.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>

          </div>
        </div>

      </div>
    </main>
  );
}
