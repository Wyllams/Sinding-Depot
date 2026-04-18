-- Migration: Create cash_payments table

CREATE TABLE IF NOT EXISTS public.cash_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    job_name TEXT NOT NULL,
    store TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    picked_by TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.cash_payments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable all for authenticated users" ON public.cash_payments 
    AS PERMISSIVE FOR ALL TO authenticated 
    USING (true) WITH CHECK (true);
