-- Confirmação Forçada e Promoção para Admin

-- 1. Forçar a confirmação de Email (Bypass do "Email not confirmed")
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = 'manager@sidingdepot.com';


-- 2. Atualizar o Perfil para Admin
SET session_replication_role = 'replica';

UPDATE public.profiles 
SET 
  role = 'admin', 
  full_name = 'Manager Teste 100%' 
WHERE id = (SELECT id FROM auth.users WHERE email = 'manager@sidingdepot.com');

SET session_replication_role = 'origin';
