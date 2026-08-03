const SUPABASE_URL = 'https://bqmvrhqztxsgjosicsdj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxbXZyaHF6dHhzZ2pvc2ljc2RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MzkwODksImV4cCI6MjA5OTQxNTA4OX0.ExrJr9AaLGxo4KxybSY9UCPWXcSolz2OAZTGeHnNnUc';

async function check() {
  const headers = { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` };

  // Fetch all competitions
  const compsRes = await fetch(`${SUPABASE_URL}/rest/v1/competitions?select=id,name`, { headers });
  const comps = await compsRes.json();
  const compIds = new Set(comps.map(c => c.id));
  console.log('Total competitions in DB:', comps.length);

  // Fetch rules
  const rulesRes = await fetch(`${SUPABASE_URL}/rest/v1/app_settings?key=eq.competition_rules&select=value`, { headers });
  const rulesData = await rulesRes.json();
  if (!rulesData?.[0]?.value) { console.log('No rules found!'); return; }
  
  const rules = JSON.parse(rulesData[0].value);
  const ruleIds = Object.keys(rules);
  console.log('Total rule IDs in app_settings:', ruleIds.length);

  // How many competition IDs have matching rules?
  const matched = comps.filter(c => rules[c.id] && (rules[c.id].description?.trim() || rules[c.id].duration?.trim()));
  const unmatched = comps.filter(c => !rules[c.id] || (!rules[c.id].description?.trim() && !rules[c.id].duration?.trim()));
  
  console.log('\nCompetitions WITH matching rules (badge will show):', matched.length);
  console.log('Competitions WITHOUT rules (no badge):', unmatched.length);
  
  // Show first 5 unmatched
  console.log('\nSample competitions WITHOUT rules:');
  unmatched.slice(0, 5).forEach(c => console.log(' -', c.name, '|', c.id));

  // Orphaned rule IDs (rules for competitions that don't exist)
  const orphaned = ruleIds.filter(id => !compIds.has(id));
  console.log('\nOrphaned rule IDs (old, no matching competition):', orphaned.length);
}

check().catch(console.error);
