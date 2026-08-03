// migrate_rules.cjs - Migrate rules from app_settings JSON → competitions table columns
const fs = require('fs');

const SUPABASE_URL = 'https://bqmvrhqztxsgjosicsdj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxbXZyaHF6dHhzZ2pvc2ljc2RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MzkwODksImV4cCI6MjA5OTQxNTA4OX0.ExrJr9AaLGxo4KxybSY9UCPWXcSolz2OAZTGeHnNnUc';

async function migrate() {
  const headers = { 
    'apikey': SUPABASE_ANON_KEY, 
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  };

  // 1. Get all competitions
  const compsRes = await fetch(`${SUPABASE_URL}/rest/v1/competitions?select=id,name`, { headers });
  const comps = await compsRes.json();
  console.log('Total competitions:', comps.length);

  // 2. Get rules from app_settings
  const rulesRes = await fetch(`${SUPABASE_URL}/rest/v1/app_settings?key=eq.competition_rules&select=value`, { headers });
  const rulesData = await rulesRes.json();
  if (!rulesData?.[0]?.value) { console.log('No rules in app_settings!'); return; }
  
  const rulesMap = JSON.parse(rulesData[0].value);
  console.log('Total rule entries:', Object.keys(rulesMap).length);

  // 3. For each competition that has a matching rule, UPDATE the columns
  let updated = 0, skipped = 0;
  for (const comp of comps) {
    const rule = rulesMap[comp.id];
    if (!rule) { skipped++; continue; }
    
    const desc = typeof rule === 'object' ? (rule.description || '') : String(rule || '');
    const dur = typeof rule === 'object' ? (rule.duration || '') : '';
    let critStr = '';
    if (typeof rule === 'object' && Array.isArray(rule.criteria)) {
      critStr = rule.criteria
        .filter(item => item.label || item.mark)
        .map(item => typeof item === 'object' ? `${item.label}: ${item.mark}` : String(item))
        .join(', ');
    }

    if (!desc && !dur && !critStr) { skipped++; continue; }

    const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/competitions?id=eq.${comp.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ 
        rules_description: desc, 
        rules_duration: dur, 
        mark_criteria: critStr 
      })
    });

    if (updateRes.ok) {
      updated++;
      console.log(`  ✓ "${comp.name}"`);
    } else {
      console.error(`  ✗ "${comp.name}":`, await updateRes.text());
    }
  }

  console.log(`\n✅ Migrated ${updated} competitions. Skipped ${skipped} (no rules).`);
}

migrate().catch(console.error);
