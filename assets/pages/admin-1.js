"use strict";
  (function () {

    /* =====================================================
       Helpers
       Every value from the database is inserted with
       textContent / createTextNode — never as HTML.
    ===================================================== */
    var { $, h, fmtDate, ago, money, cryptoAmt, num, device, badge, explorerUrl, chainCell } = window.KPAdminHelpers;
    function toast(msg, isErr) {
      var t = h("div", { class: "toast" + (isErr ? " err" : "") }, msg);
      $("#toasts").append(t);
      setTimeout(function () { t.remove(); }, isErr ? 6500 : 3500);
    }

    /* =====================================================
       Supabase access (all data comes from admin_* RPCs,
       which re-check admin rights on the server)
    ===================================================== */
    var sb = null;
    function denied(msg) {
      $("#app").hidden = true;
      var g = $("#gate");
      g.hidden = false;
      g.replaceChildren(h("div", { class: "box" },
        h("h1", null, msg || "Access denied"),
        h("p", null, "This area is only for KryptoPesa administrators."),
        h("a", { class: "btn primary", href: "index.html" }, "Back to home")));
    }
    function rpc(name, args) {
      return sb.rpc(name, args || {}).then(function (res) {
        if (res.error) {
          var e = res.error;
          if (e.code === "42501" || /forbidden|permission denied/i.test(e.message || "")) denied();
          if (/JWT|expired/i.test(e.message || "")) { location.replace("login.html"); }
          throw e;
        }
        return res.data;
      });
    }
    function nz(v) { return v === "" || v === undefined ? null : v; }

    /* =====================================================
       Charts (plain SVG, no libraries)
    ===================================================== */
    var {lineChart, barChart, donut} = window.KPAdminCharts;
    /* =====================================================
       Reusable UI: tables, pager, modals
    ===================================================== */
    var {table, pager, userLink, ask} = window.KPAdminUI(window.KPAdminHelpers, function(id) { openUser(id); });
    /* =====================================================
       Views
    ===================================================== */
    var main, seq = 0;
    var VIEWS = [
      { id: "overview", label: "Overview", ico: "◧" },
      { id: "users", label: "Users", ico: "☺" },
      { id: "transactions", label: "Transactions", ico: "⇄" },
      { id: "payouts", label: "M-Pesa payouts", ico: "☎" },
      { id: "logins", label: "Sign-ins", ico: "→" },
      { id: "attempts", label: "Failed attempts", ico: "⚠" },
      { id: "audit", label: "Audit log", ico: "☰" }
    ];
    var st = {
      view: "overview", days: 30, badges: {},
      users: { q: "", status: "", kyc: "", offset: 0, limit: 25 },
      tx: { q: "", status: "", type: "", offset: 0, limit: 25 },
      payouts: { status: "", offset: 0, limit: 25 },
      logins: { q: "", offset: 0, limit: 50 },
      attempts: { all: false, kind: "", offset: 0, limit: 50 },
      audit: { offset: 0, limit: 50 }
    };

    function head(title, sub, tools) {
      return h("div", { class: "page-head" }, h("div", null, h("h1", null, title), sub ? h("p", null, sub) : null),
        h("div", { class: "tools" }, tools, h("button", { class: "btn", type: "button", onclick: function () { show(st.view); } }, "↻ Refresh")));
    }
    function loading() { main.replaceChildren(h("div", { class: "loading", role: "status" }, h("div", { class: "spinner", "aria-hidden": "true" }), "Loading…")); }
    function failed(my, e) {
      if (my !== seq) return;
      main.replaceChildren(h("div", { class: "errorbox", role: "alert" },
        h("strong", null, "Could not load this page."),
        h("span", null, "Check your connection and try again. If it keeps happening, sign out and back in."),
        h("button", { class: "btn", type: "button", onclick: function () { show(st.view); } }, "Try again")));
      if (window.console) console.error("Admin load failed:", e && e.message);
    }
    function field(label, ctl, cls) { return h("div", { class: "field " + (cls || "") }, h("label", null, label), ctl); }
    function debounce(fn, ms) { var t; return function () { var a = arguments; clearTimeout(t); t = setTimeout(function () { fn.apply(null, a); }, ms); }; }

    /* ---------- Overview ---------- */
    function viewOverview() {
      var my = ++seq; loading();
      rpc("admin_overview", { p_days: st.days }).then(function (d) {
        if (my !== seq) return;
        var u = d.users, t = d.transactions, p = d.payouts, a = d.attempts_24h;
        st.badges = { attempts: a.failed_login + a.failed_signup, users: u.kyc.pending, tx: t.failed_24h };
        renderNav();
        var days = d.daily.map(function (x) { return x.day; });
        var sel = h("select", { "aria-label": "Chart period", onchange: function () { st.days = Number(this.value); viewOverview(); } },
          [7, 30, 90].map(function (n) { return h("option", { value: n }, "Last " + n + " days"); }));
        sel.value = String(st.days);
        function kpi(label, value, sub, tone) { return h("div", { class: "kpi " + (tone || "") }, h("div", { class: "label" }, label), h("div", { class: "value" }, value), h("div", { class: "sub" }, sub || "")); }
        function go(v, extra) { return function () { if (extra) extra(); nav(v); }; }
        main.replaceChildren(
          head("Overview", "Everything happening on KryptoPesa. Times are East Africa Time.", sel),
          h("div", { class: "grid-kpi" },
            kpi("Users", num(u.total), "+" + num(u.new_7d) + " in the last 7 days"),
            kpi("Sign-ins (24 h)", num(d.logins_24h), "successful logins"),
            kpi("Transactions", num(t.total), num(t.pending + t.processing) + " in progress"),
            kpi("Completed volume", money(t.kes_completed), "all time, KES", "good"),
            kpi("Failed (24 h)", num(t.failed_24h), num(t.failed) + " failed overall", t.failed_24h ? "warn" : ""),
            kpi("Failed attempts (24 h)", num(a.failed_login + a.failed_signup), num(a.failed_ips) + " IP addresses", (a.failed_login + a.failed_signup) ? "warn" : ""),
            kpi("Suspended / deactivated", num(u.status.suspended + u.status.deactivated), num(u.frozen) + " with frozen transactions"),
            kpi("M-Pesa payouts", num(p.completed), money(p.kes_completed) + " paid · " + num(p.failed) + " failed")),
          h("div", { class: "grid-charts" },
            h("section", { class: "card chart" }, h("h2", null, "Transactions per day"), h("p", { class: "hint" }, "All, completed and failed"),
              lineChart(days, [
                { name: "All", color: "#1769ff", values: d.daily.map(function (x) { return x.tx; }) },
                { name: "Completed", color: "#12875a", values: d.daily.map(function (x) { return x.completed; }) },
                { name: "Failed", color: "#c93232", values: d.daily.map(function (x) { return x.failed; }) }], "Transactions per day")),
            h("section", { class: "card chart" }, h("h2", null, "Completed volume per day"), h("p", { class: "hint" }, "Kenyan Shillings paid out"),
              barChart(days, d.daily.map(function (x) { return x.kes; }), "#1769ff", "KES", function (v) { return money(v); }, "Completed volume per day in KES")),
            h("section", { class: "card chart" }, h("h2", null, "Sign-ups and sign-ins"), h("p", { class: "hint" }, "New accounts and logins per day"),
              lineChart(days, [
                { name: "Sign-ups", color: "#e6b900", values: d.daily.map(function (x) { return x.signups; }) },
                { name: "Sign-ins", color: "#12366d", values: d.daily.map(function (x) { return x.logins; }) }], "Sign-ups and sign-ins per day")),
            h("section", { class: "card chart" }, h("h2", null, "Transactions by asset"), h("p", { class: "hint" }, "Number of transactions per cryptocurrency"),
              barChart(d.by_asset.map(function (x) { return x.asset; }), d.by_asset.map(function (x) { return x.count; }), "#4f8cff", "Transactions", num, "Transactions by asset")),
            h("section", { class: "card chart" }, h("h2", null, "Transaction status"),
              donut([{ label: "Completed", value: t.completed, color: "#12875a" }, { label: "Processing", value: t.processing, color: "#1769ff" },
                     { label: "Pending", value: t.pending, color: "#e6b900" }, { label: "Failed", value: t.failed, color: "#c93232" }], "Transaction status")),
            h("section", { class: "card chart" }, h("h2", null, "KYC status"),
              donut([{ label: "Verified", value: u.kyc.verified, color: "#12875a" }, { label: "Pending", value: u.kyc.pending, color: "#e6b900" },
                     { label: "Rejected", value: u.kyc.rejected, color: "#c93232" }, { label: "Unverified", value: u.kyc.unverified, color: "#9aa6bb" }], "KYC status")),
            h("section", { class: "card chart" }, h("h2", null, "Account status"),
              donut([{ label: "Active", value: u.status.active, color: "#12875a" }, { label: "Suspended", value: u.status.suspended, color: "#e6b900" },
                     { label: "Deactivated", value: u.status.deactivated, color: "#c93232" }], "Account status")),
            h("section", { class: "card" }, h("h2", null, "Needs attention"), h("p", { class: "hint" }, "Jump straight to what matters"),
              h("ul", { class: "attn" },
                h("li", null, h("button", { type: "button", onclick: go("transactions", function () { st.tx.status = "failed"; st.tx.offset = 0; }) }, "Failed transactions", h("span", { class: "pill-n " + (t.failed ? "bad" : "good") }, num(t.failed)))),
                h("li", null, h("button", { type: "button", onclick: go("users", function () { st.users.kyc = "pending"; st.users.offset = 0; }) }, "KYC waiting for review", h("span", { class: "pill-n " + (u.kyc.pending ? "bad" : "good") }, num(u.kyc.pending)))),
                h("li", null, h("button", { type: "button", onclick: go("users", function () { st.users.kyc = "rejected"; st.users.offset = 0; }) }, "KYC rejected", h("span", { class: "pill-n" }, num(u.kyc.rejected)))),
                h("li", null, h("button", { type: "button", onclick: go("payouts", function () { st.payouts.status = "failed"; st.payouts.offset = 0; }) }, "Failed M-Pesa payouts", h("span", { class: "pill-n " + (p.failed ? "bad" : "good") }, num(p.failed)))),
                h("li", null, h("button", { type: "button", onclick: go("attempts") }, "Failed sign-in / sign-up attempts (24 h)", h("span", { class: "pill-n " + ((a.failed_login + a.failed_signup) ? "bad" : "good") }, num(a.failed_login + a.failed_signup)))),
                h("li", null, h("button", { type: "button", onclick: go("users", function () { st.users.status = "suspended"; st.users.offset = 0; }) }, "Suspended accounts", h("span", { class: "pill-n" }, num(u.status.suspended))))))));
      }).catch(function (e) { failed(my, e); });
    }

    /* ---------- Users ---------- */
    function viewUsers() {
      var my = ++seq, f = st.users;
      var q = h("input", { type: "search", value: f.q, placeholder: "Search name, email or user ID", "aria-label": "Search users" });
      q.addEventListener("input", debounce(function () { f.q = q.value; f.offset = 0; loadUsers(); }, 350));
      var ss = h("select", { "aria-label": "Account status", onchange: function () { f.status = this.value; f.offset = 0; loadUsers(); } },
        [["", "All statuses"], ["active", "Active"], ["suspended", "Suspended"], ["deactivated", "Deactivated"]].map(function (o) { return h("option", { value: o[0] }, o[1]); }));
      var ks = h("select", { "aria-label": "KYC status", onchange: function () { f.kyc = this.value; f.offset = 0; loadUsers(); } },
        [["", "All KYC"], ["unverified", "Unverified"], ["pending", "Pending"], ["verified", "Verified"], ["rejected", "Rejected"]].map(function (o) { return h("option", { value: o[0] }, o[1]); }));
      ss.value = f.status; ks.value = f.kyc;
      var box = h("div", { "aria-live": "polite" });
      main.replaceChildren(head("Users", "Search, review and manage every account."),
        h("div", { class: "filters" }, field("Search", q, "grow"), field("Status", ss), field("KYC", ks)), box);
      function loadUsers() {
        var my2 = ++seq;
        box.replaceChildren(h("div", { class: "loading", role: "status" }, h("div", { class: "spinner" }), "Loading…"));
        rpc("admin_users", { p_search: nz(f.q), p_status: nz(f.status), p_kyc: nz(f.kyc), p_limit: f.limit, p_offset: f.offset }).then(function (d) {
          if (my2 !== seq) return;
          box.replaceChildren(table([
            { label: "User", render: function (r) { return userLink(r.id, r.username, r.email); } },
            { label: "KYC", render: function (r) { return badge(r.kyc_status); } },
            { label: "Status", render: function (r) { return h("span", null, badge(r.account_status), r.is_admin ? h("span", { class: "badge blue" }, "admin") : null, r.frozen ? h("span", { class: "badge amber" }, "frozen") : null); } },
            { label: "Last sign-in", render: function (r) { return h("span", null, fmtDate(r.last_sign_in_at), h("span", { class: "sub" }, ago(r.last_sign_in_at))); } },
            { label: "Last IP / device", render: function (r) { return h("span", null, h("span", { class: "mono" }, r.last_ip || "—"), h("span", { class: "sub" }, device(r.last_user_agent))); } },
            { label: "Transactions", num: true, render: function (r) { return h("span", null, num(r.tx_count), r.tx_failed ? h("span", { class: "sub", style: "color:#c93232" }, num(r.tx_failed) + " failed") : null); } },
            { label: "Joined", render: function (r) { return fmtDate(r.created_at); } },
            { label: "", render: function (r) { return h("button", { class: "btn small", type: "button", onclick: function () { openUser(r.id); } }, "Manage"); } }
          ], d.rows, { caption: "Users", empty: "No users match your filters." }), pager(d.total, f, loadUsers));
        }).catch(function () { if (my2 === seq) box.replaceChildren(h("div", { class: "errorbox", role: "alert" }, "Could not load users.", h("button", { class: "btn", type: "button", onclick: loadUsers }, "Try again"))); });
      }
      loadUsers();
    }

    /* ---------- Transactions ---------- */
    function txTable(rows, withUser) {
      var cols = [
        { label: "Time", render: function (r) { return h("span", null, fmtDate(r.created_at), h("span", { class: "sub" }, ago(r.created_at))); } }
      ];
      if (withUser) cols.push({ label: "User", render: function (r) { return userLink(r.user_id, r.username, r.email); } });
      cols.push(
        { label: "Type", render: function (r) { return String(r.type || "").replace(/_/g, " "); } },
        { label: "Asset", render: function (r) { return r.asset || "—"; } },
        { label: "Crypto", num: true, render: function (r) { return cryptoAmt(r.crypto_amount); } },
        { label: "KES", num: true, render: function (r) { return r.kes_amount === null || r.kes_amount === undefined ? "—" : money(r.kes_amount); } },
        { label: "Status", render: function (r) { return h("span", null, badge(r.status), r.failure_reason ? h("span", { class: "sub", style: "color:#c93232" }, r.failure_reason) : null); } },
        { label: "M-Pesa receipt", render: function (r) { return r.mpesa_receipt ? h("span", { class: "mono" }, r.mpesa_receipt) : "—"; } },
        { label: "Blockchain", render: function (r) { return chainCell(r.network, r.asset, r.tx_hash); } },
        { label: "", render: function (r, tr) {
            return h("button", { class: "btn small", type: "button", "aria-expanded": "false", onclick: function () {
              var open = tr.nextSibling && tr.nextSibling.classList && tr.nextSibling.classList.contains("detail-row");
              if (open) { tr.nextSibling.remove(); this.setAttribute("aria-expanded", "false"); this.textContent = "Details"; return; }
              var dl = h("dl", { class: "detail-grid" },
                [["Transaction ID", r.id], ["M-Pesa number", r.mpesa_number], ["Daraja checkout ID", r.daraja_checkout_id], ["Network", r.network],
                 ["Last updated", fmtDate(r.updated_at)], ["Failure reason", r.failure_reason]].map(function (p) {
                  return h("div", null, h("dt", null, p[0]), h("dd", { class: /ID|number/.test(p[0]) ? "mono" : "" }, p[1] || "—"));
                }));
              var dr = h("tr", { class: "detail-row" }, h("td", { colspan: cols.length }, dl));
              tr.after(dr); this.setAttribute("aria-expanded", "true"); this.textContent = "Hide";
            } }, "Details");
          } });
      return table(cols, rows, { caption: "Transactions", empty: "No transactions found.", rowClass: function (r) { return r.status === "failed" ? "row-failed" : ""; } });
    }
    function viewTransactions() {
      var my = ++seq, f = st.tx;
      var q = h("input", { type: "search", value: f.q, placeholder: "User, M-Pesa receipt, transaction hash or ID", "aria-label": "Search transactions" });
      q.addEventListener("input", debounce(function () { f.q = q.value; f.offset = 0; load(); }, 350));
      var ss = h("select", { "aria-label": "Status", onchange: function () { f.status = this.value; f.offset = 0; load(); } },
        [["", "All statuses"], ["pending", "Pending"], ["processing", "Processing"], ["completed", "Completed"], ["failed", "Failed"]].map(function (o) { return h("option", { value: o[0] }, o[1]); }));
      var ts = h("select", { "aria-label": "Type", onchange: function () { f.type = this.value; f.offset = 0; load(); } },
        [["", "All types"], ["deposit", "Deposit"], ["swap_to_mpesa", "Swap to M-Pesa"], ["withdrawal", "Withdrawal"]].map(function (o) { return h("option", { value: o[0] }, o[1]); }));
      ss.value = f.status; ts.value = f.type;
      var box = h("div", { "aria-live": "polite" });
      main.replaceChildren(head("Transactions", "Every deposit, swap and withdrawal. Failed ones are marked in red."),
        h("div", { class: "filters" }, field("Search", q, "grow"), field("Status", ss), field("Type", ts)), box);
      function load() {
        var my2 = ++seq;
        box.replaceChildren(h("div", { class: "loading", role: "status" }, h("div", { class: "spinner" }), "Loading…"));
        rpc("admin_transactions", { p_status: nz(f.status), p_type: nz(f.type), p_search: nz(f.q), p_limit: f.limit, p_offset: f.offset }).then(function (d) {
          if (my2 !== seq) return;
          box.replaceChildren(txTable(d.rows, true), pager(d.total, f, load));
        }).catch(function () { if (my2 === seq) box.replaceChildren(h("div", { class: "errorbox", role: "alert" }, "Could not load transactions.", h("button", { class: "btn", type: "button", onclick: load }, "Try again"))); });
      }
      load();
    }

    /* ---------- Payouts ---------- */
    function payoutTable(rows, withUser) {
      var cols = [{ label: "Time", render: function (r) { return fmtDate(r.created_at); } }];
      if (withUser) cols.push({ label: "User", render: function (r) { return userLink(r.user_id, r.username, r.email); } });
      cols.push(
        { label: "Phone", render: function (r) { return h("span", { class: "mono" }, r.phone_number || "—"); } },
        { label: "Amount", num: true, render: function (r) { return money(r.amount_kes); } },
        { label: "Crypto", render: function (r) { return cryptoAmt(r.crypto_amount) + " " + (r.crypto_asset || ""); } },
        { label: "Status", render: function (r) { return h("span", null, badge(r.status), r.failure_reason ? h("span", { class: "sub", style: "color:#c93232" }, r.failure_reason) : null); } },
        { label: "M-Pesa receipt", render: function (r) { return r.mpesa_receipt_number ? h("span", { class: "mono" }, r.mpesa_receipt_number) : "—"; } },
        { label: "Blockchain", render: function (r) { return chainCell(null, r.crypto_asset, r.crypto_tx_reference); } });
      return table(cols, rows, { caption: "M-Pesa payouts", empty: "No payouts found.", rowClass: function (r) { return /failed|timeout/.test(r.status) ? "row-failed" : ""; } });
    }
    function viewPayouts() {
      var my = ++seq, f = st.payouts;
      var ss = h("select", { "aria-label": "Status", onchange: function () { f.status = this.value; f.offset = 0; load(); } },
        [["", "All statuses"], ["pending", "Pending"], ["accepted", "Accepted"], ["completed", "Completed"], ["failed", "Failed"], ["timeout", "Timed out"]].map(function (o) { return h("option", { value: o[0] }, o[1]); }));
      ss.value = f.status;
      var box = h("div", { "aria-live": "polite" });
      main.replaceChildren(head("M-Pesa payouts", "Money sent to users' phones."), h("div", { class: "filters" }, field("Status", ss)), box);
      function load() {
        var my2 = ++seq;
        box.replaceChildren(h("div", { class: "loading", role: "status" }, h("div", { class: "spinner" }), "Loading…"));
        rpc("admin_payouts", { p_status: nz(f.status), p_limit: f.limit, p_offset: f.offset }).then(function (d) {
          if (my2 !== seq) return;
          box.replaceChildren(payoutTable(d.rows, true), pager(d.total, f, load));
        }).catch(function () { if (my2 === seq) box.replaceChildren(h("div", { class: "errorbox", role: "alert" }, "Could not load payouts.", h("button", { class: "btn", type: "button", onclick: load }, "Try again"))); });
      }
      load();
    }

    /* ---------- Sign-ins ---------- */
    function viewLogins() {
      var my = ++seq, f = st.logins;
      var q = h("input", { type: "search", value: f.q, placeholder: "Search user, email or IP address", "aria-label": "Search sign-ins" });
      q.addEventListener("input", debounce(function () { f.q = q.value; f.offset = 0; load(); }, 350));
      var box = h("div", { "aria-live": "polite" });
      main.replaceChildren(head("Sign-ins", "When each user logged in, from which IP address and device."), h("div", { class: "filters" }, field("Search", q, "grow")), box);
      function load() {
        var my2 = ++seq;
        box.replaceChildren(h("div", { class: "loading", role: "status" }, h("div", { class: "spinner" }), "Loading…"));
        rpc("admin_logins", { p_search: nz(f.q), p_limit: f.limit, p_offset: f.offset }).then(function (d) {
          if (my2 !== seq) return;
          box.replaceChildren(table([
            { label: "Time", render: function (r) { return h("span", null, fmtDate(r.at), h("span", { class: "sub" }, ago(r.at))); } },
            { label: "User", render: function (r) { return r.user_id ? userLink(r.user_id, r.username, r.email) : "—"; } },
            { label: "IP address", render: function (r) { return h("span", { class: "mono" }, r.ip || "—"); } },
            { label: "Device", render: function (r) { return h("span", { title: r.user_agent || "" }, device(r.user_agent)); } }
          ], d.rows, { caption: "Sign-ins", empty: "No sign-ins recorded yet." }), pager(d.total, f, load));
        }).catch(function () { if (my2 === seq) box.replaceChildren(h("div", { class: "errorbox", role: "alert" }, "Could not load sign-ins.", h("button", { class: "btn", type: "button", onclick: load }, "Try again"))); });
      }
      load();
    }

    /* ---------- Failed attempts ---------- */
    function viewAttempts() {
      var my = ++seq, f = st.attempts;
      var all = h("input", { type: "checkbox", id: "allAtt" }); all.checked = f.all;
      all.addEventListener("change", function () { f.all = all.checked; f.offset = 0; load(); });
      var ks = h("select", { "aria-label": "Kind", onchange: function () { f.kind = this.value; f.offset = 0; load(); } },
        [["", "Logins and sign-ups"], ["login", "Logins"], ["signup", "Sign-ups"], ["reset", "Password resets"]].map(function (o) { return h("option", { value: o[0] }, o[1]); }));
      ks.value = f.kind;
      var box = h("div", { "aria-live": "polite" });
      main.replaceChildren(head("Failed attempts", "Sign-in and sign-up attempts made through the KryptoPesa website, with the number of tries per IP address and email."),
        h("div", { class: "filters" }, field("Kind", ks), h("div", { class: "check" }, all, h("label", { for: "allAtt" }, "Include successful attempts"))), box);
      function load() {
        var my2 = ++seq;
        box.replaceChildren(h("div", { class: "loading", role: "status" }, h("div", { class: "spinner" }), "Loading…"));
        rpc("admin_attempts", { p_failed_only: !f.all, p_kind: nz(f.kind), p_limit: f.limit, p_offset: f.offset }).then(function (d) {
          if (my2 !== seq) return;
          var tops = h("div", { class: "grid-charts" },
            h("section", { class: "card" }, h("h2", null, "Most failures by IP (24 h)"),
              d.top_ips.length ? table([{ label: "IP address", render: function (r) { return h("span", { class: "mono" }, r.ip); } }, { label: "Failures", num: true, render: function (r) { return num(r.failures); } }, { label: "Last", render: function (r) { return ago(r.last_at); } }], d.top_ips, { caption: "Top failing IPs" }) : h("div", { class: "empty" }, "No failures in the last 24 hours.")),
            h("section", { class: "card" }, h("h2", null, "Most failures by email (24 h)"),
              d.top_emails.length ? table([{ label: "Email", render: function (r) { return r.email; } }, { label: "Failures", num: true, render: function (r) { return num(r.failures); } }, { label: "Last", render: function (r) { return ago(r.last_at); } }], d.top_emails, { caption: "Top failing emails" }) : h("div", { class: "empty" }, "No failures in the last 24 hours.")));
          box.replaceChildren(tops, table([
            { label: "Time", render: function (r) { return h("span", null, fmtDate(r.at), h("span", { class: "sub" }, ago(r.at))); } },
            { label: "Kind", render: function (r) { return r.kind; } },
            { label: "Result", render: function (r) { return h("span", { class: "badge " + (r.success ? "green" : "red") }, r.success ? "success" : "failed"); } },
            { label: "Email", render: function (r) { return r.email || "—"; } },
            { label: "IP address", render: function (r) { return h("span", { class: "mono" }, r.ip || "—"); } },
            { label: "Device", render: function (r) { return device(r.user_agent); } }
          ], d.rows, { caption: "Attempts", empty: "No attempts recorded yet." }), pager(d.total, f, load),
            h("p", { class: "hint", style: "margin-top:14px;color:#56657f;font-size:.82rem" }, "Only attempts made through the KryptoPesa login and sign-up pages are recorded here. Direct calls to the authentication API do not appear."));
        }).catch(function () { if (my2 === seq) box.replaceChildren(h("div", { class: "errorbox", role: "alert" }, "Could not load attempts.", h("button", { class: "btn", type: "button", onclick: load }, "Try again"))); });
      }
      load();
    }

    /* ---------- Audit ---------- */
    function viewAudit() {
      var my = ++seq, f = st.audit;
      var box = h("div", { "aria-live": "polite" });
      main.replaceChildren(head("Audit log", "Every action an admin has taken. This cannot be edited."), box);
      function load() {
        var my2 = ++seq;
        box.replaceChildren(h("div", { class: "loading", role: "status" }, h("div", { class: "spinner" }), "Loading…"));
        rpc("admin_audit", { p_limit: f.limit, p_offset: f.offset }).then(function (d) {
          if (my2 !== seq) return;
          box.replaceChildren(table([
            { label: "Time", render: function (r) { return fmtDate(r.at); } },
            { label: "Admin", render: function (r) { return r.admin || "—"; } },
            { label: "Action", render: function (r) { return String(r.action || "").replace(/_/g, " "); } },
            { label: "Target user", render: function (r) { return r.target_id ? userLink(r.target_id, r.target, null) : "—"; } },
            { label: "Details", render: function (r) { var d2 = r.details || {}; return Object.keys(d2).filter(function (k) { return d2[k] !== null && d2[k] !== ""; }).map(function (k) { return k + ": " + d2[k]; }).join(" · ") || "—"; } }
          ], d.rows, { caption: "Audit log", empty: "No admin actions yet." }), pager(d.total, f, load));
        }).catch(function () { if (my2 === seq) box.replaceChildren(h("div", { class: "errorbox", role: "alert" }, "Could not load the audit log.", h("button", { class: "btn", type: "button", onclick: load }, "Try again"))); });
      }
      load();
    }

    /* =====================================================
       User drawer: details and admin actions
    ===================================================== */
    var openUser = window.KPAdminUser(window.KPAdminHelpers, {rpc, toast, ask, nz, table, txTable, payoutTable, st, show, getMe: function() { return me; }, getClient: function() { return sb; }});
    /* =====================================================
       Navigation and boot
    ===================================================== */
    var me = null;
    function renderNav() {
      var nav = $("#nav");
      nav.replaceChildren.apply(nav, VIEWS.map(function (v) {
        var count = v.id === "attempts" ? st.badges.attempts : v.id === "users" ? st.badges.users : v.id === "transactions" ? st.badges.tx : 0;
        return h("button", { type: "button", "aria-current": st.view === v.id ? "page" : null, onclick: function () { nav2(v.id); } },
          h("span", { class: "ico", "aria-hidden": "true" }, v.ico), v.label, count ? h("span", { class: "count", "aria-label": count + " need attention" }, count > 99 ? "99+" : String(count)) : null);
      }));
    }
    function nav2(id) { if (location.hash !== "#" + id) location.hash = id; else show(id); }
    function nav(id) { nav2(id); }
    var RENDER = { overview: viewOverview, users: viewUsers, transactions: viewTransactions, payouts: viewPayouts, logins: viewLogins, attempts: viewAttempts, audit: viewAudit };
    function show(id, keepScroll) {
      if (!RENDER[id]) id = "overview";
      st.view = id; renderNav();
      var y = window.scrollY;
      RENDER[id]();
      if (!keepScroll) { main.focus({ preventScroll: true }); window.scrollTo(0, 0); } else { window.scrollTo(0, y); }
    }
    window.addEventListener("hashchange", function () { if (me) show(location.hash.slice(1)); });

    function signOut() { window.KPSession.clear(); sb.auth.signOut().then(function () { location.replace("login.html"); }, function () { location.replace("login.html"); }); }

    function boot() {
      if (typeof supabaseClient === "undefined" || !supabaseClient || !supabaseClient.auth) {
        denied("Cannot reach the sign-in service"); return;
      }
      sb = supabaseClient;
      sb.auth.getSession().then(function (r) {
        var session = r && r.data && r.data.session;
        if (!session) { location.replace("login.html"); return null; }
        if(window.KPSession.expired()){window.KPSession.clear();return sb.auth.signOut({scope:"local"}).then(function(){location.replace("login.html?session=expired");return null;});}
        window.KPSession.start();
        return sb.from("profiles").select("id,email,username,is_admin,account_status").eq("id", session.user.id).maybeSingle();
      }).then(function (r) {
        if (r === null || r === undefined) return;
        if (r.error || !r.data || !r.data.is_admin || r.data.account_status !== "active") { denied(); return; }
        me = r.data;
        $("#meName").textContent = me.username || "Admin";
        $("#meEmail").textContent = me.email || "";
        $("#signOut").addEventListener("click", signOut);
        $("#signOutMobile").addEventListener("click", signOut);
        main = $("#main");
        $("#gate").hidden = true; $("#app").hidden = false;
        sb.auth.onAuthStateChange(function (ev) { if (ev === "SIGNED_OUT") location.replace("login.html"); });
        show(location.hash.slice(1) || "overview");
        // Refresh KYC counts and user rows while the admin tab is visible.
        window.setInterval(function () {
          if (document.visibilityState === "visible" && (st.view === "overview" || st.view === "users")) show(st.view, true);
        }, 30000);
      }).catch(function () { denied("Something went wrong"); });
    }
    boot();


  })();
