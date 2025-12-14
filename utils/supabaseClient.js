
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://cghcstaoyaguvuxkedys.supabase.co';       // replace with your Supabase URL
const SUPABASE_ANON_KEY = 'sb_publishable_ndl3AMemUASbTUt1WCAD3w_gC9iBiOj';          // replace with your anon key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);