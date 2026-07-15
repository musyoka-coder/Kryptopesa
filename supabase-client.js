// supabase-client.js
// Include this AFTER the Supabase CDN script in every HTML page:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
// <script src="supabase-client.js"></script>

const SUPABASE_URL = "https://tpqpzzmqmsspmtmulecq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwcXB6em1xbXNzcG10bXVsZWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMjA0MDksImV4cCI6MjA5OTU5NjQwOX0.L7Mh0Qz_6bFkrKi6t-TEga1P7ZVENm0OlnrljOFtStY"; // safe to expose in frontend

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
