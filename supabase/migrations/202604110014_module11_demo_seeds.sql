-- Migration 014: Seeds de Demonstração para Módulo 11 (Notificações e Auditoria)
-- Popula dados fictícios para facilitar a demonstração do sistema para o cliente final.

DO $$
DECLARE
  v_admin_id uuid;
  v_salesperson_id uuid;
  v_job_id uuid;
BEGIN
  -- 1. Buscar os IDs de usuários reais já existentes no banco para não quebrar FK
  SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'admin' LIMIT 1;
  SELECT id INTO v_salesperson_id FROM public.profiles WHERE role = 'salesperson' LIMIT 1;
  SELECT id INTO v_job_id FROM public.jobs LIMIT 1;

  -- Se não encontrar usuários básicos, abortar os seeds graciosamente.
  IF v_admin_id IS NULL OR v_salesperson_id IS NULL OR v_job_id IS NULL THEN
    RAISE NOTICE 'Demo Seeds ignorados: banco vazio ou sem perfis basicos.';
    RETURN;
  END IF;

  -- 2. Inserindo Notificações de Base (Simulando o passado recente e algo não lido)
  
  -- Lida pelo Admin ha 2 dias (Blocker)
  INSERT INTO public.notifications (user_id, title, body, notification_type, related_entity_id, read, created_at)
  VALUES (
    v_admin_id, 
    'Atraso por Clima', 
    'Equipe Alpha reportou blocker de clima chuvoso no Job selecionado.', 
    'blocker', 
    v_job_id, 
    true, 
    now() - interval '2 days'
  );

  -- Nao Lida pelo Admin (Extra aprovado)
  INSERT INTO public.notifications (user_id, title, body, notification_type, related_entity_id, read, created_at)
  VALUES (
    v_admin_id, 
    'Change Order Aprovado ($450)', 
    'O cliente digitalmente assinou e aprovou o envio de material extra para finalizar as sancas.', 
    'extra', 
    v_job_id, 
    false, 
    now() - interval '2 hours'
  );

  -- Nao Lida pelo Vendedor (Cor de tinta)
  INSERT INTO public.notifications (user_id, title, body, notification_type, related_entity_id, read, created_at)
  VALUES (
    v_salesperson_id, 
    'Cor de Acabamento Definida!', 
    'O cliente definiu a cor de pintura: Azul Marinho (Sherwin-Williams 6244) para o job.', 
    'color_sent', 
    v_job_id, 
    false, 
    now() - interval '1 hour'
  );

  -- 3. Inserindo Trilha de Auditoria Dementrativa
  
  -- Log de Criacao de Job (Vendedor)
  INSERT INTO public.audit_logs (entity_table, entity_id, action, job_id, actor_profile_id, actor_role, after_state, metadata, created_at)
  VALUES (
    'jobs',
    v_job_id,
    'INSERT',
    v_job_id,
    v_salesperson_id,
    'salesperson',
    '{"id": "' || v_job_id || '", "status": "draft", "total_value": 4500}'::jsonb,
    '{"app_user_agent": "Flutter_Native_Client", "client_timestamp": "2026-04-01T10:00:00Z", "client_ip": "172.16.0.4"}'::jsonb,
    now() - interval '10 days'
  );

  -- Log de Atualizacao Critica (Admin alterando status pra Active)
  INSERT INTO public.audit_logs (entity_table, entity_id, action, job_id, actor_profile_id, actor_role, before_state, after_state, metadata, created_at)
  VALUES (
    'jobs',
    v_job_id,
    'UPDATE',
    v_job_id,
    v_admin_id,
    'admin',
    '{"status": "draft", "total_value": 4500}'::jsonb,
    '{"status": "active", "total_value": 4500}'::jsonb,
    '{"app_user_agent": "Web_Browser", "client_timestamp": "2026-04-03T14:30:00Z", "client_ip": "192.168.1.15"}'::jsonb,
    now() - interval '8 days'
  );

  -- Log de Atualizacao de Metadados Ocultos (Admin aprovou documentos)
  INSERT INTO public.audit_logs (entity_table, entity_id, action, job_id, actor_profile_id, actor_role, before_state, after_state, metadata, created_at)
  VALUES (
    'change_orders',
    v_job_id, -- Falso CO id apenas para UI demo
    'UPDATE',
    v_job_id,
    v_admin_id,
    'admin',
    '{"status": "draft", "amount": 450.00, "description": "Material extra para sancas"}'::jsonb,
    '{"status": "approved", "amount": 450.00, "description": "Material extra para sancas", "approved_at": "2026-04-11T12:00:00Z"}'::jsonb,
    '{"app_user_agent": "Web_Browser", "client_timestamp": "2026-04-11T12:00:00Z", "client_ip": "192.168.1.15"}'::jsonb,
    now() - interval '2 hours'
  );

END $$;
