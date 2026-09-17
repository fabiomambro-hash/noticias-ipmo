const { SUPABASE_URL, SUPABASE_KEY } = window.IPMO_CONFIG;
window.ipmoSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
