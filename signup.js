// signup.js — Supabase Auth version
document.getElementById('signupForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const username = document.getElementById('signupUsername').value.trim();
    const password = document.getElementById('signupPassword').value;
    const email = document.getElementById('signupEmail')?.value.trim()
        || `${username}@kryptopesa.com`; // fallback if you don't add an email field

    if (username.length < 3) {
        alert('Username must be at least 3 characters long');
        return;
    }
    if (password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
    }

    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
            data: { username } // read by the handle_new_user() trigger in Postgres
        }
    });

    if (error) {
        alert(error.message);
        return;
    }

    alert('Sign up successful! Check your email to confirm your account, then log in.');
    window.location.href = 'login.html';
});
