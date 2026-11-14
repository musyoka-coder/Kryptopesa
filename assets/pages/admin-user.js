"use strict";
window.KPAdminUser = function({h, badge, fmtDate, device, cryptoAmt}, {rpc, toast, ask, nz, table, txTable, payoutTable, st, show, getMe, getClient}) {
    var drawer = null;
    function openUser(id) {
      if (drawer) { drawer.close(); }
      var dlg = h("dialog", { class: "drawer", "aria-label": "User details" });
      var body = h("div", { class: "drawer-body" }, h("div", { class: "loading", role: "status" }, h("div", { class: "spinner" }), "Loading…"));
      dlg.append(h("div", { class: "drawer-inner" },
        h("div", { class: "drawer-head", id: "dHead" }, h("h2", null, "User")),
        body));
      dlg.addEventListener("close", function () { dlg.remove(); if (drawer === dlg) drawer = null; });
      dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
      document.body.append(dlg); dlg.showModal(); drawer = dlg;

      function refresh() {
        return rpc("admin_user_detail", { p_user: id }).then(function (d) {
          if (!dlg.isConnected) return;
          renderUser(dlg, body, d, id, refresh);
        }).catch(function () {
          if (dlg.isConnected) body.replaceChildren(h("div", { class: "errorbox", role: "alert" }, "Could not load this user.", h("button", { class: "btn", type: "button", onclick: refresh }, "Try again")));
        });
      }
      refresh();
    }

    function renderUser(dlg, body, d, id, refresh) {
      var p = d.profile, c = d.controls || {}, au = d.auth || {};
      var isSelf = p.id === getMe().id;
      var head = dlg.querySelector("#dHead");
      head.replaceChildren(
        h("div", null, h("h2", null, p.username || p.email), h("p", { class: "sub", style: "color:#56657f;word-break:break-all" }, p.email),
          h("div", { class: "actions", style: "margin-top:8px" }, badge(p.account_status), badge("KYC " + p.kyc_status), p.is_admin ? h("span", { class: "badge blue" }, "admin") : null, c.transactions_frozen ? h("span", { class: "badge amber" }, "transactions frozen") : null,
            c.daily_tx_limit !== null && c.daily_tx_limit !== undefined ? h("span", { class: "badge amber" }, "limit " + c.daily_tx_limit + "/day") : null)),
        h("button", { class: "btn small", type: "button", onclick: function () { dlg.close(); }, "aria-label": "Close" }, "✕ Close"));

      function act(fn) { return function () { var b = this; b.disabled = true; Promise.resolve(fn()).then(function (ok) { b.disabled = false; if (ok) { refresh(); if (st.view !== "overview") show(st.view, true); } }, function () { b.disabled = false; }); }; }
      function call(name, args, okMsg) {
        return rpc(name, args).then(function () { toast(okMsg); return true; }).catch(function (e) { toast(e && e.message ? e.message : "Action failed", true); return false; });
      }

      var actions = [];
      if (p.is_admin) actions.push(h("p", { class: "sub", style: "color:#56657f" }, "Admin accounts can only be changed from the database."));
      else {
        if (p.account_status === "active") {
          actions.push(h("button", { class: "btn danger", type: "button", onclick: act(function () {
            return ask({ title: "Suspend this account?", intro: "The user is signed out immediately and cannot log in or transact until you reactivate the account.", danger: true, confirm: "Suspend",
              fields: [{ name: "reason", label: "Reason (kept in the audit log)", type: "textarea", required: true, minLen: 3 }] })
              .then(function (v) { return v ? call("admin_set_account_status", { p_user: id, p_status: "suspended", p_reason: v.reason }, "Account suspended") : false; });
          }) }, "Suspend"));
          actions.push(h("button", { class: "btn", type: "button", onclick: act(function () {
            return ask({ title: "Deactivate this account?", intro: "Use this for accounts that should no longer be used (fake sign-ups, abuse). The user is signed out and blocked.", danger: true, confirm: "Deactivate",
              fields: [{ name: "reason", label: "Reason (kept in the audit log)", type: "textarea", required: true, minLen: 3 }] })
              .then(function (v) { return v ? call("admin_set_account_status", { p_user: id, p_status: "deactivated", p_reason: v.reason }, "Account deactivated") : false; });
          }) }, "Deactivate"));
        } else {
          actions.push(h("button", { class: "btn ok", type: "button", onclick: act(function () {
            return ask({ title: p.account_status === "suspended" ? "Unsuspend this account?" : "Reactivate this account?", intro: "The user will be able to log in and transact again.", confirm: "Reactivate", fields: [] })
              .then(function (v) { return v ? call("admin_set_account_status", { p_user: id, p_status: "active", p_reason: null }, "Account is active again") : false; });
          }) }, p.account_status === "suspended" ? "Unsuspend" : "Reactivate"));
        }
        actions.push(h("button", { class: "btn", type: "button", onclick: act(function () {
          return ask({ title: "Transaction limits", intro: "Freeze all new transactions, or cap how many a user can start in 24 hours. Leave the limit empty for no limit.", confirm: "Save limits",
            fields: [{ name: "frozen", label: "Freeze all new transactions", type: "checkbox", value: !!c.transactions_frozen },
                     { name: "limit", label: "Max transactions per 24 hours", type: "number", min: 0, max: 10000, value: c.daily_tx_limit, placeholder: "No limit" }] })
            .then(function (v) { return v ? call("admin_set_limits", { p_user: id, p_frozen: v.frozen, p_daily_limit: v.limit === "" ? null : v.limit }, "Limits saved") : false; });
        }) }, "Limits"));
        actions.push(h("button", { class: "btn", type: "button", onclick: act(function () {
          return ask({ title: "Change KYC status", intro: "Use this when identity verification needs a manual decision. A note is required for verified or rejected.", confirm: "Update KYC",
            fields: [{ name: "status", label: "KYC status", type: "select", value: p.kyc_status, options: [{ value: "unverified", label: "Unverified" }, { value: "pending", label: "Pending review" }, { value: "verified", label: "Verified" }, { value: "rejected", label: "Rejected" }] },
                     { name: "note", label: "Note (kept in the audit log)", type: "textarea" }] })
            .then(function (v) {
              if (!v) return false;
              return rpc("admin_set_kyc_status", { p_user: id, p_status: v.status, p_note: nz(v.note) })
                .then(async function () {
                  if (v.status === "verified") {
                    try {
                      const result = await getClient().functions.invoke("kyc-notification-dispatch", { body: {} });
                      if (result.error) toast("KYC verified. Email remains queued until delivery is configured.", true);
                      else if (result.data?.sent > 0) toast("KYC verified; notification sent.");
                      else toast("KYC verified; notification queued.");
                    } catch { toast("KYC verified. Notification pending.", true); }
                  } else toast("KYC updated");
                  return true;
                }).catch(function (e) { toast(e?.message || "KYC update failed", true); return false; });
            });
        }) }, "KYC"));
        actions.push(h("button", { class: "btn", type: "button", onclick: act(function () {
          return ask({ title: "Internal note", intro: "Only admins can see this.", confirm: "Save note", fields: [{ name: "note", label: "Note", type: "textarea", value: c.admin_note || "", max: 1000 }] })
            .then(function (v) { return v ? call("admin_set_note", { p_user: id, p_note: v.note }, "Note saved") : false; });
        }) }, "Note"));
      }

      var info = h("dl", { class: "detail-grid" },
        [["User ID", p.id, true], ["Joined", fmtDate(p.created_at)], ["Last sign-in", fmtDate(au.last_sign_in_at)], ["Email confirmed", au.email_confirmed_at ? fmtDate(au.email_confirmed_at) : "No"],
         ["Wallet address", p.wallet_address, true], ["Login blocked", au.banned_until ? "Yes" : "No"], ["Reason on file", c.status_reason], ["Admin note", c.admin_note]].map(function (r) {
          return h("div", null, h("dt", null, r[0]), h("dd", { class: r[2] ? "mono" : "" }, r[1] || "—"));
        }));

      var tabs = [
        { id: "signins", label: "Sign-ins (" + d.logins.length + ")", render: function () { return table([{ label: "Time", render: function (r) { return fmtDate(r.at); } }, { label: "IP address", render: function (r) { return h("span", { class: "mono" }, r.ip || "—"); } }, { label: "Device", render: function (r) { return device(r.user_agent); } }], d.logins, { caption: "Sign-ins", empty: "No sign-ins recorded." }); } },
        { id: "attempts", label: "Attempts (" + d.attempts.length + ")", render: function () { return table([{ label: "Time", render: function (r) { return fmtDate(r.at); } }, { label: "Kind", render: function (r) { return r.kind; } }, { label: "Result", render: function (r) { return h("span", { class: "badge " + (r.success ? "green" : "red") }, r.success ? "success" : "failed"); } }, { label: "IP address", render: function (r) { return h("span", { class: "mono" }, r.ip || "—"); } }], d.attempts, { caption: "Attempts", empty: "No website attempts recorded for this email." }); } },
        { id: "tx", label: "Transactions (" + d.transactions.length + ")", render: function () { return txTable(d.transactions.map(function (t) { return Object.assign({ email: p.email, username: p.username }, t); }), false); } },
        { id: "payouts", label: "Payouts (" + d.payouts.length + ")", render: function () { return payoutTable(d.payouts, false); } },
        { id: "wallets", label: "Wallets (" + d.wallets.length + ")", render: function () { return table([{ label: "Asset", render: function (r) { return r.asset; } }, { label: "Balance", num: true, render: function (r) { return cryptoAmt(r.balance); } }], d.wallets, { caption: "Wallets", empty: "No wallet balances." }); } },
        { id: "history", label: "Admin history (" + d.actions.length + ")", render: function () { return table([{ label: "Time", render: function (r) { return fmtDate(r.at); } }, { label: "Admin", render: function (r) { return r.admin || "—"; } }, { label: "Action", render: function (r) { return String(r.action).replace(/_/g, " "); } }, { label: "Details", render: function (r) { var x = r.details || {}; return Object.keys(x).filter(function (k) { return x[k] !== null && x[k] !== ""; }).map(function (k) { return k + ": " + x[k]; }).join(" · ") || "—"; } }], d.actions, { caption: "Admin history", empty: "No admin actions on this user." }); } }
      ];
      var tabBar = h("div", { class: "tabs", role: "tablist" });
      var tabBody = h("div", { role: "tabpanel", tabindex: "0" });
      function pick(i) {
        Array.prototype.forEach.call(tabBar.children, function (b, j) { b.setAttribute("aria-selected", j === i ? "true" : "false"); });
        tabBody.replaceChildren(tabs[i].render());
      }
      tabs.forEach(function (t, i) { tabBar.append(h("button", { type: "button", role: "tab", "aria-selected": "false", onclick: function () { pick(i); } }, t.label)); });

      body.replaceChildren(
        isSelf ? h("p", { class: "badge blue" }, "This is your own account") : null,
        h("div", { class: "actions" }, actions),
        h("section", { class: "card" }, info),
        h("section", { class: "card" }, tabBar, tabBody));
      pick(2);
    }

return openUser;
};
