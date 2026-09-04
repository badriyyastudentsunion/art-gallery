// scripts/export-supabase-backup.js
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bqmvrhqztxsgjosicsdj.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxbXZyaHF6dHhzZ2pvc2ljc2RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMTE0ODksImV4cCI6MjA2Nzg4NzQ4OX0.1pQj4x5mX2Y3wz4-1520163351' // We can read from supabase.js

async function main() {
  const { supabase } = await import('../src/lib/supabase.js')
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const backupDir = path.resolve(`./supabase_backup_${timestamp}`)
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  const tables = [
    'teams', 'categories', 'competitions', 'participants',
    'competition_participants', 'settings', 'invigilators', 'judges',
    'announcers', 'stages', 'competition_invigilators', 'competition_judges',
    'point_settings', 'placement_points', 'competition_schedule',
    'competition_reports', 'judge_results', 'competition_results',
    'app_settings', 'gallery_media', 'admins', 'media_presets',
    'award_users', 'poster_templates'
  ]

  let sqlDump = `-- ==============================================\n`
  sqlDump += `-- Inspico Supabase Complete Database Backup\n`
  sqlDump += `-- Date: ${new Date().toISOString()}\n`
  sqlDump += `-- Total Tables: ${tables.length}\n`
  sqlDump += `-- ==============================================\n\n`

  const summary = []

  for (const table of tables) {
    process.stdout.write(`Fetching table: ${table}... `)
    const { data, error } = await supabase.from(table).select('*')
    if (error) {
      console.log(`❌ ERROR: ${error.message}`)
      continue
    }

    const rows = data || []
    console.log(`✅ (${rows.length} rows)`)
    summary.push({ table, rows: rows.length })

    // 1. Save JSON dump for this table
    fs.writeFileSync(path.join(backupDir, `${table}.json`), JSON.stringify(rows, null, 2), 'utf-8')

    // 2. Generate SQL Insert statements
    if (rows.length > 0) {
      sqlDump += `-- ----------------------------------------------\n`
      sqlDump += `-- Table: public.${table} (${rows.length} rows)\n`
      sqlDump += `-- ----------------------------------------------\n`

      for (const row of rows) {
        const columns = Object.keys(row)
        const values = columns.map(col => {
          const val = row[col]
          if (val === null || val === undefined) return 'NULL'
          if (typeof val === 'number' || typeof val === 'boolean') return `${val}`
          if (typeof val === 'object') {
            const escaped = JSON.stringify(val).replace(/'/g, "''")
            return `'${escaped}'::jsonb`
          }
          const str = String(val).replace(/'/g, "''")
          return `'${str}'`
        })

        sqlDump += `INSERT INTO public.${table} (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;\n`
      }
      sqlDump += `\n`
    }
  }

  const sqlFilePath = path.join(backupDir, 'full_database_dump.sql')
  fs.writeFileSync(sqlFilePath, sqlDump, 'utf-8')

  const summaryFilePath = path.join(backupDir, 'backup_summary.json')
  fs.writeFileSync(summaryFilePath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalTables: tables.length,
    summary
  }, null, 2), 'utf-8')

  console.log(`\n🎉 BACKUP SUCCESSFUL!`)
  console.log(`📁 Saved to: ${backupDir}`)
  console.log(`📄 SQL File: ${sqlFilePath}`)
}

main().catch(err => {
  console.error('Fatal backup error:', err)
  process.exit(1)
})
