-- Migration 007: Sales Dashboard Engine

-- 1. Snapshot Aggregator Function
-- Esta função agrega todas as vendas do vendedor em um mês específico e faz um upsert
-- em `sales_snapshots`. E recalcula % de goal se houver.
CREATE OR REPLACE FUNCTION public.refresh_sales_snapshot(p_salesperson_id uuid, p_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_month_start date := date_trunc('month', p_date)::date;
  v_month_end date := (date_trunc('month', p_date) + interval '1 month' - interval '1 day')::date;
  
  v_jobs_sold int := 0;
  v_booked_revenue numeric(12,2) := 0;
  v_change_orders_revenue numeric(12,2) := 0;
  
  v_target_goal numeric(12,2);
  v_goal_pct numeric(5,2);
  v_snapshot_id uuid;
BEGIN
  -- 1) Agregar Jobs (Booked)
  SELECT 
    COUNT(id), COALESCE(SUM(contract_amount), 0)
  INTO 
    v_jobs_sold, v_booked_revenue
  FROM public.jobs
  WHERE salesperson_id = p_salesperson_id
    AND status IN ('sold', 'scheduled', 'in_progress', 'completed')
    AND contract_signed_at IS NOT NULL
    AND contract_signed_at >= v_month_start
    AND contract_signed_at <= v_month_end;

  -- 2) Agregar Change Orders relacionadas a estes jobs (ou aprovadas neste periodo)
  -- Assumindo que a receita da CO entra no mes em que ela foi decidida/aprovada.
  SELECT COALESCE(SUM(approved_amount), 0)
  INTO v_change_orders_revenue
  FROM public.change_orders co
  JOIN public.jobs j ON j.id = co.job_id
  WHERE j.salesperson_id = p_salesperson_id
    AND co.status = 'approved'
    AND co.decided_at >= v_month_start
    AND co.decided_at <= v_month_end;

  -- 3) Buscar Meta do Mes (Target)
  -- Para simplicidade do MVP, pegamos a primeira meta de 'margin_pct' ou 'revenue_target'. O schema define goal_type (revenue_target, unit_target, etc).
  -- Assumimos revenue_target primário se existir.
  SELECT target_value INTO v_target_goal
  FROM public.sales_goals
  WHERE salesperson_id = p_salesperson_id
    AND goal_type = 'revenue_target'
    AND period_start <= v_month_start 
    AND period_end >= v_month_start
  LIMIT 1;

  -- 4) Calcular Percentual de Atingimento
  IF v_target_goal > 0 THEN
      v_goal_pct := LEAST(((v_booked_revenue + v_change_orders_revenue) / v_target_goal) * 100, 999.99);
  ELSE
      v_goal_pct := NULL;
  END IF;

  -- 5) Upsert no sales_snapshots (a constraint unica é salesperson_id + snapshot_date)
  -- Para manter os relatorios consistentes, o snapshot_date do mes sera o primeiro dia do mes.
  INSERT INTO public.sales_snapshots (
    salesperson_id,
    snapshot_date,
    jobs_sold_count,
    booked_revenue,
    approved_change_order_revenue,
    total_revenue,
    goal_attainment_pct,
    updated_at
  ) VALUES (
    p_salesperson_id,
    v_month_start,
    v_jobs_sold,
    v_booked_revenue,
    v_change_orders_revenue,
    (v_booked_revenue + v_change_orders_revenue),
    v_goal_pct,
    timezone('utc', now())
  )
  ON CONFLICT (salesperson_id, snapshot_date) 
  DO UPDATE SET
    jobs_sold_count = EXCLUDED.jobs_sold_count,
    booked_revenue = EXCLUDED.booked_revenue,
    approved_change_order_revenue = EXCLUDED.approved_change_order_revenue,
    total_revenue = EXCLUDED.total_revenue,
    goal_attainment_pct = EXCLUDED.goal_attainment_pct,
    updated_at = timezone('utc', now());

END;
$$;

-- 2. Trigger Function on Jobs
CREATE OR REPLACE FUNCTION public.trg_fn_update_sales_snapshot_from_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.salesperson_id IS NOT NULL AND NEW.contract_signed_at IS NOT NULL THEN
      PERFORM public.refresh_sales_snapshot(NEW.salesperson_id, NEW.contract_signed_at::date);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Recalcula se o amount, o status ou o date mudar. E o salesperson tbm.
    IF NEW.salesperson_id IS NOT NULL AND NEW.contract_signed_at IS NOT NULL THEN
      PERFORM public.refresh_sales_snapshot(NEW.salesperson_id, NEW.contract_signed_at::date);
    END IF;
    -- Se ele trocou a data, limpa ou recalcula do mes anterior tbm:
    IF OLD.salesperson_id IS NOT NULL AND OLD.contract_signed_at IS NOT NULL 
       AND (OLD.contract_signed_at::date != NEW.contract_signed_at::date OR OLD.salesperson_id != NEW.salesperson_id) THEN
       PERFORM public.refresh_sales_snapshot(OLD.salesperson_id, OLD.contract_signed_at::date);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.salesperson_id IS NOT NULL AND OLD.contract_signed_at IS NOT NULL THEN
      PERFORM public.refresh_sales_snapshot(OLD.salesperson_id, OLD.contract_signed_at::date);
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_jobs_sales_update ON public.jobs;
CREATE TRIGGER trg_jobs_sales_update
AFTER INSERT OR UPDATE OF salesperson_id, contract_signed_at, contract_amount, status OR DELETE
ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_update_sales_snapshot_from_job();

-- 3. Trigger Function on Change Orders
CREATE OR REPLACE FUNCTION public.trg_fn_update_sales_snapshot_from_co()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_salesperson_id uuid;
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    -- Acha o salesperson ligado a esta change order
    SELECT salesperson_id INTO v_salesperson_id FROM public.jobs WHERE id = NEW.job_id;
    IF v_salesperson_id IS NOT NULL AND NEW.decided_at IS NOT NULL AND NEW.status = 'approved' THEN
       PERFORM public.refresh_sales_snapshot(v_salesperson_id, NEW.decided_at::date);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT salesperson_id INTO v_salesperson_id FROM public.jobs WHERE id = OLD.job_id;
    IF v_salesperson_id IS NOT NULL AND OLD.decided_at IS NOT NULL AND OLD.status = 'approved' THEN
       PERFORM public.refresh_sales_snapshot(v_salesperson_id, OLD.decided_at::date);
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_co_sales_update ON public.change_orders;
CREATE TRIGGER trg_co_sales_update
AFTER INSERT OR UPDATE OF approved_amount, status, decided_at OR DELETE
ON public.change_orders
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_update_sales_snapshot_from_co();

-- 4. Trigger Function on Goals
-- Recalcula sempre que a meta é mudada (pra recalcular a % atingida proativamente)
CREATE OR REPLACE FUNCTION public.trg_fn_update_sales_snapshot_from_goal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.refresh_sales_snapshot(NEW.salesperson_id, NEW.period_start);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_sales_snapshot(OLD.salesperson_id, OLD.period_start);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_goal_sales_update ON public.sales_goals;
CREATE TRIGGER trg_goal_sales_update
AFTER INSERT OR UPDATE OF target_value, period_start, goal_type OR DELETE
ON public.sales_goals
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_update_sales_snapshot_from_goal();
