(function () {
      'use strict';

      var form = document.getElementById('resetForm');
      var newPassword = document.getElementById('newPassword');
      var confirmPassword = document.getElementById('confirmPassword');
      var btn = document.getElementById('resetBtn');
      var errorBox = document.getElementById('errorMsg');
      var successBox = document.getElementById('successMsg');
      var infoBox = document.getElementById('infoBox');
      var userDisplay = document.getElementById('userDisplay');
      var strengthFill = document.getElementById('strengthFill');
      var strengthLabel = document.getElementById('strengthLabel');
      var recoverySession = null;

      var LEVELS = [
        { pct: '20%', color: '#c02626', text: 'Very weak' },
        { pct: '40%', color: '#c2551b', text: 'Weak' },
        { pct: '60%', color: '#8a5a00', text: 'Fair' },
        { pct: '80%', color: '#3f7d20', text: 'Strong' },
        { pct: '100%', color: '#0e7c5a', text: 'Very strong' }
      ];

      function hideMessages() {
        errorBox.removeAttribute('data-show');
        successBox.removeAttribute('data-show');
      }

      function showError(msg) {
        hideMessages();
        errorBox.textContent = msg;
        errorBox.setAttribute('data-show', 'true');
      }

      function showSuccess(msg) {
        hideMessages();
        successBox.textContent = msg;
        successBox.setAttribute('data-show', 'true');
      }

      function checkStrength(pw) {
        if (!pw) {
          strengthFill.style.width = '0%';
          strengthFill.style.background = 'transparent';
          strengthLabel.textContent = '';
          return;
        }
        var score = 0;
        if (pw.length >= 6) score++;
        if (pw.length >= 10) score++;
        if (/[A-Z]/.test(pw)) score++;
        if (/[0-9]/.test(pw)) score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;

        var level = LEVELS[Math.min(Math.max(score - 1, 0), LEVELS.length - 1)];
        strengthFill.style.width = level.pct;
        strengthFill.style.background = level.color;
        strengthLabel.textContent = 'Password strength: ' + level.text;
        strengthLabel.style.color = level.color;
      }

      newPassword.addEventListener('input', function () { checkStrength(newPassword.value); });

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

      function showResetForm(session) {
        infoBox.textContent = 'Choose a new password below to finish resetting your account.';
        /* textContent, never innerHTML: the email is user-controlled data. */
        userDisplay.textContent = 'Resetting password for ' + session.user.email;
        form.hidden = false;
        newPassword.focus();
      }

      /* Supabase parses the recovery token in the URL on load and fires
         PASSWORD_RECOVERY; the getSession() call below is the fallback for
         the case where the event fired before this listener attached. */
      supabaseClient.auth.onAuthStateChange(function (event, session) {
        if (event === 'PASSWORD_RECOVERY' && session) {
          recoverySession = session;
          showResetForm(session);
        }
      });

      supabaseClient.auth.getSession().then(function (result) {
        var session = result && result.data ? result.data.session : null;
        if (session && !recoverySession) {
          recoverySession = session;
          showResetForm(session);
        } else if (!session) {
          infoBox.textContent = 'This reset link is invalid or has expired. Redirecting…';
          setTimeout(function () { window.location.href = 'forgot_password.html'; }, 2500);
        }
      }).catch(function () {
        infoBox.textContent = 'We could not verify your reset link. Redirecting…';
        setTimeout(function () { window.location.href = 'forgot_password.html'; }, 2500);
      });

      form.addEventListener('submit', async function (event) {
        event.preventDefault();
        hideMessages();

        var next = newPassword.value;
        var confirm = confirmPassword.value;

        if (next.length < 6) {
          showError('Password must be at least 6 characters.');
          newPassword.focus();
          return;
        }
        if (next !== confirm) {
          showError('Passwords do not match.');
          confirmPassword.focus();
          return;
        }

        btn.disabled = true;
        btn.innerHTML = '<span class="auth__spinner" aria-hidden="true"></span>Setting password…';

        var update;
        try {
          update = await supabaseClient.auth.updateUser({ password: next });
        } catch (err) {
          update = { error: err };
        }

        if (update && update.error) {
          showError(update.error.message || 'Something went wrong. Please try again.');
          btn.disabled = false;
          btn.textContent = 'Set new password';
          return;
        }

        /* Best-effort activity log; a failure here must not block the reset. */
        if (recoverySession && recoverySession.user && recoverySession.user.id) {
          try {
            await supabaseClient.from('activity_log').insert({
              user_id: recoverySession.user.id,
              event: 'Password Reset Completed',
              status: 'success'
            });
          } catch (err) { /* non-blocking */ }
        }

        showSuccess('Password updated. Redirecting to login…');
        await supabaseClient.auth.signOut();
        setTimeout(function () { window.location.href = 'login.html'; }, 1500);
      });
    })();
