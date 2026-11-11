(function () {
      'use strict';

      var form = document.getElementById('loginForm');
      var emailInput = document.getElementById('loginEmail');
      var passwordInput = document.getElementById('loginPassword');
      var btn = document.getElementById('loginBtn');
      var errorBox = document.getElementById('errorMsg');

      function showError(msg) {
        errorBox.textContent = msg;
        errorBox.setAttribute('data-show', 'true');
        errorBox.focus && errorBox.focus();
      }

      function clearError() {
        errorBox.textContent = '';
        errorBox.removeAttribute('data-show');
      }

      function busy(on) {
        btn.disabled = on;
        btn.textContent = on ? 'Verifying…' : 'Log in';
        form.setAttribute('aria-busy', on ? 'true' : 'false');
      }

      if (new URLSearchParams(location.search).get('session') === 'expired') {
        showError('Your session expired. Please sign in again.');
      }

      /* Password visibility toggle. */
      document.querySelectorAll('.auth__reveal').forEach(function (toggle) {
        toggle.addEventListener('click', function () {
          var input = document.getElementById(toggle.getAttribute('data-target'));
          if (!input) return;
          var hidden = input.type === 'password';
          input.type = hidden ? 'text' : 'password';
          toggle.setAttribute('aria-label', hidden ? 'Hide password' : 'Show password');
          toggle.setAttribute('aria-pressed', hidden ? 'true' : 'false');
        });
      });

      form.addEventListener('submit', async function (event) {
        event.preventDefault();
        clearError();

        var email = emailInput.value.trim();
        var password = passwordInput.value;

        if (!email || !password) {
          showError('Enter both your email address and password.');
          (!email ? emailInput : passwordInput).focus();
          return;
        }
        if (!emailInput.checkValidity()) {
          showError('That email address does not look valid.');
          emailInput.focus();
          return;
        }

        busy(true);

        var result;
        try {
          result = await supabaseClient.auth.signInWithPassword({ email: email, password: password });
        } catch (err) {
          busy(false);
          showError('We could not reach the sign-in service. Check your connection and try again.');
          return;
        }

        if (result.error) {
          busy(false);
          var message = result.error.message || '';
          if (/invalid login/i.test(message)) {
            showError('Invalid email or password.');
          } else if (/rate limit|too many/i.test(message)) {
            showError('Too many attempts. Wait a minute and try again.');
          } else {
            showError(message);
          }
          return;
        }

        /* Defence in depth: never accept a session without a confirmed email.
           Supabase Auth must also enforce "Confirm email" server-side. */
        if (!result.data.user || !result.data.user.email_confirmed_at) {
          await supabaseClient.auth.signOut();
          busy(false);
          showError('Confirm your email address using the link sent after registration before signing in.');
          return;
        }

        var profileResult;
        try {
          profileResult = await supabaseClient
            .from('profiles')
            .select('account_status, username, is_admin')
            .eq('id', result.data.user.id)
            .single();
        } catch (err) {
          profileResult = { data: null, error: err };
        }

        var profile = profileResult && profileResult.data;
        if (profileResult && profileResult.error) {
          await supabaseClient.auth.signOut();
          busy(false);
          showError('We could not load your account profile. Try again, or contact support if this continues.');
          return;
        }

        if (!profile || profile.account_status !== 'active') {
          await supabaseClient.auth.signOut();
          busy(false);
          showError('Account unavailable or inactive. Contact support.');
          return;
        }

        window.KPSession.signedIn();
        window.KPSession.savePreference('kp_functional_cookies', 'enabled');

        /* Best-effort audit trail: never block sign-in on a log write. */
        try {
          await supabaseClient.from('activity_log').insert({
            user_id: result.data.user.id,
            event: 'User Login',
            status: 'success'
          });
        } catch (err) { /* non-blocking */ }

        window.location.replace(profile.is_admin === true ? 'admin.html' : 'homepage.html');
      });
    })();
