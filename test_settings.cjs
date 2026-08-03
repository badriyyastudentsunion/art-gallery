const { createClient } = require('./node_modules/@supabase/supabase-js')

const SUPABASE_URL = 'https://bqmvrhqztxsgjosicsdj.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxbXZyaHF6dHhzZ2pvc2ljc2RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MzkwODksImV4cCI6MjA5OTQxNTA4OX0.ExrJr9AaLGxo4KxybSY9UCPWXcSolz2OAZTGeHnNnUc'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function run() {
  const { data: settings, error: err1 } = await supabase.from('settings').select('*')
  console.log('Settings:', settings)
  console.log('Error 1:', err1)

  const { data: app_settings, error: err2 } = await supabase.from('app_settings').select('*')
  console.log('App Settings:', app_settings)
  console.log('Error 2:', err2)
}
run()
