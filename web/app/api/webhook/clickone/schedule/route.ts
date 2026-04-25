import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 30;

/**
 * POST /api/webhook/clickone/schedule
 *
 * 2º webhook do ClickOne — disparado quando o Admin agenda a data de início
 * no calendário do ClickOne (horas ou dias depois de criar o projeto).
 *
 * Payload esperado:
 * {
 *   "contact_id": "abc123",       // ID do cliente no ClickOne
 *   "schedule_date": "2026-05-15" // Data de início do serviço
 * }
 *
 * Fluxo:
 * 1. Identifica customer por clickone_contact_id
 * 2. Busca job com status IN ('pending','tentative','scheduled') AND customer_id
 * 3. Se encontrar 1 job → atualiza requested_start_date
 * 4. Se encontrar 0 ou 2+ → loga erro, notifica admin
 * 5. Retorna 200 OK
 */
export async function POST(req: Request): Promise<NextResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: 'Server configuration error: missing Supabase credentials.' },
      { status: 500 }
    );
  }

  const supabaseAdmin = createClient(
    supabaseUrl,
    supabaseServiceKey || supabaseAnonKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const payload = await req.json();

    console.log('📅 [Schedule Webhook] Received:', JSON.stringify(payload, null, 2));

    // ── Extract fields ──
    const contactId: string | null =
      payload.contact_id || payload.ID || payload.id || null;

    const rawDate: string | null =
      payload.schedule_date || payload.Agendamento || payload.agendamento ||
      payload.start_date || payload.appointment_date || null;

    // Parse the schedule date
    let scheduleDateIso: string | null = null;
    if (rawDate) {
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) {
        scheduleDateIso = parsed.toISOString().split('T')[0];
      }
    }

    // ── Log raw webhook ──
    await supabaseAdmin.from('webhook_logs').insert({
      source: 'clickone_schedule',
      raw_payload: payload,
      parsed_data: { contact_id: contactId, schedule_date: scheduleDateIso },
      status: (!contactId || !scheduleDateIso) ? 'error' : 'processing',
    });

    // ── Validate required fields ──
    if (!contactId) {
      console.error('❌ [Schedule Webhook] Missing contact_id');
      return NextResponse.json(
        { error: 'Missing required field: contact_id' },
        { status: 400 }
      );
    }

    if (!scheduleDateIso) {
      console.error('❌ [Schedule Webhook] Missing or invalid schedule_date');
      return NextResponse.json(
        { error: 'Missing or invalid required field: schedule_date' },
        { status: 400 }
      );
    }

    // ── Step 1: Find customer by clickone_contact_id ──
    const { data: customer, error: custErr } = await supabaseAdmin
      .from('customers')
      .select('id, full_name')
      .eq('clickone_contact_id', contactId)
      .maybeSingle();

    if (custErr || !customer) {
      const msg = `Customer not found for clickone_contact_id: ${contactId}`;
      console.error(`❌ [Schedule Webhook] ${msg}`);

      await supabaseAdmin.from('webhook_logs').insert({
        source: 'clickone_schedule',
        raw_payload: payload,
        parsed_data: { error: msg, contact_id: contactId },
        status: 'error',
      });

      return NextResponse.json({ error: msg }, { status: 404 });
    }

    console.log(`👤 [Schedule Webhook] Customer found: ${customer.full_name} (${customer.id})`);

    // ── Step 2: Find open job(s) for this customer ──
    const { data: matchingJobs, error: jobErr } = await supabaseAdmin
      .from('jobs')
      .select('id, job_number, title, status')
      .eq('customer_id', customer.id)
      .in('status', ['pending', 'tentative', 'scheduled'])
      .order('created_at', { ascending: false });

    if (jobErr) {
      console.error('❌ [Schedule Webhook] Error querying jobs:', jobErr);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const jobs = matchingJobs || [];

    // ── Step 3: Handle 0, 1, or 2+ matches ──
    if (jobs.length === 0) {
      const msg = `No open jobs found for customer ${customer.full_name} (${customer.id})`;
      console.error(`❌ [Schedule Webhook] ${msg}`);

      await supabaseAdmin.from('webhook_logs').insert({
        source: 'clickone_schedule',
        raw_payload: payload,
        parsed_data: {
          error: msg,
          customer_id: customer.id,
          customer_name: customer.full_name,
          schedule_date: scheduleDateIso,
        },
        status: 'error',
      });

      return NextResponse.json(
        { error: msg, suggestion: 'No pending/tentative/scheduled jobs found for this customer.' },
        { status: 404 }
      );
    }

    if (jobs.length > 1) {
      const msg = `Multiple open jobs (${jobs.length}) found for customer ${customer.full_name}. Cannot auto-assign schedule date.`;
      console.warn(`⚠️ [Schedule Webhook] ${msg}`);
      console.warn('Jobs:', jobs.map(j => `${j.job_number} (${j.status})`).join(', '));

      await supabaseAdmin.from('webhook_logs').insert({
        source: 'clickone_schedule',
        raw_payload: payload,
        parsed_data: {
          warning: msg,
          customer_id: customer.id,
          customer_name: customer.full_name,
          schedule_date: scheduleDateIso,
          matching_jobs: jobs.map(j => ({ id: j.id, number: j.job_number, status: j.status })),
        },
        status: 'warning',
      });

      // Still apply to the most recent job (first in desc order)
      // but log it as a warning for admin review
    }

    // ── Step 4: Update the job ──
    const targetJob = jobs[0];
    const { error: updateErr } = await supabaseAdmin
      .from('jobs')
      .update({ requested_start_date: scheduleDateIso })
      .eq('id', targetJob.id);

    if (updateErr) {
      console.error('❌ [Schedule Webhook] Failed to update job:', updateErr);
      return NextResponse.json({ error: 'Failed to update job start date' }, { status: 500 });
    }

    // ── Step 5: Log success ──
    const resultStatus = jobs.length > 1 ? 'warning' : 'success';
    await supabaseAdmin.from('webhook_logs').insert({
      source: 'clickone_schedule',
      raw_payload: payload,
      parsed_data: {
        customer_id: customer.id,
        customer_name: customer.full_name,
        job_id: targetJob.id,
        job_number: targetJob.job_number,
        schedule_date: scheduleDateIso,
        total_matches: jobs.length,
      },
      status: resultStatus,
    });

    console.log(`✅ [Schedule Webhook] Updated job ${targetJob.job_number} → start_date = ${scheduleDateIso}${jobs.length > 1 ? ' (⚠️ multiple jobs found, used most recent)' : ''}`);

    return NextResponse.json({
      success: true,
      job_id: targetJob.id,
      job_number: targetJob.job_number,
      schedule_date: scheduleDateIso,
      ...(jobs.length > 1 ? { warning: `${jobs.length} open jobs found, applied to most recent: ${targetJob.job_number}` } : {}),
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('❌ [Schedule Webhook] Unhandled error:', message);

    // Try to log the error
    try {
      await supabaseAdmin.from('webhook_logs').insert({
        source: 'clickone_schedule',
        raw_payload: {},
        parsed_data: { error: message },
        status: 'error',
      });
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
