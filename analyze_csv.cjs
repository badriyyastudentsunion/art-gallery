const fs = require('fs');
const text = fs.readFileSync('C:/Users/RYZEN7/Downloads/competitions_final_fixed_v2.csv', 'utf8');

function parseCSV(t) {
  const lines = t.trim().split(/\r?\n/);
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

const rows = parseCSV(text);
const headers = rows[0].map(h => h.replace(/^\uFEFF/, '').trim().toLowerCase());
console.log('Headers:', headers);
console.log('Header count:', headers.length);

const descIdx = headers.indexOf('rules_description');
const durIdx = headers.indexOf('rules_duration');
const critIdx = headers.indexOf('mark_criteria');
const nameIdx = headers.indexOf('name');

console.log('rules_description column index:', descIdx);
console.log('rules_duration column index:', durIdx);
console.log('mark_criteria column index:', critIdx);

let hasRules = 0, noRules = 0;
rows.slice(1).forEach((row, i) => {
  const name = row[nameIdx] || '';
  const desc = row[descIdx] || '';
  const dur = row[durIdx] || '';
  const crit = row[critIdx] || '';
  if (!name.trim()) return;
  if (desc.trim() || dur.trim() || crit.trim()) {
    hasRules++;
  } else {
    noRules++;
    if (noRules <= 10) console.log('NO RULES - row', i+2, '| Name:', name, '| total cols in row:', row.length);
  }
});
console.log('\nTotal has rules:', hasRules, '  No rules (genuinely empty):', noRules);
