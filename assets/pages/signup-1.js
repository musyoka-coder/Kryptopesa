(function () {
      'use strict';

      var form = document.getElementById('signupForm');
      var usernameInput = document.getElementById('signupUsername');
      var emailInput = document.getElementById('signupEmail');
      var passwordInput = document.getElementById('signupPassword');
      var confirmInput = document.getElementById('confirmPassword');
      var btn = document.getElementById('signupBtn');
      var errorBox = document.getElementById('errorMsg');
      var strengthFill = document.getElementById('strengthFill');
      var strengthLabel = document.getElementById('strengthLabel');

      var LEVELS = [
        { pct: '20%', color: '#c02626', text: 'Very weak' },
        { pct: '40%', color: '#c2551b', text: 'Weak' },
        { pct: '60%', color: '#8a5a00', text: 'Fair' },
        { pct: '80%', color: '#3f7d20', text: 'Strong' },
        { pct: '100%', color: '#0e7c5a', text: 'Very strong' }
      ];

      function showError(msg, field) {
        errorBox.textContent = msg;
        errorBox.setAttribute('data-show', 'true');
        if (field) {
          field.setAttribute('aria-invalid', 'true');
          field.focus();
        }
      }

      function clearError() {
        errorBox.textContent = '';
        errorBox.removeAttribute('data-show');
        [usernameInput, emailInput, passwordInput, confirmInput].forEach(function (el) {
          el.removeAttribute('aria-invalid');
        });
      }

      function setBusy(on, text) {
        btn.disabled = on;
        btn.textContent = text || (on ? 'Creating account…' : 'Create account');
        form.setAttribute('aria-busy', on ? 'true' : 'false');
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

      passwordInput.addEventListener('input', function () { checkStrength(passwordInput.value); });

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

        var username = usernameInput.value.trim();
        var email = emailInput.value.trim();
        var password = passwordInput.value;
        var confirm = confirmInput.value;

        if (username.length < 3) { showError('Username must be at least 3 characters.', usernameInput); return; }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) { showError('Username can only contain letters, numbers and underscores.', usernameInput); return; }
        if (!email || !emailInput.checkValidity()) { showError('Enter a valid email address.', emailInput); return; }
        if (password.length < 6) { showError('Password must be at least 6 characters.', passwordInput); return; }
        if (password !== confirm) { showError('Passwords do not match.', confirmInput); return; }

        setBusy(true);

        var result;
        try {
          result = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: { data: { username: username } }
          });
        } catch (err) {
          setBusy(false);
          showError('We could not reach the sign-up service. Check your connection and try again.');
          return;
        }

        if (result.error) {
          setBusy(false);
          var message = result.error.message || '';
          if (/already registered|already exists/i.test(message)) {
            showError('That email is already registered. Try logging in instead.');
          } else if (/rate limit|too many/i.test(message)) {
            showError('Too many attempts. Wait a minute and try again.');
          } else {
            showError(message);
          }
          return;
        }

        /* Supabase returns no session when email confirmation is required.
           Never imply a verification email was sent if Auth auto-confirms. */
        if (result.data.session) {
          await supabaseClient.auth.signOut();
          showError('Account created, but email confirmation is not enforced by Supabase. Registration is paused until the administrator enables "Confirm email" in Authentication settings.');
          setBusy(false, 'Registration configuration required');
          return;
        }

        form.hidden = true;
        document.getElementById('signupSubtitle').textContent = 'Confirm your email before signing in';
        errorBox.setAttribute('data-show', 'true');
        errorBox.className = 'auth__msg auth__msg--ok';
        errorBox.setAttribute('role', 'status');
        errorBox.textContent = 'If your address is eligible for registration, check your inbox and spam folder for the confirmation link. Open the link before logging in.';
        setBusy(true, 'Check your email');
      });
    })();
