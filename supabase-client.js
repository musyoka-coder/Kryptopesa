// config.js is generated at build time from browser-safe environment variables.
const config = window.KP_CONFIG;
if (!config || !config.supabaseUrl || !config.supabaseAnonKey) {
  throw new Error(
    "KryptoPesa configuration is missing. Run the configured build.",
  );
}
const supabaseClient = window.supabase.createClient(
  config.supabaseUrl,
  config.supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
window.supabaseClient = supabaseClient;
