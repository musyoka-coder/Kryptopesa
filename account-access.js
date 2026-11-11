/* Client navigation guard. Database RLS and server authorization remain mandatory. */
(function (root) {
  "use strict";
  async function loadActiveAccount(client, timeoutMs = 10000) {
    let timer;
    try {
      return await Promise.race([
        (async () => {
          const verified = await client.auth.getUser();
          const user = verified && verified.data && verified.data.user;
          if (verified.error || !user || !user.email_confirmed_at) {
            return {
              allowed: false,
              reason: "Sign in with a confirmed email address.",
            };
          }
          const result = await client
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();
          if (
            !result ||
            result.error ||
            !result.data ||
            result.data.account_status !== "active"
          ) {
            return {
              allowed: false,
              reason:
                "Account unavailable or inactive. Sign in again or contact support.",
            };
          }
          return { allowed: true, user, profile: result.data };
        })(),
        new Promise((resolve) => {
          timer = setTimeout(
            () =>
              resolve({
                allowed: false,
                reason: "Account checks timed out. Try signing in again.",
              }),
            timeoutMs,
          );
        }),
      ]);
    } catch (_) {
      return {
        allowed: false,
        reason: "Unable to verify your account. Try signing in again.",
      };
    } finally {
      clearTimeout(timer);
    }
  }
  root.KPAccountAccess = Object.freeze({ loadActiveAccount });
  if (typeof module !== "undefined") module.exports = root.KPAccountAccess;
})(globalThis);
