(function () {
      'use strict';

      var form = document.getElementById('forgotForm');
      var emailInput = document.getElementById('forgotEmail');
      var btn = document.getElementById('forgotBtn');
      var errorBox = document.getElementById('errorMsg');
      var successBox = document.getElementById('successMsg');

      function hideMessages() {
        errorBox.removeAttribute('data-show');
        successBox.removeAttribute('data-show');
      }

      function showError(msg) {
        hideMessages();
        errorBox.textContent = msg;
        errorBox.setAttribute('data-show', 'true');
        emailInput.setAttribute('aria-invalid', 'true');
      }

      function showSuccess(msg) {
        hideMessages();
        successBox.textContent = msg;
        successBox.setAttribute('data-show', 'true');
        emailInput.removeAttribute('aria-invalid');
      }

      form.addEventListener('submit', async function (event) {
        event.preventDefault();
        hideMessages();

        var email = emailInput.value.trim();
        if (!email || !emailInput.checkValidity()) {
          showError('Enter the email address you signed up with.');
          emailInput.focus();
          return;
        }

        btn.disabled = true;
        btn.textContent = 'Sending…';
        form.setAttribute('aria-busy', 'true');

        var result;
        try {
          result = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: 'https://www.kryptopesa.app/reset_password.html'
          });
        } catch (err) {
          result = { error: err };
        }

        btn.disabled = false;
        btn.textContent = 'Send reset link';
        form.removeAttribute('aria-busy');

        if (result && result.error) {
          if (/rate limit|too many/i.test(result.error.message || '')) {
            showError('Too many requests. Wait a few minutes and try again.');
          } else {
            showError('Something went wrong. Please try again in a moment.');
          }
          return;
        }

        /* Same message whether or not the address exists, to avoid account enumeration. */
        showSuccess('If that email is registered, a reset link is on its way. Check your inbox and spam folder.');
        form.reset();
      });
    })();
