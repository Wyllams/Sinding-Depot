-- Seed Data for Siding Depot MVP
-- This script provides initial mock data for presentation and testing.

-- 1. Create Mock Profiles (Assume auth.users exist or we bypass fk for local. In Supabase local, they don't exist yet, but we'll insert into public.profiles directly. Wait, profiles reference auth.users via RLS or not? In our schema, we didn't force a hard fk to auth.users in the DDL except for maybe `id uuid references auth.users(id)`. To avoid FK violations in standard local environment where auth.users is empty, we must disable triggers or insert auth users. 
-- In pure SQL MVP without auth running, we can just insert)

-- Since auth.users is managed by GoTrue, inserting directly into profiles might fail if there's a strict FK constraint in `202604110001_core_schema.sql`.
-- Let's provide the basic structure that works for staging. 

INSERT INTO public.profiles (id, email, full_name, role)
VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'admin@sidingdepot.com', 'Admin Master', 'admin'),
  ('b0000000-0000-0000-0000-000000000002', 'john.sales@sidingdepot.com', 'John Sales (Top Closer)', 'salesperson'),
  ('c0000000-0000-0000-0000-000000000003', 'crew.alpha@installers.com', 'Crew Alpha (Siding Specialists)', 'subcontractor'),
  ('c0000000-0000-0000-0000-000000000004', 'crew.bravo@installers.com', 'Crew Bravo (Roofing)', 'subcontractor')
ON CONFLICT (id) DO NOTHING;

-- 2. Create Customers
INSERT INTO public.customers (id, first_name, last_name, email, phone, address_line1, city, state, zip_code)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Michael', 'Scott', 'm.scott@paper.com', '555-0101', '1725 Slough Avenue', 'Scranton', 'PA', '18505'),
  ('c1000000-0000-0000-0000-000000000002', 'Walter', 'White', 'w.white@chemistry.org', '555-0202', '308 Negra Arroyo Lane', 'Albuquerque', 'NM', '87104'),
  ('c1000000-0000-0000-0000-000000000003', 'Tony', 'Soprano', 't.soprano@waste.net', '555-0303', '14 Aspen Drive', 'North Caldwell', 'NJ', '07006')
ON CONFLICT (id) DO NOTHING;

-- 3. Create Jobs
INSERT INTO public.jobs (id, customer_id, salesperson_id, subcontractor_profile_id, title, status, contract_amount, contract_signed_at)
VALUES
  ('j0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 'Full Siding Replacement - Scott Residence', 'in_progress', 24500.00, now() - interval '20 days'),
  ('j0000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000004', 'Roofing Tear Off - White Residence', 'scheduled', 18200.00, now() - interval '5 days'),
  ('j0000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', null, 'Gutters and Windows - Soprano Estate', 'sold', 12400.00, now() - interval '2 days')
ON CONFLICT (id) DO NOTHING;

-- 4. Create Job Assignments
INSERT INTO public.job_assignments (id, job_id, subcontractor_profile_id, assigned_by_profile_id, status)
VALUES
  (gen_random_uuid(), 'j0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'accepted'),
  (gen_random_uuid(), 'j0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'pending')
ON CONFLICT DO NOTHING;

-- 5. Create Change Orders
INSERT INTO public.change_orders (id, job_id, title, description, status, requested_by_profile_id, proposed_amount, approved_amount, decided_at)
VALUES
  (gen_random_uuid(), 'j0000000-0000-0000-0000-000000000001', 'Extra Wood Rot Repair', 'Found heavy rot on the east wall after tear-down. Requires 4 plywood sheets.', 'approved', 'c0000000-0000-0000-0000-000000000003', 450.00, 450.00, now() - interval '2 days'),
  (gen_random_uuid(), 'j0000000-0000-0000-0000-000000000002', 'Chimney Flashing Upgrade', 'Upgrade to copper flashing around the chimney per customer request.', 'draft', 'b0000000-0000-0000-0000-000000000002', 800.00, null, null)
ON CONFLICT DO NOTHING;

-- 6. Create Sales Goals
-- Adiciona a meta global de $100.000,00 para o vendedor principal neste mês
INSERT INTO public.sales_goals (id, salesperson_id, period_start, period_end, goal_type, target_value)
VALUES
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000002', date_trunc('month', now()), date_trunc('month', now()) + interval '1 month', 'revenue_target', 100000.00)
ON CONFLICT DO NOTHING;
