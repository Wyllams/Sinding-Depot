-- Fix: Restrict cash_payments access to admin only
-- Previously: any authenticated user (including customers/crew) had full access

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.cash_payments;

-- Create admin-only policy
CREATE POLICY "cash_payments_admin_only" ON public.cash_payments
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
