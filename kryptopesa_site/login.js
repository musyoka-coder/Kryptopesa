document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const storedUser = JSON.parse(localStorage.getItem('kryptopesaUser'));

    if (storedUser && storedUser.username === username && storedUser.password === password) {
      alert(`welcome ${username}`);
      localStorage.setItem('isLoggedIn', 'true');
      window.location.href = 'homepage.html';
    } else {
      alert('Invalid credentials. Please try again.');
    }
  });