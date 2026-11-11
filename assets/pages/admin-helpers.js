"use strict";
(function(root, factory) {
 if (typeof module === "object" && module.exports) module.exports = factory;
 else root.KPAdminHelpers = factory(document);
})(typeof window !== "undefined" ? window : this, function(document) {
    var $ = function (s, r) { return (r || document).querySelector(s); };

    function h(tag, attrs) {
      var el = document.createElement(tag);
      attrs = attrs || {};
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === "class") el.className = v;
        else if (k.slice(0, 2) === "on" && typeof v === "function") el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? "" : String(v));
      });
      for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
      return el;
    }
    function append(el, kid) {
      if (kid === null || kid === undefined || kid === false) return;
      if (Array.isArray(kid)) { kid.forEach(function (k) { append(el, k); }); return; }
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }

    var KES = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 });
    var DT = new Intl.DateTimeFormat("en-KE", { timeZone: "Africa/Nairobi", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
    function fmtDate(v) { if (!v) return "—"; var d = new Date(v); return isNaN(d.getTime()) ? "—" : DT.format(d); }
    function ago(v) {
      if (!v) return "never";
      var s = Math.round((Date.now() - new Date(v).getTime()) / 1000);
      if (isNaN(s)) return "—";
      if (s < 60) return "just now";
      if (s < 3600) return Math.floor(s / 60) + " min ago";
      if (s < 86400) return Math.floor(s / 3600) + " h ago";
      return Math.floor(s / 86400) + " d ago";
    }
    function money(v) { var n = Number(v); return isFinite(n) ? KES.format(n) : "—"; }
    function cryptoAmt(v) { var n = Number(v); return isFinite(n) ? n.toLocaleString("en-US", { maximumFractionDigits: 8 }) : "—"; }
    function num(v) { var n = Number(v); return isFinite(n) ? n.toLocaleString("en-KE") : "0"; }
    function device(ua) {
      if (!ua) return "—";
      var b = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
      var o = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Unknown";
      return b + " · " + o;
    }

    var TONE = {
      active: "green", verified: "green", completed: "green", accepted: "blue",
      pending: "amber", processing: "blue", unverified: "", rejected: "red",
      failed: "red", timeout: "red", suspended: "red", deactivated: "red"
    };
    function badge(text) { return h("span", { class: "badge " + (TONE[text] || "") }, text || "—"); }

    /* ---------- block explorer links (fixed domains, validated hash) ---------- */
    var HASH_RE = /^[A-Za-z0-9]{16,128}$/;
    var EXPLORERS = {
      bitcoin: "https://mempool.space/tx/", btc: "https://mempool.space/tx/",
      ethereum: "https://etherscan.io/tx/", eth: "https://etherscan.io/tx/", erc20: "https://etherscan.io/tx/",
      tron: "https://tronscan.org/#/transaction/", trc20: "https://tronscan.org/#/transaction/",
      solana: "https://solscan.io/tx/", sol: "https://solscan.io/tx/",
      worldchain: "https://worldscan.org/tx/", world: "https://worldscan.org/tx/", wld: "https://worldscan.org/tx/",
      bsc: "https://bscscan.com/tx/", bep20: "https://bscscan.com/tx/",
      polygon: "https://polygonscan.com/tx/"
    };
    function explorerUrl(network, asset, hash) {
      if (typeof hash !== "string" || !HASH_RE.test(hash)) return null;
      var n = String(network || "").toLowerCase();
      if (!n) {
        var a = String(asset || "").toUpperCase();
        if (a === "BTC") n = "bitcoin";
        else if (a === "ETH") n = "ethereum";
        else if (a === "SOL") n = "solana";
        else if (a === "WLD") n = "worldchain";
        else if (a === "USDT") n = /^0x[0-9a-fA-F]{64}$/.test(hash) ? "ethereum" : /^[0-9a-fA-F]{64}$/.test(hash) ? "tron" : "";
      }
      var base = Object.hasOwn(EXPLORERS, n) ? EXPLORERS[n] : null;
      return base ? base + encodeURIComponent(hash) : null;
    }
    function chainCell(network, asset, hash) {
      if (!hash) return h("span", { class: "sub" }, "no hash yet");
      var url = explorerUrl(network, asset, hash);
      var short = hash.length > 16 ? hash.slice(0, 8) + "…" + hash.slice(-6) : hash;
      return h("span", null,
        h("span", { class: "mono", title: hash }, short),
        url ? h("a", { href: url, target: "_blank", rel: "noopener noreferrer", class: "sub" }, "View on explorer ↗")
            : h("span", { class: "sub" }, "network unknown"));
    }

return { $, h, fmtDate, ago, money, cryptoAmt, num, device, badge, explorerUrl, chainCell };
});
