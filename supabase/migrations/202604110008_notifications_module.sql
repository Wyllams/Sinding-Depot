-- Migration 008: Notifications Engine & Triggers (Corrigido)

-- 1. Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  notification_type text NOT NULL, -- e.g., 'assignment', 'blocker', 'extra', 'color_sent', 'document_signed'
  read boolean NOT NULL DEFAULT false,
  related_entity_id uuid,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'))
WITH CHECK (user_id = auth.uid() OR auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- 2. Trigger Function: Assignment Created
CREATE OR REPLACE FUNCTION public.trg_notify_assignment_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_name text;
  v_job_id uuid;
  v_crew_profile_id uuid;
BEGIN
  -- We only notify if a crew is assigned
  IF NEW.crew_id IS NOT NULL THEN
    -- Get the crew's profile id
    SELECT profile_id INTO v_crew_profile_id FROM public.crews WHERE id = NEW.crew_id;
    
    -- Get the job name
    SELECT j.title, j.id INTO v_job_name, v_job_id 
    FROM public.jobs j 
    JOIN public.job_services js ON js.job_id = j.id 
    WHERE js.id = NEW.job_service_id;
    
    IF v_crew_profile_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, notification_type, related_entity_id)
      VALUES (
        v_crew_profile_id,
        'Nova Tarefa Atribuída',
        'Sua crew foi escalada para atuar em: ' || COALESCE(v_job_name, 'Desconhecido'),
        'assignment',
        v_job_id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_assignment ON public.service_assignments;
CREATE TRIGGER trg_notify_assignment
AFTER INSERT ON public.service_assignments
FOR EACH ROW
EXECUTE FUNCTION public.trg_notify_assignment_created();

-- 3. Trigger Function: Blocker Registered
CREATE OR REPLACE FUNCTION public.trg_notify_blocker_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_name text;
  v_salesperson_id uuid;
BEGIN
  -- Notify the Salesperson of the Job. If not available, notify admins.
  SELECT title, salesperson_id INTO v_job_name, v_salesperson_id FROM public.jobs WHERE id = NEW.job_id;
  
  IF v_salesperson_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body, notification_type, related_entity_id)
    VALUES (
      v_salesperson_id,
      'Bloqueio Reportado!',
      'Alguém do time externo reportou um bloqueio em: ' || COALESCE(v_job_name, 'Desconhecido') || '. Motivo: ' || COALESCE(NEW.description, NEW.title, 'Não especificado'),
      'blocker',
      NEW.job_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_blocker ON public.blockers;
CREATE TRIGGER trg_notify_blocker
AFTER INSERT ON public.blockers
FOR EACH ROW
EXECUTE FUNCTION public.trg_notify_blocker_created();


-- 4. Trigger Function: Extra Approved (Change Order)
CREATE OR REPLACE FUNCTION public.trg_notify_extra_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_name text;
  v_salesperson_id uuid;
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    SELECT title, salesperson_id INTO v_job_name, v_salesperson_id FROM public.jobs WHERE id = NEW.job_id;
    
    IF v_salesperson_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, notification_type, related_entity_id)
      VALUES (
        v_salesperson_id,
        'Extra (CO) Aprovado pelo Cliente',
        'O Change order "' || NEW.title || '" foi aprovado. Atualize no Dashboard de Vendas!',
        'extra',
        NEW.job_id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_extra ON public.change_orders;
CREATE TRIGGER trg_notify_extra
AFTER UPDATE ON public.change_orders
FOR EACH ROW
EXECUTE FUNCTION public.trg_notify_extra_approved();
