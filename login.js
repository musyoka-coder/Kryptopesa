// login.js — Supabase Auth version
document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        alert('Invalid credentials. Please try again.');
        return;
    }

    // Check suspension status from the profiles table
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('account_status, username')
        .eq('id', data.user.id)
        .single();

    if (profile?.account_status === 'suspended') {
        await supabaseClient.auth.signOut();
        alert('Your account has been suspended. Please contact support@kryptopesa.com');
        return;
    }

    alert(`Welcome back, ${profile?.username || email}!`);
    window.location.href = 'homepage.html';
});
