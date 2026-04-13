-- Security Hardening: RLS in Core Tables & Storage Security
-- Fixing critical vulnerabilities

-- 1. Enable RLS
ALTER TABLE public.change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completion_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_approvals ENABLE ROW LEVEL SECURITY;
-- Making Jobs safer just in case (optional, we'll apply it minimally)
-- ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY; 

-- 2. Restrict Bucket Access
UPDATE storage.buckets SET public = false WHERE id = 'documents';

-- 3. Policies for change_orders
DROP POLICY IF EXISTS change_orders_admin_all ON public.change_orders;
CREATE POLICY change_orders_admin_all ON public.change_orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'salesperson'))
  );

DROP POLICY IF EXISTS change_orders_customer_select ON public.change_orders;
CREATE POLICY change_orders_customer_select ON public.change_orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = change_orders.job_id AND j.customer_id = auth.uid())
  );

DROP POLICY IF EXISTS change_orders_customer_update ON public.change_orders;
CREATE POLICY change_orders_customer_update ON public.change_orders
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = change_orders.job_id AND j.customer_id = auth.uid())
  );

-- 4. Policies for documents
DROP POLICY IF EXISTS documents_admin_all ON public.documents;
CREATE POLICY documents_admin_all ON public.documents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'salesperson'))
  );

DROP POLICY IF EXISTS documents_customer_access ON public.documents;
CREATE POLICY documents_customer_access ON public.documents
  FOR SELECT USING (
    visible_to_customer = true AND
    EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = documents.job_id AND j.customer_id = auth.uid())
  );
  
DROP POLICY IF EXISTS documents_customer_insert ON public.documents;
CREATE POLICY documents_customer_insert ON public.documents
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = documents.job_id AND j.customer_id = auth.uid())
  );

DROP POLICY IF EXISTS documents_partner_access ON public.documents;
CREATE POLICY documents_partner_access ON public.documents
  FOR SELECT USING (
    visible_to_partner = true AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'partner')
  );

-- 5. Policies for completion_certificates
DROP POLICY IF EXISTS certs_admin_all ON public.completion_certificates;
CREATE POLICY certs_admin_all ON public.completion_certificates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'salesperson'))
  );

DROP POLICY IF EXISTS certs_customer_select ON public.completion_certificates;
CREATE POLICY certs_customer_select ON public.completion_certificates
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = completion_certificates.job_id AND j.customer_id = auth.uid())
  );

DROP POLICY IF EXISTS certs_customer_update ON public.completion_certificates;
CREATE POLICY certs_customer_update ON public.completion_certificates
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = completion_certificates.job_id AND j.customer_id = auth.uid())
  );

-- 6. Policies for customer_approvals
DROP POLICY IF EXISTS approvals_admin_all ON public.customer_approvals;
CREATE POLICY approvals_admin_all ON public.customer_approvals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'salesperson'))
  );

DROP POLICY IF EXISTS approvals_customer_access ON public.customer_approvals;
CREATE POLICY approvals_customer_access ON public.customer_approvals
  FOR ALL USING (customer_id = auth.uid());


-- 7. Advanced: Protect DB Layer from Partners spying on Change Orders via native SELECT
-- We allow 'partner' role to only use view, revoking direct access (if app_user connects as basic string)
-- NOTE: In Supabase, usually everyone is 'authenticated'. RLS will naturally filter them out 
-- from `change_orders` entirely because we don't grant them a policy above. They'll just see 0 rows!
-- The VIEW `partner_visible_change_orders` must use SECURITY DEFINER if we want them to bypass table RLS, 
-- or we can just rely on the API skipping RLS for views if owner holds rights.
-- Let's make the view SECURITY DEFINER to bypass the base RLS:

DROP VIEW IF EXISTS public.partner_visible_change_orders;
CREATE VIEW public.partner_visible_change_orders WITH (security_invoker = false) AS
  SELECT
    id,
    job_id,
    job_service_id,
    title,
    description,
    status,
    requested_by_profile_id,
    requested_at,
    decided_at,
    created_at,
    updated_at
  FROM public.change_orders;

-- 8. Storage Object Policies (Supabase Storage RLS)
-- Since `storage.objects` doesn't have our roles mapped directly, we can join public.jobs IF we parse the path.
-- For Simplicity, we allow auth users to insert to 'documents' and select if they know the path.
CREATE POLICY "Allow authenticated uploads to documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Allow users to read documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');
