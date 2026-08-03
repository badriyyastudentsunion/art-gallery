// fix_rules.cjs - Match CSV rules to current DB competition IDs and save
const fs = require('fs');

const SUPABASE_URL = 'https://bqmvrhqztxsgjosicsdj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxbXZyaHF6dHhzZ2pvc2ljc2RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MzkwODksImV4cCI6MjA5OTQxNTA4OX0.ExrJr9AaLGxo4KxybSY9UCPWXcSolz2OAZTGeHnNnUc';

const CSV_PATH = 'C:/Users/RYZEN7/Downloads/competitions_final_fixed_v2 - competitions_final_fixed_v2.csv';

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  return lines.map(line => {
    const row = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') inQ = !inQ;
      else if (ch === ',' && !inQ) { row.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    row.push(cur.trim());
    return row;
  });
}

async function fixRules() {
  const headers = { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` };

  // 1. Fetch all current competitions from DB
  const compsRes = await fetch(`${SUPABASE_URL}/rest/v1/competitions?select=id,name`, { headers });
  const comps = await compsRes.json();
  console.log(`Found ${comps.length} competitions in DB`);

  // Build name → id map (lowercase)
  const nameToId = {};
  comps.forEach(c => nameToId[c.name.trim().toLowerCase()] = c.id);

  // 2. Parse CSV
  const text = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parseCSV(text);
  const csvHeaders = rows[0].map(h => h.replace(/^\uFEFF/, '').trim().toLowerCase());
  const dataRows = rows.slice(1);

  const nameIdx = csvHeaders.indexOf('name');
  const descIdx = csvHeaders.indexOf('rules_description');
  const durIdx = csvHeaders.indexOf('rules_duration');
  const critIdx = csvHeaders.indexOf('mark_criteria');

  console.log(`\nCSV columns: name=${nameIdx}, rules_description=${descIdx}, rules_duration=${durIdx}, mark_criteria=${critIdx}`);

  // 3. Build new rules map — only for competitions that exist in DB
  const newRulesMap = {};
  let matched = 0, skipped = 0, noRules = 0;

  dataRows.forEach((row, i) => {
    const name = (row[nameIdx] || '').trim();
    if (!name) return;

    const id = nameToId[name.toLowerCase()];
    if (!id) {
      console.log(`  Row ${i + 2}: "${name}" NOT FOUND in DB (skipped)`);
      skipped++;
      return;
    }

    const desc = (row[descIdx] || '').trim();
    const dur = (row[durIdx] || '').trim();
    const critRaw = (row[critIdx] || '').trim();

    if (!desc && !dur && !critRaw) {
      noRules++;
      return; // No rules to save
    }

    const criteriaArr = [];
    if (critRaw) {
      critRaw.split(/[,;\n]/).forEach(item => {
        const parts = item.split(/[:=]/);
        if (parts.length >= 2) {
          criteriaArr.push({ label: parts[0].trim(), mark: parts[1].trim() });
        } else if (parts[0].trim()) {
          criteriaArr.push({ label: parts[0].trim(), mark: '' });
        }
      });
    }

    newRulesMap[id] = {
      description: desc,
      duration: dur,
      criteria: criteriaArr.length > 0 ? criteriaArr : [{ label: '', mark: '' }]
    };
    matched++;
    console.log(`  ✓ "${name}" → ${id} (desc: ${desc ? 'yes' : 'no'}, dur: ${dur ? 'yes' : 'no'})`);
  });

  console.log(`\nMatched: ${matched}, No rules in CSV: ${noRules}, Not in DB: ${skipped}`);

  if (matched === 0) {
    console.log('\nNo rules to save!');
    return;
  }

  // 4. Save to app_settings
  console.log('\nSaving rules to app_settings...');
  const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/app_settings`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify({ key: 'competition_rules', value: JSON.stringify(newRulesMap) })
  });

  if (upsertRes.ok) {
    console.log(`✅ SUCCESS! Saved rules for ${matched} competitions.`);
    console.log(`   ${noRules} competitions have no rules (intentional).`);
  } else {
    console.error('❌ Failed:', await upsertRes.text());
  }
}

fixRules().catch(console.error);
