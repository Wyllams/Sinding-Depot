const fs = require('fs');
const envStr = fs.readFileSync('.env.local', 'utf8');
const env = envStr.split('\n').reduce((acc, line) => {
    const parts = line.split('=');
    if(parts[0] && parts.length > 1) {
        acc[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/\"/g,'').replace(/\r/g,'');
    }
    return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('service_assignments')
  .select('*')
  .in('job_service_id', ['1e512c87-4207-4660-b6af-b65cc840881c', '207c0201-ffeb-431f-8242-0d76f12d95c5'])
  .then(res => console.log(JSON.stringify(res.data, null, 2)));
