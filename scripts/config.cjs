function publicConfig(env) {
  const url = env.PUBLIC_SUPABASE_URL;
  const key = env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new Error(
      "PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY are required",
    );
  const parsed = new URL(url);
  if (
    parsed.protocol !== "https:" ||
    !/^[a-z0-9]+\.supabase\.co$/.test(parsed.hostname) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== "/"
  ) {
    throw new Error("Use the HTTPS origin of your Supabase project");
  }
  let publishable = /^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
  if (!publishable) {
    try {
      publishable =
        JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString())
          .role === "anon";
    } catch (_) {
      /* rejected below */
    }
  }
  if (!publishable)
    throw new Error(
      "Only a public anon/publishable key may enter the browser build",
    );
  return { supabaseUrl: parsed.origin, supabaseAnonKey: key };
}
module.exports = { publicConfig };
