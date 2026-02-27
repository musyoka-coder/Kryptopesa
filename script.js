// script.js — Form tab switcher (legacy support)
function showForm(id) {
  ['login', 'signup', 'reset'].forEach(name => {
    const el = document.getElementById(name);
    if (el) el.style.display = name === id ? 'block' : 'none';
  });
}
