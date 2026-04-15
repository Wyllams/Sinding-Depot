import { FieldTopBar } from "@/components/field/FieldTopBar";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

export default async function FieldJobsList() {
  // Para a listagem de hoje, criamos cliente com ANON Key, pois a RLS permite acesso de dashboard para admins. O ideal é supabaseServer
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Vamos buscar *todos* os job_services do tipo "Siding" para simular a pauta da crew
  const { data: services, error } = await supabaseAdmin
    .from("job_services")
    .select(`
      id,
      status,
      jobs (
        id,
        title,
        service_address_line_1,
        city,
        state
      )
    `)
    .eq("status", "pending")
    .limit(10);

  return (
    <>
      <FieldTopBar title="My Assigned Jobs" />
      
      <div className="p-4 space-y-4">
        {/* Filtros em Pílulas */}
        <div className="flex gap-2 overflow-x-auto pb-2 styled-scrollbar">
          <button className="bg-[#aeee2a] text-[#1a2e00] font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-full whitespace-nowrap">
            Today
          </button>
          <button className="bg-[#1e201e] border border-white/5 text-[#ababa8] font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-full hover:bg-white/5 transition-colors whitespace-nowrap">
            Upcoming
          </button>
          <button className="bg-[#1e201e] border border-white/5 text-[#ababa8] font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-full hover:bg-white/5 transition-colors whitespace-nowrap">
            Completed
          </button>
        </div>

        {error && <p className="text-[#ff7351]">Failed to load jobs.</p>}

        {services?.map((service: any) => {
          const job = service.jobs;
          if (!job) return null;

          return (
            <Link 
              key={service.id} 
              href={`/field/jobs/${job.id}?service_id=${service.id}`}
              className="block bg-[#1e201e] border border-white/5 rounded-3xl p-5 active:scale-[0.98] transition-transform"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="bg-[#1a2e00] border border-[#aeee2a]/20 px-3 py-1 rounded-full flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 bg-[#aeee2a] rounded-full animate-pulse" />
                   <span className="text-[#aeee2a] text-[10px] font-bold uppercase tracking-widest">Active</span>
                </div>
                {/* Aqui seria o tipo da disciplina dinâmico, mas mockamos visualmente */}
                <span className="text-[#ababa8] text-[10px] font-bold uppercase tracking-wider border border-white/10 px-2 py-1 rounded">Siding</span>
              </div>

              <h3 className="text-[#faf9f5] font-headline text-xl font-bold tracking-tight leading-tight mb-1">
                {job.service_address_line_1}
              </h3>
              <p className="text-[#ababa8] text-sm">
                {job.city}, {job.state}
              </p>

              <div className="mt-4 pt-4 border-t border-dashed border-white/5 flex justify-between items-center">
                <span className="text-[#474846] text-xs font-bold uppercase tracking-widest">View Details</span>
                <span className="material-symbols-outlined text-[#aeee2a]" translate="no">chevron_right</span>
              </div>
            </Link>
          );
        })}

        {services?.length === 0 && (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-[48px] text-[#242624]" translate="no">tag_faces</span>
            <p className="text-[#ababa8] mt-4 font-bold text-sm uppercase tracking-wider">No active jobs right now</p>
          </div>
        )}
      </div>
    </>
  );
}
