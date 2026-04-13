-- migration 006: Document Module expansion

-- 1. Expansão do tipo literal do DB
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'installer_scope_packet';
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'customer_visible_document';
