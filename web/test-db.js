const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.*)/)[1].trim();
const supabaseKey = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY\s*=\s*(.*)/)[1].trim();

if (!supabaseUrl || !supabaseKey) { console.log('No env'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: jobs } = await supabase.from('jobs').select('id, title, created_at').order('created_at', { ascending: false }).limit(2);
  console.log('Latest Jobs:', jobs);
  
  if (jobs.length > 0) {
    const { data: assignments } = await supabase.from('service_assignments')
      .select('id, status, scheduled_start_at, scheduled_end_at, job_services!inner(id, quantity, service_types!inner(code))')
      .eq('job_services.job_id', jobs[0].id);
      
    console.log(JSON.stringify(assignments, null, 2));
  }
}
check();
