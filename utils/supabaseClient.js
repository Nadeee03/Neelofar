// utils/supabaseClient.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://cghcstaoyaguvuxkedys.supabase.co';       // replace with your Supabase URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnaGNzdGFveWFndXZ1eGtlZHlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNzk5NzgsImV4cCI6MjA2Mjg1NTk3OH0.AjEWl55yzfSpj5nOAWHRHgJvE2RCVhkXeKxCr25w84s';          // replace with your anon key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
