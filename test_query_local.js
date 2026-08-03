const { createClient } = require('./node_modules/@supabase/supabase-js')

const SUPABASE_URL = 'https://bqmvrhqztxsgjosicsdj.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxbXZyaHF6dHhzZ2pvc2ljc2RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MzkwODksImV4cCI6MjA5OTQxNTA4OX0.ExrJr9AaLGxo4KxybSY9UCPWXcSolz2OAZTGeHnNnUc'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function run() {
  const { data, error } = await supabase.from('competitions')
    .select('*, categories(name), competition_schedule(id, status)')
    .eq('id', 'a7a76a97-9d0e-4059-b9ca-c9b1b2f4e317')
  console.log('Result:', JSON.stringify(data, null, 2))
  console.log('Error:', error)
}
run()
