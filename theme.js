/* KryptoPesa appearance: system preference by default, saved override per browser. */
(() => {
  const key = "kryptopesa-theme";
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const valid = new Set(["light", "dark", "system"]);
  function setting() { try { const value = localStorage.getItem(key); return valid.has(value) ? value : "system"; } catch { return "system"; } }
  function apply() {
    const choice = setting();
    const effective = choice === "system" ? (media.matches ? "dark" : "light") : choice;
    document.documentElement.dataset.theme = effective;
    document.documentElement.style.colorScheme = effective;
    const control = document.getElementById("kp-theme-toggle");
    if (control) {
      control.textContent = "Theme: " + (choice === "system" ? "Auto" : choice === "dark" ? "Dark" : "Light");
      control.setAttribute("aria-label", "Appearance: " + choice + ". Change appearance");
      control.title = "Appearance preference: " + choice;
    }
  }
  apply();
  if (media.addEventListener) media.addEventListener("change", apply);
  else if (media.addListener) media.addListener(apply);
  window.addEventListener("storage", e => { if (e.key === key) apply(); });
  document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("kp-theme-toggle")) return;
    const button = document.createElement("button");
    button.id = "kp-theme-toggle";
    button.type = "button";
    button.addEventListener("click", () => {
      const cycle = { system: "light", light: "dark", dark: "system" };
      const next = cycle[setting()];
      try { localStorage.setItem(key, next); } catch {}
      apply();
    });
    document.body.appendChild(button);
    apply();
  });
})();
