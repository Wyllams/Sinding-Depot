-- Migration Corretiva: Módulo 3 - Foreign Keys Indexes
-- Previne Sequential Scans severos gerados indesejadamente pelo PostgreSQL
-- durante remocao (ON DELETE CASCADE) de servicos.

-- Tabela: service_assignments
-- FK: job_service_id references job_services(id)
create index if not exists service_assignments_job_service_idx
  on public.service_assignments (job_service_id);

-- Tabela: service_dependencies
-- FK: dependent_job_service_id references job_services(id)
-- Obs: predecessor ja possuia index (service_dependencies_predecessor_idx)
create index if not exists service_dependencies_dependent_idx
  on public.service_dependencies (dependent_job_service_id);

-- Tabela: blockers
-- FK: job_service_id references job_services(id)
create index if not exists blockers_job_service_idx
  on public.blockers (job_service_id);

-- Tabela: documents
-- FK: job_service_id references job_services(id)
create index if not exists documents_job_service_idx
  on public.documents (job_service_id);

-- Tabela: photos
-- FK: job_service_id references job_services(id)
create index if not exists photos_job_service_idx
  on public.photos (job_service_id);
