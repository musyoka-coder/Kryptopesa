// login.js — KryptoPesa Secure Login
// Security: SHA-256 password hashing, session token, brute-force lockout

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

async function hashPassword(password) {
    const buf = new TextEncoder().encode(password);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
}

function generateSessionToken() {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2,'0')).join('');
}

function checkLockout(username) {
    const key = `login_attempts_${username}`;
    const data = JSON.parse(localStorage.getItem(key) || '{"count":0,"lastAttempt":0}');
    if (data.count >= MAX_ATTEMPTS) {
        const elapsed = Date.now() - data.lastAttempt;
        if (elapsed < LOCKOUT_MS) {
            const remaining = Math.ceil((LOCKOUT_MS - elapsed) / 60000);
            return `Account temporarily locked. Try again in ${remaining} minute(s).`;
        } else {
            // Reset after lockout period
            localStorage.removeItem(key);
        }
    }
    return null;
}

function recordFailedAttempt(username) {
    const key = `login_attempts_${username}`;
    const data = JSON.parse(localStorage.getItem(key) || '{"count":0,"lastAttempt":0}');
    data.count = (data.count || 0) + 1;
    data.lastAttempt = Date.now();
    localStorage.setItem(key, JSON.stringify(data));
}

function clearAttempts(username) {
    localStorage.removeItem(`login_attempts_${username}`);
}

document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const submitBtn = this.querySelector('button[type="submit"]');

    if (!username || !password) {
        alert('Please fill in all fields.');
        return;
    }

    // Brute-force protection
    const lockoutMsg = checkLockout(username);
    if (lockoutMsg) {
        alert(lockoutMsg);
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Verifying…';

    // Check suspension first
    const users = JSON.parse(localStorage.getItem('kryptopesa_users_db') || '[]');
    const userRecord = users.find(u => u.username === username);
    if (userRecord && userRecord.status === 'suspended') {
        alert('Your account has been suspended. Contact support@kryptopesa.com');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Log In';
        logActivityPublic('Login Attempt - Suspended Account', username, 'pending');
        return;
    }

    const passwordHash = await hashPassword(password);
    const storedUser = JSON.parse(localStorage.getItem('kryptopesaUser_' + username) || 'null');

    if (storedUser && storedUser.passwordHash === passwordHash) {
        // SUCCESS — generate session token
        clearAttempts(username);
        const sessionToken = generateSessionToken();

        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('currentUser', username);
        // Store token in sessionStorage (cleared on tab close)
        sessionStorage.setItem('kp_session_token', sessionToken);
        sessionStorage.setItem('kp_session_user', username);

        logActivityPublic('User Login', username, 'success');
        window.location.href = 'homepage.html';
    } else {
        recordFailedAttempt(username);
        const attemptsData = JSON.parse(localStorage.getItem(`login_attempts_${username}`) || '{}');
        const remaining = MAX_ATTEMPTS - (attemptsData.count || 0);
        alert(`Invalid credentials. ${remaining > 0 ? remaining + ' attempt(s) remaining.' : 'Account locked for 15 minutes.'}`);
        logActivityPublic('Failed Login Attempt', username, 'pending');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Log In';
    }
});

function logActivityPublic(event, user, status) {
    const log = JSON.parse(localStorage.getItem('kryptopesa_activity_log') || '[]');
    log.push({ event, user, status, timestamp: new Date().toISOString() });
    if (log.length > 100) log.splice(0, log.length - 100);
    localStorage.setItem('kryptopesa_activity_log', JSON.stringify(log));
}
