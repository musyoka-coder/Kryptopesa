(function () {
      'use strict';

      var MIN_KES = 100;
      var MAX_KES = 300000;

      var CMETA = {
        BTC: { name: 'Bitcoin', sym: 'BTC', icon: '₿', bg: '#f7931a', stream: 'BTCUSDT' },
        ETH: { name: 'Ethereum', sym: 'ETH', icon: 'Ξ', bg: '#627eea', stream: 'ETHUSDT' },
        SOL: { name: 'Solana', sym: 'SOL', icon: '◎', bg: '#9945ff', stream: 'SOLUSDT' },
        USDT: { name: 'Tether', sym: 'USDT', icon: '₮', bg: '#26a17b', stream: null },
        WLD: { name: 'Worldcoin', sym: 'WLD', icon: 'W', bg: '#1a1a1a', stream: 'WLDUSDT' }
      };

      /* No custody provider has provisioned deposit addresses. Never render placeholders. */
      var ADDRS = {};

      /* Prices start empty: nothing is displayed as a live price until it is fetched.
         USDT is a USD peg reference, not a Binance feed, and is labelled as such. */
      var PEG_USD = { USDT: 1 };
      var prices = {};
      var STREAMS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'WLDUSDT'];
      var kesRate = null;
      var ws = null;
      var reconnects = 0;

      var currentUser = null;
      var currentProfile = null;

      /* ── Helpers ─────────────────────────────────────────────────────────── */
      function $(id) { return document.getElementById(id); }

      function kes(n) {
        return Number(n).toLocaleString('en-KE', { maximumFractionDigits: 0 });
      }

      function usdPrice(n) {
        return '$' + Number(n).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: n > 1 ? 2 : 6
        });
      }

      function esc(s) {
        return String(s).replace(/[<>"'&]/g, function (c) {
          return { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;' }[c];
        });
      }

      /* ── Auth ────────────────────────────────────────────────────────────── */
      async function checkAuth() {
        if (window.KPSession.expired()) {
          await supabaseClient.auth.signOut({ scope: 'local' });
          window.KPSession.clear();
          location.replace('login.html?session=expired');
          return false;
        }

        var sessionResult = await supabaseClient.auth.getSession();
        var session = sessionResult && sessionResult.data ? sessionResult.data.session : null;
        if (!session) { window.location.replace('login.html'); return false; }

        var verified = await supabaseClient.auth.getUser();
        if (verified.error || !verified.data || !verified.data.user) {
          window.KPSession.clear();
          location.replace('login.html');
          return false;
        }
        currentUser = verified.data.user;
        window.KPSession.start();

        var profileResult = await supabaseClient
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        currentProfile = profileResult ? profileResult.data : null;

        if (currentProfile && currentProfile.account_status === 'suspended') {
          await doLogout(true, 'Your account is suspended. Contact support@kryptopesa.com.');
          return false;
        }
        return true;
      }

      async function doLogout(skipConfirm, message) {
        if (!skipConfirm && !window.confirm('Sign out of KryptoPesa?')) return;
        try { await logAct('User Logout', 'success'); } catch (err) { /* non-blocking */ }
        await supabaseClient.auth.signOut();
        window.KPSession.clear();
        if (ws) ws.close();
        if (message) {
          sessionStorage.setItem('kp_notice', message);
        }
        window.location.replace('index.html');
      }

      async function logAct(event, status) {
        if (!currentUser) return;
        await supabaseClient.from('activity_log').insert({
          user_id: currentUser.id,
          event: event,
          status: status
        });
      }

      /* ── KYC ─────────────────────────────────────────────────────────────── */
      function getKYC() {
        return (currentProfile && currentProfile.kyc_status) || 'unverified';
      }

      function refreshKYCBadge() {
        var status = getKYC();
        var badge = $('kycBadge');
        if (!badge) return;
        if (status === 'verified') {
          badge.className = 'kyc-badge kyc-badge--verified';
          badge.textContent = 'KYC verified';
        } else if (status === 'pending') {
          badge.className = 'kyc-badge kyc-badge--pending';
          badge.textContent = 'KYC pending';
        } else if (status === 'rejected') {
          badge.className = 'kyc-badge kyc-badge--unverified';
          badge.textContent = 'KYC rejected';
        } else {
          badge.className = 'kyc-badge kyc-badge--unverified';
          badge.textContent = 'KYC unverified';
        }
        badge.setAttribute('aria-label', 'Identity verification status: ' + badge.textContent + '. Open identity verification.');
      }

      function handleKYCClick() {
        closeMenu();
        window.location.assign('verify-identity.html');
      }

      /* ── Receive ─────────────────────────────────────────────────────────── */
      function checkReceive() {
        var verified = getKYC() === 'verified';
        var gateText = $('kycGateText');
        if (gateText) {
          gateText.textContent = verified
            ? 'Your identity is verified, but deposit addresses are unavailable until a custody provider is connected. Do not send funds to any previously displayed address.'
            : 'Complete identity verification before receiving crypto. Deposit addresses are not provisioned yet — do not send funds to any previously displayed address.';
        }
      }

      function buildBalances() {
        var grid = $('balanceGrid');
        if (!grid) return;
        grid.replaceChildren();

        ['BTC', 'ETH', 'SOL', 'WLD'].forEach(function (symbol) {
          var coin = CMETA[symbol];
          var card = document.createElement('li');
          card.className = 'price-card balance-card';

          var head = document.createElement('div');
          head.className = 'price-card__head';
          head.innerHTML = '<span class="coin-icon" aria-hidden="true">' +
            coin.icon + '</span><span><span class="coin-name">' + coin.name +
            '</span><span class="coin-sym"> ' + symbol + '</span></span>';
          head.querySelector('.coin-icon').style.background = coin.bg;

          var amount = document.createElement('p');
          amount.className = 'balance-card__amount';
          amount.textContent = '— ' + symbol;

          var meta = document.createElement('p');
          meta.className = 'balance-card__meta';
          meta.textContent = 'Available: — · Pending: —';

          var action = document.createElement('button');
          action.className = 'primary-btn';
          action.type = 'button';
          action.disabled = true;
          action.textContent = 'Deposit unavailable';

          card.append(head, amount, meta, action);
          grid.appendChild(card);
        });
      }

      /* ── KES rate ────────────────────────────────────────────────────────── */
      async function fetchKES() {
        var sources = [
          'https://api.exchangerate-api.com/v4/latest/USD',
          'https://open.er-api.com/v6/latest/USD'
        ];
        for (var i = 0; i < sources.length; i++) {
          try {
            var response = await fetch(sources[i], { cache: 'no-store' });
            if (!response.ok) continue;
            var data = await response.json();
            var rate = (data.rates && data.rates.KES) || data.conversion_rates && data.conversion_rates.KES;
            if (rate) {
              kesRate = rate;
              $('kesDisplay').textContent = Number(rate).toFixed(2);
              updateAllKES();
              return;
            }
          } catch (err) { /* try the next source */ }
        }
        $('kesDisplay').textContent = 'unavailable';
        updateAllKES();
      }

      function updateAllKES() {
        Object.keys(CMETA).forEach(function (key) {
          var meta = CMETA[key];
          var el = meta.stream ? $('kes_' + meta.stream) : null;
          if (!el) return;
          var usd = priceOf(key);
          el.textContent = (usd == null || kesRate == null)
            ? '≈ KES —'
            : '≈ KES ' + kes(usd * kesRate);
        });
        calcConv();
      }

      function priceOf(symbol) {
        if (prices[symbol] != null) return prices[symbol];
        if (PEG_USD[symbol] != null) return PEG_USD[symbol];
        return null;
      }

      /* ── Swap preview ────────────────────────────────────────────────────── */
      function calcConv() {
        var symbol = $('swapCrypto').value;
        var amount = parseFloat($('swapAmt').value);
        var box = $('convBox');

        if (!amount || isNaN(amount) || amount <= 0) {
          box.hidden = true;
          return;
        }

        /* Flag market data as stale if every feed has already failed. */
        if (Object.keys(prices).length === 0) {
          document.querySelectorAll('.price-card__price[data-pending]').forEach(function (el) {
            el.removeAttribute('data-pending');
            el.setAttribute('data-unavailable', 'true');
            el.textContent = 'Unavailable';
          });
        }

        var usd = priceOf(symbol);
        if (usd == null || kesRate == null) {
          $('kesAmt').textContent = '—';
          $('rateSym').textContent = symbol;
          $('rateVal').textContent = 'unavailable';
          var pending = $('limitLbl');
          pending.textContent = 'A price or exchange rate is not available yet, so no estimate can be shown.';
          pending.setAttribute('data-ok', 'false');
          box.hidden = false;
          return;
        }

        var value = amount * usd * kesRate;
        $('kesAmt').textContent = value.toLocaleString('en-KE', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
        $('rateSym').textContent = symbol;
        $('rateVal').textContent = kes(usd * kesRate);

        var label = $('limitLbl');
        if (value < MIN_KES) {
          label.textContent = 'Below the KSH ' + kes(MIN_KES) + ' minimum.';
          label.setAttribute('data-ok', 'false');
        } else if (value > MAX_KES) {
          label.textContent = 'Above the KSH ' + kes(MAX_KES) + ' maximum.';
          label.setAttribute('data-ok', 'false');
        } else {
          label.textContent = 'Within the indicative limit.';
          label.setAttribute('data-ok', 'true');
        }
        box.hidden = false;
      }

      function doSwap() {
        var result = $('swapResult');
        result.className = 'result result--warn';
        result.textContent = 'Crypto-to-M-Pesa payouts are not available yet. Live KYC, funded wallet balances, server-side quotes and an approved Daraja B2C payout integration are required before a swap can be submitted. Nothing has been sent to your phone.';
      }

      /* ── Price cards ─────────────────────────────────────────────────────── */
      function buildCards() {
        var grid = $('priceGrid');
        grid.replaceChildren();

        Object.keys(CMETA).forEach(function (key) {
          var meta = CMETA[key];
          var item = document.createElement('li');
          item.className = 'price-card';

          var usd = priceOf(key);
          var id = meta.stream || key;

          item.innerHTML =
            '<div class="price-card__head">' +
              '<span class="coin-icon" aria-hidden="true">' + meta.icon + '</span>' +
              '<span><span class="coin-name">' + meta.name + '</span><span class="coin-sym"> ' + meta.sym +
              (meta.stream ? '' : ' · USD peg') + '</span></span>' +
            '</div>' +
            '<div class="price-card__price" id="p_' + id + '"' + (usd == null ? ' data-pending="true"' : '') + '>' +
              (usd == null ? 'Loading…' : usdPrice(usd)) + '</div>' +
            '<div class="price-card__kes" id="kes_' + id + '">' +
              (usd == null || kesRate == null ? '≈ KES —' : '≈ KES ' + kes(usd * kesRate)) + '</div>' +
            '<div class="price-card__change" id="ch_' + id + '" data-dir="flat"' +
              (meta.stream ? '' : ' data-ref="peg"') + '>' +
              (meta.stream ? 'Waiting for market data' : 'Stablecoin reference — no live feed') + '</div>';

          /* CSSOM assignment keeps the strict style-src CSP (no inline attributes). */
          var icon = item.querySelector('.coin-icon');
          if (icon) icon.style.background = meta.bg;

          grid.appendChild(item);
        });
      }

      function updCard(stream, price, changePercent) {
        var priceEl = $('p_' + stream);
        var kesEl = $('kes_' + stream);
        var changeEl = $('ch_' + stream);
        var entry = Object.keys(CMETA).find(function (k) { return CMETA[k].stream === stream; });
        if (entry) prices[entry] = price;

        if (priceEl) {
          priceEl.textContent = usdPrice(price);
          priceEl.removeAttribute('data-pending');
        }
        if (kesEl && kesRate != null) {
          kesEl.textContent = '≈ KES ' + kes(price * kesRate);
        }
        if (changeEl && changePercent != null && !isNaN(changePercent)) {
          var dir = changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'flat';
          changeEl.setAttribute('data-dir', dir);
          changeEl.textContent = (dir === 'up' ? '▲ ' : dir === 'down' ? '▼ ' : '') +
            Math.abs(changePercent).toFixed(2) + '% (24h)';
        }
      }

      /* When no price could be fetched at all, say so instead of leaving the
         cards reading "Loading…" forever. Never substitute a made-up number. */
      function markPricesUnavailable() {
        document.querySelectorAll('.price-card__price[data-pending]').forEach(function (el) {
          el.removeAttribute('data-pending');
          el.setAttribute('data-unavailable', 'true');
          el.textContent = 'Unavailable';
        });
        document.querySelectorAll('.price-card__change[data-dir="flat"]').forEach(function (el) {
          if (el.getAttribute('data-ref')) return;
          el.textContent = 'Market data unavailable';
        });
        setFeed('offline', 'Market data unavailable');
        calcConv();
      }

      function setFeed(state, text) {
        var badge = $('feedBadge');
        if (!badge) return;
        badge.setAttribute('data-state', state);
        $('feedText').textContent = text;
      }

      function connectWS() {
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
        var streams = STREAMS.map(function (s) { return s.toLowerCase() + '@ticker'; }).join('/');
        try {
          ws = new WebSocket('wss://stream.binance.com:9443/stream?streams=' + streams);
          ws.onopen = function () {
            reconnects = 0;
            setFeed('live', 'Live market data');
          };
          ws.onmessage = function (event) {
            try {
              var payload = JSON.parse(event.data);
              var ticker = payload.data || payload;
              if (!ticker.s) return;
              var stream = ticker.s.toUpperCase();
              if (STREAMS.indexOf(stream) === -1) return;
              updCard(stream, parseFloat(ticker.c), parseFloat(ticker.P));
              updateAllKES();
            } catch (err) { /* ignore malformed frame */ }
          };
          ws.onerror = function () {
            setFeed('cached', 'Cached prices (polling)');
          };
          ws.onclose = function () {
            setFeed('cached', 'Cached prices (polling)');
            if (reconnects < 5) {
              reconnects++;
              setTimeout(connectWS, Math.min(1000 * Math.pow(2, reconnects), 30000));
            }
          };
        } catch (err) {
          setFeed('offline', 'Market data unavailable');
        }
      }

      /* REST fallback — mobile networks and some ISPs block raw WebSockets
         while allowing normal HTTPS, so the grid must never depend on the socket. */
      async function fetchRestPrices() {
        var symbolsParam = encodeURIComponent(JSON.stringify(STREAMS));
        try {
          var response = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbols=' + symbolsParam, { cache: 'no-store' });
          if (!response.ok) throw new Error('REST ' + response.status);
          var tickers = await response.json();
          tickers.forEach(function (t) {
            if (STREAMS.indexOf(t.symbol) !== -1) {
              updCard(t.symbol, parseFloat(t.lastPrice), parseFloat(t.priceChangePercent));
            }
          });
          if (!ws || ws.readyState !== WebSocket.OPEN) setFeed('cached', 'Cached prices (polling)');
          updateAllKES();
        } catch (err) {
          /* A single invalid or delisted symbol rejects the whole batch, so fall
             back to one request per symbol and keep the rest of the grid alive. */
          await Promise.allSettled(STREAMS.map(async function (symbol) {
            try {
              var single = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=' + symbol, { cache: 'no-store' });
              if (!single.ok) throw new Error(symbol + ' ' + single.status);
              var ticker = await single.json();
              updCard(ticker.symbol, parseFloat(ticker.lastPrice), parseFloat(ticker.priceChangePercent));
            } catch (innerErr) { /* leave this card in its pending state */ }
          }));
          updateAllKES();
          if (Object.keys(prices).length === 0) markPricesUnavailable();
        }
      }

      /* ── Navigation ──────────────────────────────────────────────────────── */
      var SECTIONS = ['markets', 'balances', 'swap', 'receive', 'deposit'];

      function showSection(id) {
        if (SECTIONS.indexOf(id) === -1) id = 'markets';

        SECTIONS.forEach(function (name) {
          var panel = $(name);
          if (panel) panel.hidden = name !== id;
        });

        document.querySelectorAll('.tab').forEach(function (tab) {
          if (tab.getAttribute('data-sec') === id) {
            tab.setAttribute('aria-current', 'true');
          } else {
            tab.removeAttribute('aria-current');
          }
        });

        if (id === 'receive') checkReceive();

        if (location.hash !== '#' + id) {
          history.replaceState(null, '', '#' + id);
        }
        closeMenu();
      }

      /* ── Account menu ────────────────────────────────────────────────────── */
      var menuBtn = $('menuBtn');
      var menu = $('accountMenu');

      function openMenu(open) {
        if (!menu || !menuBtn) return;
        menu.setAttribute('data-open', open ? 'true' : 'false');
        menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) {
          var first = menu.querySelector('[role="menuitem"]');
          if (first) first.focus();
        }
      }

      function closeMenu() { openMenu(false); }

      if (menuBtn && menu) {
        menuBtn.addEventListener('click', function () {
          openMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
        });

        menu.addEventListener('click', function (event) {
          var item = event.target.closest('[data-action]');
          if (!item) return;
          var action = item.getAttribute('data-action');
          closeMenu();
          if (action === 'markets') { showSection('markets'); menuBtn.focus(); }
          else if (action === 'kyc') handleKYCClick();
          else if (action === 'logout') doLogout();
        });

        document.addEventListener('click', function (event) {
          if (menuBtn.getAttribute('aria-expanded') !== 'true') return;
          if (menu.contains(event.target) || menuBtn.contains(event.target)) return;
          closeMenu();
        });

        document.addEventListener('keydown', function (event) {
          if (event.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') {
            closeMenu();
            menuBtn.focus();
          }
        });
      }

      /* ── Init ────────────────────────────────────────────────────────────── */
      document.addEventListener('DOMContentLoaded', async function () {
        $('kycBadge').addEventListener('click', handleKYCClick);

        document.getElementById('tabBar').addEventListener('click', function (event) {
          var tab = event.target.closest('[data-sec]');
          if (tab) showSection(tab.getAttribute('data-sec'));
        });

        $('swapCrypto').addEventListener('change', calcConv);
        $('swapAmt').addEventListener('input', calcConv);
        $('swapBtn').addEventListener('click', doSwap);

        if (!(await checkAuth())) return;

        $('userName').textContent = (currentProfile && currentProfile.username) || currentUser.email;
        refreshKYCBadge();
        buildBalances();
        buildCards();

        var notice = sessionStorage.getItem('kp_notice');
        if (notice) {
          sessionStorage.removeItem('kp_notice');
          window.alert(notice);
        }

        /* Prices first over plain HTTPS so the grid is never blank, then the
           socket for sub-second updates, with a 15s poll as the safety net. */
        await fetchRestPrices();
        connectWS();
        setInterval(function () {
          if (!ws || ws.readyState !== WebSocket.OPEN) fetchRestPrices();
        }, 15000);

        await fetchKES();
        updateAllKES();
        setInterval(function () { fetchKES(); }, 300000);

        showSection((location.hash || '#markets').slice(1));
      });

      window.addEventListener('beforeunload', function () { if (ws) ws.close(); });
    })();
