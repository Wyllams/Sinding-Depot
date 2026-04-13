-- Migration 012: Sales Metrics Security Constraints

ALTER TABLE public.sales_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_snapshots ENABLE ROW LEVEL SECURITY;

-- Admins: View Everything
DROP POLICY IF EXISTS goals_admin_all ON public.sales_goals;
CREATE POLICY goals_admin_all ON public.sales_goals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS snapshot_admin_all ON public.sales_snapshots;
CREATE POLICY snapshot_admin_all ON public.sales_snapshots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Salesperson (Vendedor): View Only Themselves
DROP POLICY IF EXISTS goals_sales_select ON public.sales_goals;
CREATE POLICY goals_sales_select ON public.sales_goals
  FOR SELECT USING (
    salesperson_id IN (
      SELECT id FROM public.salespersons WHERE profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS snapshot_sales_select ON public.sales_snapshots;
CREATE POLICY snapshot_sales_select ON public.sales_snapshots
  FOR SELECT USING (
    salesperson_id IN (
      SELECT id FROM public.salespersons WHERE profile_id = auth.uid()
    )
  );

-- Index de Unicidade
-- Impede multiplas metas concorrentes para a mesma pessoa, no mesmo mes, sob o mesmo tipo.
CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_goals_period ON public.sales_goals(salesperson_id, period_start, goal_type);
