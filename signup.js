// signup.js — KryptoPesa Signup (standalone version)
async function hashPassword(password) {
  const buf = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
}

document.getElementById('signupForm')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  const username = document.getElementById('signupUsername').value.trim();
  const password = document.getElementById('signupPassword').value;
  const btn = this.querySelector('button[type="submit"]');

  if (username.length < 3) { alert('Username must be at least 3 characters.'); return; }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) { alert('Username: letters, numbers and underscores only.'); return; }
  if (password.length < 6) { alert('Password must be at least 6 characters.'); return; }

  btn.disabled = true; btn.textContent = 'Creating Account…';

  if (localStorage.getItem('kryptopesaUser_' + username)) {
    alert('Username already taken. Please choose another.');
    btn.disabled = false; btn.textContent = 'Sign Up';
    return;
  }

  const hash = await hashPassword(password);
  localStorage.setItem('kryptopesaUser_' + username, JSON.stringify({
    username, passwordHash: hash, createdAt: new Date().toISOString()
  }));

  const users = JSON.parse(localStorage.getItem('kryptopesa_users_db') || '[]');
  const wallet = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(20))).map(b=>b.toString(16).padStart(2,'0')).join('');
  users.push({ username, email: `${username}@kryptopesa.com`, status: 'active', kycVerified: false, joinedDate: new Date().toISOString(), walletAddress: wallet });
  localStorage.setItem('kryptopesa_users_db', JSON.stringify(users));

  const log = JSON.parse(localStorage.getItem('kryptopesa_activity_log') || '[]');
  log.push({ event: 'User Registration', user: username, status: 'success', timestamp: new Date().toISOString() });
  localStorage.setItem('kryptopesa_activity_log', JSON.stringify(log));

  alert('Account created! Please log in.');
  window.location.href = 'login.html';
});
