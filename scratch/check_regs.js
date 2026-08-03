const SUPABASE_URL = 'https://bqmvrhqztxsgjosicsdj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxbXZyaHF6dHhzZ2pvc2ljc2RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MzkwODksImV4cCI6MjA5OTQxNTA4OX0.ExrJr9AaLGxo4KxybSY9UCPWXcSolz2OAZTGeHnNnUc';
const headers = { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` };

async function test() {
  const partsRes = await fetch(`${SUPABASE_URL}/rest/v1/participants?select=id,name,chess_number&limit=5`, { headers });
  const parts = await partsRes.json();
  console.log('Sample participants:', parts);

  const regsRes = await fetch(`${SUPABASE_URL}/rest/v1/registrations?select=*&limit=5`, { headers });
  const regs = await regsRes.json();
  console.log('Sample registrations in DB:', regs);

  const crRes = await fetch(`${SUPABASE_URL}/rest/v1/competition_registrations?select=*&limit=5`, { headers });
  const cr = await crRes.json();
  console.log('Sample competition_registrations:', cr);

  const ciRes = await fetch(`${SUPABASE_URL}/rest/v1/competition_participants?select=*&limit=5`, { headers });
  const ci = await ciRes.json();
  console.log('Sample competition_participants:', ci);
}

test().catch(console.error);
