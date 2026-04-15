import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://beqooykvbnjgujdrowuh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlcW9veWt2Ym5qZ3VqZHJvd3VoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NDk3NzgsImV4cCI6MjA5MTQyNTc3OH0.zEbOQ5N7tE0xPNakdUsXCntuW7dab5kb-LieWN1JHOw';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const users = [
    { email: 'vendedor@sidingdepot.com', password: 'Password123!' },
    { email: 'parceiro@sidingdepot.com', password: 'Password123!' },
    { email: 'cliente@sidingdepot.com', password: 'Password123!' },
  ];

  for (const u of users) {
    const { data, error } = await supabase.auth.signUp({
      email: u.email,
      password: u.password,
    });
    if (error) {
      console.error(`Erro em ${u.email}:`, error.message);
    } else {
      console.log(`Sucesso! User ID de ${u.email} : ${data.user?.id}`);
    }
  }
}

main();
