-- Módulo: Customer Colors Selection
-- Tabela para armazenar aprovação de tintas feitas pelo cliente no Portal Light Mode

CREATE TABLE IF NOT EXISTS public.job_color_selections (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade not null,
  surface_area text not null, -- Ex: "Main Siding", "Trim", "Accent/Doors"
  brand text not null,        -- Ex: "Sherwin Williams"
  color_name text not null,   -- Ex: "Alabaster"
  color_code text not null,   -- Ex: "SW 7008"
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- RLS Policies
ALTER TABLE public.job_color_selections ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins have full access to color selections"
ON public.job_color_selections
FOR ALL
USING (
  public.is_admin()
);

-- Customers can view their own color selections or insert them
-- Note: Requires matching auth.uid() if profiles are linked. For the demo Portal, we will assume public/token access or bypass.
CREATE POLICY "Public read for demo portal"
ON public.job_color_selections
FOR SELECT
USING (true);
