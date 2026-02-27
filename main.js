// main.js — KryptoPesa shared utilities
document.addEventListener('DOMContentLoaded', function () {
  // Hover scale on buttons
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('mouseover', () => btn.style.transform = 'scale(1.05)');
    btn.addEventListener('mouseout',  () => btn.style.transform = 'scale(1)');
  });
});
