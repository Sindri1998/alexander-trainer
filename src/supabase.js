import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://eymbtuqklretgdhimxtk.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5bWJ0dXFrbHJldGdkaGlteHRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMjQxOTUsImV4cCI6MjA5ODYwMDE5NX0.okLxBHzBOFlp0l7nKkGX_RkLd-pnBBreshB7RNwzUyI'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
