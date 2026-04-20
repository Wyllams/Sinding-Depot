import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// NOTE: Client is created inside the handler (not at module level)
// so that env vars are available at request-time, not build-time.

/**
 * Gera um username a partir do full_name.
 * Padrão: FirstName_LastName (sem acentos, underscores para espaços)
 * Ex: "Nick Magalhães" -> "Nick_Magalhaes"
 */
function generateUsername(fullName: string): string {
  // Remove acentos e caracteres especiais
  const normalized = fullName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacríticos
    .replace(/[^a-zA-Z\s]/g, '')     // remove não-alfanuméricos
    .trim();

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return `Customer_${Date.now()}`;

  // Pega primeiro nome e último sobrenome
  const firstName = parts[0];
  const lastName = parts.length > 1 ? parts[parts.length - 1] : '';

  if (!lastName) return firstName;
  return `${firstName}_${lastName}`;
}

/**
 * Gera a senha padrão a partir do nome.
 * Padrão: PrimeiroNome + Inicial do Sobrenome + * + Ano
 * Ex: "Nick Magalhães" -> "NickM*2026"
 */
function generatePassword(fullName: string): string {
  const normalized = fullName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z\s]/g, '')
    .trim();

  const parts = normalized.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || 'User';
  const lastInitial = parts.length > 1 ? parts[parts.length - 1][0].toUpperCase() : 'X';
  const year = new Date().getFullYear();

  return `${firstName}${lastInitial}*${year}`;
}

export async function POST(req: Request) {
  // Initialize Supabase client inside the handler to avoid build-time errors
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Server configuration error: missing Supabase credentials.' }, { status: 500 });
  }

  // Use service role key for admin operations (creating auth users).
  // Falls back to anon key if service key is not set (won't be able to create auth users).
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    const payload = await req.json();

    console.log("📥 Received ClickOne Webhook:", JSON.stringify(payload, null, 2));
    console.log("📋 Payload keys:", Object.keys(payload));

    // Capture ALL headers for debugging
    const allHeaders: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      allHeaders[key] = value;
    });

    // Save raw payload + headers to webhook_logs for debugging
    await supabaseAdmin.from("webhook_logs").insert({
      source: 'clickone',
      raw_payload: payload,
      parsed_data: { keys: Object.keys(payload), headers: allHeaders },
      status: 'processing',
    });

    // 1. Extract values — based on ACTUAL ClickOne payload structure
    const clientName =
      payload.full_name || payload.opportunity_name || payload.client_name ||
      payload["Nome do contato principal"] ||
      [payload.first_name, payload.last_name].filter(Boolean).join(" ") ||
      "Unknown Client";

    const emailAddress = payload.email || payload["E-mail principal"] || null;
    const phoneNumber = payload.phone || payload["Telefone principal"] || null;
    
    // ── ClickOne sends custom fields as HEADERS (Cabeçalhos), not body! ──
    // Read from both headers AND body for maximum compatibility
    const hdrs = req.headers;
    // Filter out literal 'undefined', 'null', empty strings from headers
    const h = (name: string): string | null => {
      const val = hdrs.get(name);
      if (!val || val === 'undefined' || val === 'null' || val.trim() === '') return null;
      return val;
    };

    // ClickOne puts "Dados Personalizados" inside `customData` object!
    const cd = payload.customData ?? {};

    // ── Address from headers (Street_Address, City, State, Postal_Code) then body ──
    const directStreet =
      cd.Street_Address || cd.street_address ||
      h("Street_Address") || h("street_address") || h("Street-Address") ||
      payload["Street_Address"] || payload["Street Address"] || payload.street_address ||
      payload["Endereço"] || payload.street ||
      payload["address1"] || payload["address"] ||
      null;

    const directCity =
      cd.City || cd.city ||
      h("City") || h("city") ||
      payload["City"] || payload.city ||
      payload["Cidade"] ||
      null;

    const directState =
      cd.State || cd.state ||
      h("State") || h("state") ||
      payload["State"] || payload.state ||
      payload["Estado"] ||
      null;

    const directZip =
      cd.Postal_Code || cd.postal_code ||
      h("Postal_Code") || h("postal_code") || h("Postal-Code") ||
      payload["Postal_Code"] || payload["Postal Code"] || payload["ZIP Code"] ||
      payload.zip_code || payload.zip || payload.postal_code ||
      payload["CEP"] ||
      null;

    // Log what we found for debugging
    console.log("🔍 Headers:", { 
      Street_Address: h("Street_Address"), City: h("City"), 
      State: h("State"), Postal_Code: h("Postal_Code"), 
      Vendedor: h("Vendedor") 
    });
    console.log("🔍 Address resolved:", { directStreet, directCity, directState, directZip });

    // Normalize state: "Georgia" → "GA", "Florida" → "FL", etc.
    const stateMap: Record<string, string> = {
      'georgia': 'GA', 'florida': 'FL', 'alabama': 'AL', 'tennessee': 'TN',
      'south carolina': 'SC', 'north carolina': 'NC', 'virginia': 'VA',
      'texas': 'TX', 'california': 'CA', 'new york': 'NY', 'ohio': 'OH',
      'michigan': 'MI', 'illinois': 'IL', 'pennsylvania': 'PA',
      'massachusetts': 'MA', 'maryland': 'MD', 'colorado': 'CO',
      'arizona': 'AZ', 'washington': 'WA', 'oregon': 'OR',
      'minnesota': 'MN', 'indiana': 'IN', 'missouri': 'MO',
      'wisconsin': 'WI', 'louisiana': 'LA', 'connecticut': 'CT',
      'mississippi': 'MS', 'arkansas': 'AR', 'kentucky': 'KY',
      'iowa': 'IA', 'kansas': 'KS', 'nevada': 'NV', 'utah': 'UT',
      'nebraska': 'NE', 'new jersey': 'NJ', 'new mexico': 'NM',
      'west virginia': 'WV', 'idaho': 'ID', 'maine': 'ME',
      'new hampshire': 'NH', 'montana': 'MT', 'delaware': 'DE',
      'hawaii': 'HI', 'alaska': 'AK', 'rhode island': 'RI',
      'south dakota': 'SD', 'north dakota': 'ND', 'vermont': 'VT',
      'wyoming': 'WY', 'oklahoma': 'OK',
      // BR states
      'pernambuco': 'PE', 'são paulo': 'SP', 'sao paulo': 'SP',
      'rio de janeiro': 'RJ', 'minas gerais': 'MG', 'bahia': 'BA',
      'paraná': 'PR', 'parana': 'PR', 'ceará': 'CE', 'ceara': 'CE',
    };

    const normalizeState = (s: string | null): string => {
      if (!s) return "GA";
      if (s.length <= 3) return s.toUpperCase();
      return stateMap[s.toLowerCase()] || s.toUpperCase().slice(0, 2);
    };

    let finalAddress = directStreet || "Pendente";
    let city = directCity || "Unknown";
    let state = normalizeState(directState);
    let zip = directZip || "00000";

    // Fallback: parse full_address string (NOT location.fullAddress which is company)
    const rawAddress = payload.full_address || payload.address || "";
    if (!directStreet && rawAddress) {
      const parts = rawAddress.split(',').map((p: string) => p.trim());
      if (parts.length >= 3) {
        finalAddress = parts[0];
        city = directCity || parts[parts.length - 2];
        const stateZipStr = parts[parts.length - 1].split(' ');
        if (stateZipStr.length >= 2) {
          state = normalizeState(directState || stateZipStr[0]);
          zip = directZip || stateZipStr[stateZipStr.length - 1] || "00000";
        }
      } else if (parts.length === 2) {
        finalAddress = parts[0];
        city = directCity || parts[1];
      } else {
        finalAddress = rawAddress;
      }
    }

    // ── Helper: returns null for empty, 'undefined', 'null' strings ──
    const nonEmpty = (v: unknown): string | null => {
      if (!v || typeof v !== 'string') return null;
      const t = v.trim();
      if (!t || t === 'undefined' || t === 'null') return null;
      return t;
    };

    // ── Salesperson: VendedorOP vs VendedorUser comparison logic ──
    // VendedorOP = opportunity.assignedToUsersName (deal owner)
    // VendedorUser = user.name (CRM user who triggered)
    // Rules: same name → use it; only one filled → use it; different names → null
    const vendedorOP = nonEmpty(cd.VendedorOP) || nonEmpty(cd.vendedorOP);
    const vendedorUser = nonEmpty(cd.VendedorUser) || nonEmpty(cd.vendedorUser);

    let salespersonName: string | null = null;
    if (vendedorOP && vendedorUser) {
      // Both filled: only use if they match (case-insensitive)
      if (vendedorOP.toLowerCase() === vendedorUser.toLowerCase()) {
        salespersonName = vendedorOP;
      } else {
        // Different names → DO NOT assign
        console.warn(`⚠️ VendedorOP (${vendedorOP}) ≠ VendedorUser (${vendedorUser}) — skipping salesperson`);
        salespersonName = null;
      }
    } else {
      // Only one filled → use whichever has a value
      salespersonName = vendedorOP || vendedorUser || null;
    }

    // Legacy fallbacks (for older webhook formats)
    if (!salespersonName) {
      salespersonName =
        nonEmpty(cd.Vendedor) || nonEmpty(cd.vendedor) ||
        nonEmpty(h("Vendedor")) || nonEmpty(h("vendedor")) ||
        nonEmpty(payload.owner) ||
        nonEmpty(payload["Vendedor"]) || nonEmpty(payload["vendedor"]) ||
        nonEmpty(payload["Proprietário"]) || nonEmpty(payload["Proprietario"]) ||
        nonEmpty(payload.salesperson) || nonEmpty(payload.Salesperson) ||
        null;
    }

    // ── Agendamento: appointment start date from customData ──
    const rawAgendamento = nonEmpty(cd.Agendamento) || nonEmpty(cd.agendamento) || nonEmpty(payload["Close Date"]);
    let startDateIso: string | null = null;
    if (rawAgendamento) {
      // ClickOne sends dates like "April 22, 2026" or "2026-04-22"
      const parsed = new Date(rawAgendamento);
      if (!isNaN(parsed.getTime())) {
        startDateIso = parsed.toISOString().split('T')[0]; // "2026-04-22"
      }
    }
    // Fallback: use today if no date provided
    if (!startDateIso) {
      startDateIso = new Date().toISOString().split('T')[0];
    }

    // ── Crew Lead: partner name from ClickOne ──
    const rawCrewLead = nonEmpty(payload["Crew Lead"]) || nonEmpty(cd.Crew_Lead) || nonEmpty(cd.crew_lead);

    // ── Valor: ClickOne sends as `Job Value`, `lead_value`, or `Valor` header ──
    // ── Valor: customData.Valor, headers, or payload fields ──
    const serviceValue =
      cd.Valor || cd.valor ||
      h("Valor") || h("valor") ||
      payload["Job Value"] || payload.lead_value ||
      payload["Valor"] ||
      payload.value || payload.Value ||
      "0";

    // ── Serviço: ClickOne sends as `Services` ──
    const rawServices =
      payload["Services"] || payload["Service"] ||            // "Gutters"
      payload["Serviço"] || payload["Servico"] ||
      payload["Tipo de Serviço"] || payload.service ||
      "Siding";

    // ── SQ: ClickOne sends as `Squares?` (default), `Squares` (custom data) ──
    // Helper to filter empty strings from payload values
    const p = (key: string): string | null => {
      const val = payload[key];
      if (val === undefined || val === null || val === '' || val === 'undefined') return null;
      return String(val);
    };
    const rawSQ =
      cd.Squares || cd.squares || cd.SQ || cd.sq ||
      p("Squares") || p("squares") || p("Squares?") ||
      p("SQ") || p("sq") ||
      h("Squares") || h("squares") || h("SQ") ||
      null;
    const squareFootage = rawSQ ? parseFloat(String(rawSQ).replace(/[^0-9.]/g, '')) : null;

    console.log(`👤 Client: ${clientName} | 📧 ${emailAddress}`);
    console.log(`📍 Address: ${finalAddress}, ${city}, ${state} ${zip}`);
    console.log(`👔 Salesperson: ${salespersonName} (OP: ${vendedorOP || 'N/A'}, User: ${vendedorUser || 'N/A'})`);
    console.log(`🔧 Service: ${rawServices} | 📐 SQ: ${squareFootage ?? 'N/A'} | 💰 Value: ${serviceValue}`);
    console.log(`📅 Agendamento: ${startDateIso} | 👷 Crew Lead: ${rawCrewLead || 'default'}`);

    if (!clientName || clientName === "Unknown Client") {
      console.warn("ClickOne Webhook missing client name, proceeding with generic name");
    }

    // 1. Check or Create Customer
    let customerId = "";
    if (emailAddress) {
      const { data: extCustomer } = await supabaseAdmin
        .from("customers")
        .select("id")
        .eq("email", emailAddress)
        .maybeSingle();

      if (extCustomer) {
        customerId = extCustomer.id;
      }
    }

    if (!customerId) {
      const { data: newCustomer, error: custErr } = await supabaseAdmin
        .from("customers")
        .insert({
          full_name: clientName,
          email: emailAddress || `unknown-${Date.now()}@clickone.com`,
          phone: phoneNumber || "Sem Telefone",
          address_line_1: finalAddress,
          city: city,
          state: state,
          postal_code: zip,
        })
        .select("id")
        .single();
      
      if (custErr) throw custErr;
      customerId = newCustomer.id;
    }

    // ────────────────────────────────────────────────────
    // CUSTOMER PORTAL ACCESS — Auto-create login credentials
    // ────────────────────────────────────────────────────
    let customerUsername: string | null = null;
    let customerPassword: string | null = null;

    if (supabaseServiceKey && clientName && clientName !== "Unknown Client") {
      try {
        // ── Guard: skip if customer already has portal access ──
        const { data: custCheck } = await supabaseAdmin
          .from("customers")
          .select("profile_id")
          .eq("id", customerId)
          .single();

        if (custCheck?.profile_id) {
          console.log(`🔑 Customer already has portal access — skipping creation.`);
        } else {

        // Generate base username
        let baseUsername = generateUsername(clientName);
        let finalUsername = baseUsername;

        // Check for duplicate usernames and add suffix if needed
        const { data: existingUsernames } = await supabaseAdmin
          .from("customers")
          .select("username")
          .like("username", `${baseUsername}%`);

        if (existingUsernames && existingUsernames.length > 0) {
          const existingSet = new Set(existingUsernames.map(u => u.username));
          if (existingSet.has(baseUsername)) {
            let suffix = 2;
            while (existingSet.has(`${baseUsername}_${suffix}`)) {
              suffix++;
            }
            finalUsername = `${baseUsername}_${suffix}`;
          }
        }

        customerUsername = finalUsername;
        customerPassword = generatePassword(clientName);
        const portalEmail = `${finalUsername.toLowerCase()}@customer.sidingdepot.app`;

        // Create auth user with auto-confirm (no email verification needed for customers)
        const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
          email: portalEmail,
          password: customerPassword,
          email_confirm: true, // Auto-confirm, no verification email
          user_metadata: {
            full_name: clientName,
            role: 'customer',
            username: finalUsername,
          },
        });

        if (authErr) {
          console.error("⚠️ Failed to create auth user for customer portal:", authErr.message);
          // Don't throw — job creation should continue even if portal creation fails
        } else if (authUser?.user) {
          // Create profile for the customer
          await supabaseAdmin.from("profiles").insert({
            id: authUser.user.id,
            email: portalEmail,
            full_name: clientName,
            role: 'customer',
            phone: phoneNumber,
          });

          // Update customer record with portal credentials
          await supabaseAdmin
            .from("customers")
            .update({
              profile_id: authUser.user.id,
              username: finalUsername,
              portal_email: portalEmail,
            })
            .eq("id", customerId);

          console.log(`🔑 Customer portal created: ${finalUsername} / ${portalEmail}`);

          // Send welcome email with credentials via Gmail SMTP
          const gmailUser = process.env.GMAIL_USER;
          const gmailPass = process.env.GMAIL_APP_PASSWORD;
          if (gmailUser && gmailPass && emailAddress) {
            try {
              await sendCustomerWelcomeEmail({
                gmailUser,
                gmailPass,
                toEmail: emailAddress,
                customerName: clientName,
                username: finalUsername,
                password: customerPassword,
                siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://siding-depot.vercel.app',
              });
              console.log(`📧 Welcome email sent to ${emailAddress}`);
            } catch (emailErr: unknown) {
              const msg = emailErr instanceof Error ? emailErr.message : String(emailErr);
              console.error(`⚠️ Failed to send welcome email: ${msg}`);
            }
          } else {
            console.warn("⚠️ Skipping welcome email: GMAIL_USER/GMAIL_APP_PASSWORD or customer email not available.");
          }
        }
        } // end else (no existing profile_id)
      } catch (portalErr: unknown) {
        const msg = portalErr instanceof Error ? portalErr.message : String(portalErr);
        console.error("⚠️ Customer portal creation error (non-blocking):", msg);
      }
    } else if (!supabaseServiceKey) {
      console.warn("⚠️ SUPABASE_SERVICE_ROLE_KEY not set — skipping customer portal creation.");
    }

    // 2. Resolve Salesperson Mapping
    // ClickOne names → System names alias map
    const SP_ALIASES: Record<string, string> = {
      'matheus': 'Matt',
      'matheus araujo': 'Matt',
      'matt': 'Matt',
      'armando': 'Armando',
      'armando magalhaes': 'Armando',
      'armando magalhães': 'Armando',
      'ruby': 'Ruby',
      'ruby davenport': 'Ruby',
    };

    let spId: string | null = null;
    if (salespersonName) {
      const normalizedName = String(salespersonName).trim().toLowerCase();
      const mappedName = SP_ALIASES[normalizedName] || SP_ALIASES[normalizedName.split(' ')[0]] || String(salespersonName).split(' ')[0];
      
      const { data: spMatch } = await supabaseAdmin
         .from("salespersons")
         .select("id")
         .ilike("full_name", `%${mappedName}%`)
         .maybeSingle();
         
      spId = spMatch?.id || null;
    }

    // 3. Create the Job
    const jobNumber = `SD-${new Date().getFullYear()}-${Math.floor(Math.random()*9000)+1000}`;
    const numericValue = serviceValue ? parseFloat(String(serviceValue).replace(/[^0-9.]/g, '')) : 0;

    const { data: newJob, error: jobErr } = await supabaseAdmin
      .from("jobs")
      .insert({
        customer_id: customerId,
        salesperson_id: spId,
        job_number: jobNumber,
        title: `${rawServices} - ${clientName}`,
        status: "draft",
        gate_status: "NOT_CONTACTED",
        requested_start_date: startDateIso,
        service_address_line_1: finalAddress,
        city: city,
        state: state,
        postal_code: zip,
        contract_amount: numericValue || 0,
        sq: squareFootage,
        description: `Webhook Source: ClickOne`
      })
      .select("id")
      .single();

    if (jobErr) throw jobErr;

    // 4. Register Services + Create Cascade Scheduling
    // ── Service code normalization ──
    const normalizeServiceCode = (name: string): string => {
      const n = name.toLowerCase().trim();
      if (n.includes('siding')) return 'siding';
      if (n.includes('paint')) return 'painting';
      if (n.includes('window')) return 'windows';
      if (n.includes('door')) return 'doors';
      if (n.includes('gutter')) return 'gutters';
      if (n.includes('roof')) return 'roofing';
      if (n.includes('deck')) return 'decks';
      if (n.includes('dumpster')) return 'dumpster';
      return n;
    };

    const svcNames = rawServices.split(",").map((s: string) => s.trim()).filter(Boolean);
    let svcCodes = svcNames.map(normalizeServiceCode);

    // Auto-add painting if siding is selected (business rule)
    if (svcCodes.includes('siding') && !svcCodes.includes('painting')) {
      svcCodes.push('painting');
    }
    // Auto-add roofing if gutters is selected (business rule)
    if (svcCodes.includes('gutters') && !svcCodes.includes('roofing')) {
      svcCodes.push('roofing');
    }

    // Order services for correct cascade calculation
    const SERVICE_ORDER = ['siding', 'windows', 'doors', 'decks', 'dumpster', 'painting', 'gutters', 'roofing'];
    svcCodes.sort((a: string, b: string) => {
      const idxA = SERVICE_ORDER.indexOf(a);
      const idxB = SERVICE_ORDER.indexOf(b);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
    // Remove duplicates
    svcCodes = [...new Set(svcCodes)];

    // ── Duration calculator based on SQ (same as new-project) ──
    const parsedSq = squareFootage || 0;
    const calcDuration = (code: string): number => {
      if (code === 'siding') return Math.max(1, Math.ceil(parsedSq / 8));
      if (code === 'painting') return Math.max(1, Math.ceil(parsedSq / 10));
      return 1; // Default for gutters, roofing, windows, doors, etc.
    };

    // ── Date helpers (working days, skip Sundays) ──
    const addWorkingDays = (startIso: string, duration: number): Date => {
      const d = new Date(startIso + 'T12:00:00');
      let added = 0;
      while (added < duration - 1) {
        d.setDate(d.getDate() + 1);
        if (d.getDay() !== 0) added++; // Skip Sundays
      }
      return d;
    };
    const nextWorkingDay = (dateObj: Date): Date => {
      const d = new Date(dateObj);
      d.setDate(d.getDate() + 1);
      if (d.getDay() === 0) d.setDate(d.getDate() + 1);
      return d;
    };

    // Cascade predecessor chain
    const CASCADE_PREDECESSORS: Record<string, string[]> = {
      painting: ['siding'],
      gutters:  ['painting', 'siding'],
      roofing:  ['gutters', 'painting', 'siding'],
    };

    // ── Default crew mapping per service ──
    const DEFAULT_CREWS: Record<string, string> = {
      siding: 'XICARA',
      painting: 'OSVIN',
      windows: 'SERGIO',
      doors: 'SERGIO',
      gutters: 'LEANDRO',
      roofing: 'JOSUE',
    };

    // ── Specialty code mapping ──
    const SPECIALTY_CODES: Record<string, string> = {
      siding: 'siding_installation',
      painting: 'painting',
      windows: 'windows',
      doors: 'doors',
      gutters: 'gutters',
      roofing: 'roofing',
      decks: 'deck_building',
    };

    // Fetch crews and specialties from DB
    const { data: allCrews } = await supabaseAdmin.from('crews').select('id, name, code');
    const { data: allSpecs } = await supabaseAdmin.from('specialties').select('id, code');

    // Fetch crew_specialties to know which services each crew handles
    const { data: crewSpecLinks } = await supabaseAdmin
      .from('crew_specialties')
      .select('crew_id, specialty_id');

    // Build a map: specialty_code → Set of crew_ids that handle it
    // And reverse: crew_id → Set of specialty_codes
    const crewToSpecCodes = new Map<string, Set<string>>();
    if (crewSpecLinks && allSpecs) {
      for (const link of crewSpecLinks) {
        const spec = allSpecs.find(s => s.id === link.specialty_id);
        if (!spec) continue;
        if (!crewToSpecCodes.has(link.crew_id)) crewToSpecCodes.set(link.crew_id, new Set());
        crewToSpecCodes.get(link.crew_id)!.add(spec.code);
      }
    }

    // Map specialty codes to service codes for matching
    const SPEC_TO_SVC: Record<string, string> = {
      siding_installation: 'siding',
      painting: 'painting',
      windows: 'windows',
      doors: 'doors',
      gutters: 'gutters',
      roofing: 'roofing',
      deck_building: 'decks',
    };

    // Resolve Crew Lead from webhook → match to DB crew
    let crewLeadId: string | null = null;
    let crewLeadName: string | null = null;
    const crewLeadServiceCodes = new Set<string>(); // service codes this crew handles
    if (rawCrewLead && allCrews) {
      const norm = rawCrewLead.toLowerCase().trim();
      const match = allCrews.find(c =>
        c.name?.toLowerCase() === norm || c.code?.toLowerCase() === norm
      );
      if (match) {
        crewLeadId = match.id;
        crewLeadName = match.name;
        // Get which services this crew can do
        const specCodes = crewToSpecCodes.get(match.id);
        if (specCodes) {
          for (const sc of specCodes) {
            const svc = SPEC_TO_SVC[sc];
            if (svc) crewLeadServiceCodes.add(svc);
          }
        }
        console.log(`👷 Crew Lead resolved: ${rawCrewLead} → ${match.name} (${match.id}) | Services: ${[...crewLeadServiceCodes].join(', ')}`);
      } else {
        console.warn(`⚠️ Crew Lead '${rawCrewLead}' not found in DB, using defaults`);
      }
    }

    const prevEndpoints: Record<string, string> = {};

    for (const svcCode of svcCodes) {
      // Find service_type in DB (search by code first, then by name)
      let svcTypeId: string | null = null;
      const { data: svcByCode } = await supabaseAdmin
        .from('service_types')
        .select('id')
        .ilike('code', svcCode)
        .maybeSingle();
      if (svcByCode) {
        svcTypeId = svcByCode.id;
      } else {
        // Fallback: search by name
        const searchName = svcNames.find((n: string) => normalizeServiceCode(n) === svcCode) || svcCode;
        const { data: svcByName } = await supabaseAdmin
          .from('service_types')
          .select('id')
          .ilike('name', `%${searchName}%`)
          .maybeSingle();
        svcTypeId = svcByName?.id || null;
      }

      if (!svcTypeId) {
        console.warn(`⚠️ Service type not found for '${svcCode}', skipping`);
        continue;
      }

      // Create job_service
      const { data: newJs } = await supabaseAdmin.from('job_services').insert({
        job_id: newJob.id,
        service_type_id: svcTypeId,
        scope_of_work: 'To be determined from initial inspection',
        quantity: squareFootage,
        unit_of_measure: squareFootage ? 'SQ' : null,
      }).select('id').single();

      if (!newJs) continue;

      // ── Calculate cascade dates ──
      const duration = calcDuration(svcCode);
      let svcStartIso = startDateIso!;

      if (svcCode === 'windows' || svcCode === 'doors') {
        // Windows/Doors run in parallel with Siding (same start date)
        // Late addition: if project already started, use today
        const todayIso = new Date().toISOString().split('T')[0];
        if (todayIso > startDateIso!) {
          svcStartIso = todayIso;
          const d = new Date(svcStartIso + 'T12:00:00');
          if (d.getDay() === 0) {
            d.setDate(d.getDate() + 1);
            svcStartIso = d.toISOString().split('T')[0];
          }
        }
      } else {
        // Cascade: start after predecessor ends
        const predecessors = CASCADE_PREDECESSORS[svcCode] || [];
        for (const pred of predecessors) {
          if (prevEndpoints[pred]) {
            const predEnd = new Date(prevEndpoints[pred] + 'T12:00:00');
            svcStartIso = nextWorkingDay(predEnd).toISOString().split('T')[0];
            console.log(`[Cascade] ${svcCode}: after ${pred} → start=${svcStartIso}`);
            break;
          }
        }
      }

      // Ensure start is not on Sunday
      const startCheck = new Date(svcStartIso + 'T12:00:00');
      if (startCheck.getDay() === 0) {
        startCheck.setDate(startCheck.getDate() + 1);
        svcStartIso = startCheck.toISOString().split('T')[0];
      }

      const startAt = new Date(svcStartIso + 'T08:00:00');
      const lastDayInclusive = addWorkingDays(svcStartIso, duration);
      prevEndpoints[svcCode] = lastDayInclusive.toISOString().split('T')[0];

      const endAt = new Date(prevEndpoints[svcCode] + 'T12:00:00');
      endAt.setDate(endAt.getDate() + 1);

      console.log(`[Cascade] ${svcCode}: dur=${duration} start=${svcStartIso} end=${prevEndpoints[svcCode]}`);

      // ── Resolve crew for this service ──
      let crewId: string | null = null;

      // If Crew Lead handles this service's specialty, assign them
      if (crewLeadId && crewLeadServiceCodes.has(svcCode)) {
        crewId = crewLeadId;
      } else {
        // Use default crew for services the Crew Lead doesn't handle
        const defaultCrewName = DEFAULT_CREWS[svcCode];
        if (defaultCrewName && allCrews) {
          const match = allCrews.find(c => c.name?.toUpperCase() === defaultCrewName.toUpperCase());
          crewId = match?.id || null;
        }
      }

      // ── Resolve specialty_id (required by DB trigger) ──
      const specCode = SPECIALTY_CODES[svcCode] || 'siding_installation';
      const specMatch = (allSpecs || []).find(s => s.code === specCode);
      const specialtyId = specMatch?.id || '26652a43-728d-43c1-935a-c39f1dea4d7d'; // fallback: siding_installation

      // ── Create service_assignment ──
      await supabaseAdmin.from('service_assignments').insert({
        job_service_id: newJs.id,
        crew_id: crewId,
        specialty_id: specialtyId,
        status: 'scheduled',
        scheduled_start_at: startAt.toISOString(),
        scheduled_end_at: endAt.toISOString(),
      });

      console.log(`✅ Assignment: ${svcCode} → crew=${crewId ? (allCrews?.find(c => c.id === crewId)?.name || crewId) : 'none'} | ${svcStartIso} to ${prevEndpoints[svcCode]}`);
    }

    // Update target_completion_date from cascade endpoints
    if (Object.values(prevEndpoints).length > 0) {
      const endDates = Object.values(prevEndpoints).map(d => new Date(d + 'T12:00:00').getTime());
      const maxTime = Math.max(...endDates);
      const maxDateStr = new Date(maxTime).toISOString().split('T')[0];
      await supabaseAdmin.from('jobs').update({ target_completion_date: maxDateStr }).eq('id', newJob.id);
    }

    // 4b. Automação 3.5 — Criar window_order se serviço for Windows ou Doors
    const hasWindowService = svcNames.some((s: string) =>
      s.toLowerCase().includes("window") || s.toLowerCase().includes("door")
    );
    if (hasWindowService) {
      await supabaseAdmin.from("window_orders").insert({
        job_id: newJob.id,
        customer_name: clientName,
        status: "Measurement",
        money_collected: "NO",
        quantity: null,
        quote: null,
        deposit: null,
        ordered_on: null,
        expected_delivery: null,
        supplier: "",
        order_number: null,
        notes: null,
      });
      console.log(`🪟 Auto-created window_order for job ${jobNumber}`);
    }

    // 5. Update Sales Snapshot for real-time Reports dashboard
    if (spId && numericValue > 0) {
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

      // Check if snapshot exists for this salesperson + month
      const { data: existingSnap } = await supabaseAdmin
        .from("sales_snapshots")
        .select("id, jobs_sold_count, total_revenue")
        .eq("salesperson_id", spId)
        .eq("snapshot_date", monthStart)
        .maybeSingle();

      if (existingSnap) {
        // Update existing snapshot: increment job count + add revenue
        await supabaseAdmin
          .from("sales_snapshots")
          .update({
            jobs_sold_count: existingSnap.jobs_sold_count + 1,
            total_revenue: Number(existingSnap.total_revenue) + numericValue,
            booked_revenue: Number(existingSnap.total_revenue) + numericValue,
          })
          .eq("id", existingSnap.id);

        console.log(`📊 Updated snapshot for salesperson ${spId}: +$${numericValue}`);
      } else {
        // Create new snapshot for this month
        await supabaseAdmin
          .from("sales_snapshots")
          .insert({
            salesperson_id: spId,
            snapshot_date: monthStart,
            jobs_sold_count: 1,
            booked_revenue: numericValue,
            total_revenue: numericValue,
            approved_change_order_revenue: 0,
          });

        console.log(`📊 Created new snapshot for salesperson ${spId}: $${numericValue}`);
      }
    }

    // 6. Set contract_signed_at so period-based queries (Quarter/Year) pick up this job
    await supabaseAdmin
      .from("jobs")
      .update({ contract_signed_at: new Date().toISOString() })
      .eq("id", newJob.id);

    console.log("✅ ClickOne job successfully registered:", jobNumber);

    return NextResponse.json({
      success: true,
      job_id: newJob.id,
      message: "Job created in Siding Depot",
      portal: customerUsername
        ? { username: customerUsername, portal_email: `${customerUsername.toLowerCase()}@customer.sidingdepot.app` }
        : null,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("❌ ClickOne Webhook Error:", msg);
    return NextResponse.json({ error: msg || "Internal Error" }, { status: 500 });
  }
}

// ─── Email Helper ────────────────────────────────────────────
interface WelcomeEmailParams {
  gmailUser: string;
  gmailPass: string;
  toEmail: string;
  customerName: string;
  username: string;
  password: string;
  siteUrl: string;
}

async function sendCustomerWelcomeEmail(params: WelcomeEmailParams): Promise<void> {
  const { gmailUser, gmailPass, toEmail, customerName, username, password, siteUrl } = params;
  const loginUrl = `${siteUrl}/login?role=customer`;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <tr>
          <td style="background:#121412;padding:32px 40px;text-align:center;">
            <div style="font-size:28px;font-weight:900;color:#aeee2a;letter-spacing:-0.5px;">SIDING DEPOT</div>
            <div style="font-size:11px;font-weight:700;color:#ababa8;text-transform:uppercase;letter-spacing:3px;margin-top:6px;">Customer Portal Access</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h1 style="font-size:22px;font-weight:800;color:#121412;margin:0 0 8px;">Welcome, ${customerName}!</h1>
            <p style="font-size:14px;color:#474846;line-height:1.6;margin:0 0 28px;">
              Your project with Siding Depot has been successfully closed. Below are your credentials to access the <strong>Customer Portal</strong>, where you can track progress, review documents, and approve changes.
            </p>

            <!-- Credentials Box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fae1;border:2px solid #aeee2a;border-radius:12px;margin-bottom:28px;">
              <tr>
                <td style="padding:24px 28px;">
                  <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#5c8a00;margin-bottom:16px;">Your Login Credentials</div>
                  
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:8px 0;width:100px;">
                        <span style="font-size:11px;font-weight:700;color:#474846;text-transform:uppercase;letter-spacing:1px;">Username</span>
                      </td>
                      <td style="padding:8px 0;">
                        <span style="font-size:16px;font-weight:900;color:#121412;font-family:monospace;background:#fff;padding:4px 12px;border-radius:6px;border:1px solid #e5e5e3;">${username}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;width:100px;">
                        <span style="font-size:11px;font-weight:700;color:#474846;text-transform:uppercase;letter-spacing:1px;">Password</span>
                      </td>
                      <td style="padding:8px 0;">
                        <span style="font-size:16px;font-weight:900;color:#121412;font-family:monospace;background:#fff;padding:4px 12px;border-radius:6px;border:1px solid #e5e5e3;">${password}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td align="center">
                  <a href="${loginUrl}" style="display:inline-block;background:#121412;color:#aeee2a;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:2px;padding:16px 40px;border-radius:12px;text-decoration:none;">
                    Access Your Portal →
                  </a>
                </td>
              </tr>
            </table>

            <p style="font-size:12px;color:#a1a19d;line-height:1.5;margin:0;border-top:1px solid #e5e5e3;padding-top:20px;">
              For security, we recommend changing your password after your first login. If you have any questions about your project, please don't hesitate to contact us.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#faf9f5;padding:20px 40px;text-align:center;border-top:1px solid #e5e5e3;">
            <p style="font-size:10px;color:#a1a19d;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0;">
              © ${new Date().getFullYear()} Siding Depot. All rights reserved.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from: `"Siding Depot" <${gmailUser}>`,
    to: toEmail,
    subject: `Your Siding Depot Customer Portal Access — ${username}`,
    html: htmlBody,
  });
}
