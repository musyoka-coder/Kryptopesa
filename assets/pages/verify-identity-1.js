(function () {
      'use strict';

      var status = document.getElementById('status');
      var button = document.getElementById('start');

      function setStatus(text, state) {
        status.textContent = text;
        if (state) status.setAttribute('data-state', state);
        else status.removeAttribute('data-state');
      }

      var sb = typeof supabaseClient !== 'undefined' ? supabaseClient : null;
      if (!sb) {
        setStatus('Authentication is unavailable. Reload the page or contact support.', 'error');
        return;
      }

      sb.auth.getSession().then(async function (result) {
        var session = result && result.data ? result.data.session : null;
        if (!session) { location.replace('login.html'); return; }

        var cases = await sb
          .from('kyc_verification_cases')
          .select('status,created_at')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (cases.error) {
          setStatus('We could not load your verification status. Try again shortly.', 'error');
          return;
        }

        var latest = cases.data && cases.data[0];
        if (latest && ['pending', 'in_review', 'verified'].indexOf(latest.status) !== -1) {
          setStatus('Your current verification status: ' + String(latest.status).replace('_', ' ') +
            '. Contact support if you need another verification.', latest.status === 'verified' ? 'ok' : null);
          return;
        }

        setStatus('Sandbox verification is available when the provider is configured.');
        button.disabled = false;
      }).catch(function () {
        setStatus('We could not check your session. Sign in again and retry.', 'error');
      });

      button.addEventListener('click', async function () {
        button.disabled = true;
        setStatus('Creating a secure verification session…');

        try {
          var result = await sb.functions.invoke('didit-sandbox-session', { body: {} });
          if (result.error || !result.data || !result.data.url) {
            var detail = (result.data && (result.data.error || result.data.message)) || '';
            if (result.error && result.error.context) {
              try {
                var body = await result.error.context.clone().json();
                detail = body && (body.error || body.message) || detail;
              } catch (err) { /* keep the generic detail */ }
            }
            throw new Error(detail || 'Sandbox session unavailable. Check provider configuration.');
          }

          /* Only hand the browser to the provider's own HTTPS origin. */
          var url = new URL(result.data.url);
          if (url.protocol !== 'https:' || url.hostname !== 'verify.didit.me') {
            throw new Error('Invalid provider URL.');
          }
          location.assign(url.toString());
        } catch (err) {
          setStatus(err.message || 'Unable to start verification. Try again.', 'error');
          button.disabled = false;
        }
      });
    })();
