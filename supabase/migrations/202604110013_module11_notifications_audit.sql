-- Migration 013: Notifications Expansion & Generic Audit Logger

-- 1. Seguranca: Habilitar RLS no audit_logs para Admin (Web Dashboard)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_admin_all ON public.audit_logs;
CREATE POLICY audit_logs_admin_all ON public.audit_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2. Trigger Function Automática para logar qualquer mudança no BD (Auditoria Oculta)
-- Esse trigger injeta em audit_logs toda a vez que INSERT ou UPDATE ocorrem, gravando RAW JSON.
CREATE OR REPLACE FUNCTION public.trg_audit_logger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_id uuid;
BEGIN
  -- Se a tabela é JOBS, o entity_id é ele mesmo.
  IF TG_TABLE_NAME = 'jobs' THEN
    v_job_id := NEW.id;
  ELSIF TG_TABLE_NAME = 'change_orders' THEN
    v_job_id := NEW.job_id;
  ELSE
    v_job_id := NULL;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (entity_table, entity_id, action, job_id, actor_profile_id, actor_role, after_state)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', v_job_id, auth.uid(), 'db_trigger', row_to_json(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Somente logar se houve mudanca real
    IF row_to_json(OLD) IS DISTINCT FROM row_to_json(NEW) THEN
      INSERT INTO public.audit_logs (entity_table, entity_id, action, job_id, actor_profile_id, actor_role, before_state, after_state)
      VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', v_job_id, auth.uid(), 'db_trigger', row_to_json(OLD), row_to_json(NEW));
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Criando os Triggers Acionadores de Auditoria Global
DROP TRIGGER IF EXISTS trg_audit_jobs ON public.jobs;
CREATE TRIGGER trg_audit_jobs AFTER INSERT OR UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.trg_audit_logger();

DROP TRIGGER IF EXISTS trg_audit_cos ON public.change_orders;
CREATE TRIGGER trg_audit_cos AFTER INSERT OR UPDATE ON public.change_orders FOR EACH ROW EXECUTE FUNCTION public.trg_audit_logger();

-- 3. Notificacao de Update de Assignment
CREATE OR REPLACE FUNCTION public.trg_notify_assignment_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_name text;
  v_job_id uuid;
  v_crew_profile_id uuid;
BEGIN
  IF NEW.crew_id IS NOT NULL AND (OLD.scheduled_date != NEW.scheduled_date OR OLD.status != NEW.status) THEN
    SELECT profile_id INTO v_crew_profile_id FROM public.crews WHERE id = NEW.crew_id;
    SELECT j.title, j.id INTO v_job_name, v_job_id FROM public.jobs j JOIN public.job_services js ON js.job_id = j.id WHERE js.id = NEW.job_service_id;
    
    IF v_crew_profile_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, notification_type, related_entity_id)
      VALUES (
        v_crew_profile_id,
        'Assignment Atualizado',
        'Sua escala no projeto ' || COALESCE(v_job_name, 'Desconhecido') || ' sofreu mudança de data ou status.',
        'assignment',
        v_job_id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_assignment_upd ON public.service_assignments;
CREATE TRIGGER trg_notify_assignment_upd AFTER UPDATE ON public.service_assignments FOR EACH ROW EXECUTE FUNCTION public.trg_notify_assignment_updated();

-- 4. Notificacao de Paint Color Escrita do Metadata do Job
CREATE OR REPLACE FUNCTION public.trg_notify_color_sent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_salesperson_id uuid;
BEGIN
  -- Observa transicao onde paint_color ganha valor jsonb (dentro de metadata)
  IF (OLD.metadata->>'paint_color' IS NULL OR OLD.metadata->>'paint_color' = '') AND 
     (NEW.metadata->>'paint_color' IS NOT NULL AND NEW.metadata->>'paint_color' != '') THEN
    
    SELECT salesperson_id INTO v_salesperson_id FROM public.jobs WHERE id = NEW.id;
    
    IF v_salesperson_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, notification_type, related_entity_id)
      VALUES (
        v_salesperson_id,
        'Cor de Acabamento Definida',
        'O cliente definiu a cor de pintura: ' || (NEW.metadata->>'paint_color') || ' para o job ' || NEW.title,
        'color_sent',
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_color ON public.jobs;
CREATE TRIGGER trg_notify_color AFTER UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.trg_notify_color_sent();

-- 5. Notificacao de Finalizacao de Completion Certificate
CREATE OR REPLACE FUNCTION public.trg_notify_certificate_signed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_name text;
  v_salesperson_id uuid;
BEGIN
  IF NEW.status = 'signed' AND OLD.status != 'signed' THEN
    SELECT title, salesperson_id INTO v_job_name, v_salesperson_id FROM public.jobs WHERE id = NEW.job_id;
    
    IF v_salesperson_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, notification_type, related_entity_id)
      VALUES (
        v_salesperson_id,
        'Certificate of Completion Assinado!',
        'O cliente acabou de assinar e fechar o projeto ' || COALESCE(v_job_name, 'Desconhecido') || '.',
        'document_signed',
        NEW.job_id
      );

      -- E notifica admins
      INSERT INTO public.notifications (user_id, title, body, notification_type, related_entity_id)
      SELECT id, 'Job Concluído e Assinado', 'O cliente validou ' || COALESCE(v_job_name, '') || '.', 'document_signed', NEW.job_id
      FROM public.profiles WHERE role = 'admin';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_cert ON public.completion_certificates;
CREATE TRIGGER trg_notify_cert AFTER UPDATE ON public.completion_certificates FOR EACH ROW EXECUTE FUNCTION public.trg_notify_certificate_signed();
