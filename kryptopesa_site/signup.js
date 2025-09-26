document.getElementById('signupForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('signupUsername').value;
    const password = document.getElementById('signupPassword').value;
    localStorage.setItem('kryptopesaUser', JSON.stringify({ username, password }));
    alert('Sign up successful!');
    window.location.href = 'login.html';
  });

  