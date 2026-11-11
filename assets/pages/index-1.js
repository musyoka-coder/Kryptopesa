(function () {
      'use strict';

      /* ── Mobile navigation ────────────────────────────────────────────── */
      var toggle = document.getElementById('navToggle');
      var list = document.getElementById('navList');
      var label = document.getElementById('navToggleLabel');

      function setNav(open) {
        if (!toggle || !list) return;
        list.setAttribute('data-open', open ? 'true' : 'false');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (label) label.textContent = open ? 'Close' : 'Menu';
      }

      if (toggle && list) {
        /* Start closed only on small screens; desktop shows the list via CSS. */
        setNav(false);

        toggle.addEventListener('click', function () {
          setNav(toggle.getAttribute('aria-expanded') !== 'true');
        });

        list.addEventListener('click', function (event) {
          if (event.target.closest('a')) setNav(false);
        });

        document.addEventListener('keydown', function (event) {
          if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
            setNav(false);
            toggle.focus();
          }
        });

        document.addEventListener('click', function (event) {
          if (toggle.getAttribute('aria-expanded') !== 'true') return;
          if (list.contains(event.target) || toggle.contains(event.target)) return;
          setNav(false);
        });
      }

      /* ── Send already-signed-in visitors straight to the dashboard ────── */
      if (typeof supabaseClient !== 'undefined' && supabaseClient && supabaseClient.auth) {
        supabaseClient.auth.getSession().then(function (result) {
          if (result && result.data && result.data.session) {
            window.location.replace('homepage.html');
          }
        }).catch(function () {
          /* A failed session check must never block the marketing page. */
        });
      }
    })();
