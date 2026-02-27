// main (2).js — KryptoPesa button hover effects (duplicate/backup of main.js)
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('mouseover', () => btn.style.transform = 'scale(1.05)');
    btn.addEventListener('mouseout',  () => btn.style.transform = 'scale(1)');
  });
});
