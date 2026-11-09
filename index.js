/* Shared policy-page presentation and email-provider chooser. */
(() => {
  'use strict';
  const style = document.createElement('style');
  style.textContent = `
    .kp-legal { box-sizing:border-box; max-width:none; margin:0; padding:0; background:#f4f6fb; color:#25314c; font:16px/1.8 'Segoe UI',system-ui,sans-serif; }
    .kp-legal *, .kp-email-dialog * { box-sizing:border-box; }
    .kp-legal a { color:#253591; text-underline-offset:4px; }
    .kp-legal a:hover { text-decoration:underline; }
    .kp-legal a:focus-visible,.kp-email-dialog a:focus-visible,.kp-email-dialog button:focus-visible { outline:3px solid #b77b00; outline-offset:4px; }
    .kp-legal .kp-header { background:#1a237e; padding:20px max(24px,calc((100vw - 1120px)/2)); display:flex; align-items:center; justify-content:space-between; gap:24px; }
    .kp-legal .kp-brand { display:flex; gap:12px; align-items:center; color:white; text-decoration:none; font-size:22px; font-weight:750; }
    .kp-brand img { width:40px; height:40px; border-radius:10px; }
    .kp-legal nav { display:flex; gap:8px; flex-wrap:wrap; }
    .kp-legal .kp-header nav a { color:#fff; text-decoration:none; padding:8px 13px; border-radius:8px; font-size:14px; }
    .kp-legal .kp-header nav a[aria-current=page] { background:#ffd600; color:#151c63; font-weight:700; }
    .kp-legal .kp-header nav a:hover { box-shadow:inset 0 0 0 1px #bac3ff; }
    .kp-legal .kp-hero { background:linear-gradient(120deg,#1a237e,#123f87); color:#fff; padding:50px max(24px,calc((100vw - 1120px)/2)) 60px; }
    .kp-legal .kp-eyebrow { color:#ffe366; letter-spacing:2px; font-size:12px; font-weight:750; text-transform:uppercase; }
    .kp-legal h1 { max-width:850px; margin:14px 0 18px; font-size:clamp(32px,5vw,50px); letter-spacing:-1.5px; line-height:1.15; }
    .kp-legal .kp-hero p { margin:0; color:#dce4ff; font-size:14px; }
    .kp-legal .kp-layout { display:grid; grid-template-columns:230px minmax(0,1fr); max-width:1168px; padding:38px 24px 56px; margin:auto; gap:32px; align-items:start; }
    .kp-legal .kp-sidebar { position:sticky; top:24px; padding:22px 0; }
    .kp-legal .kp-sidebar strong { font-size:12px; text-transform:uppercase; letter-spacing:1.5px; color:#65708b; }
    .kp-legal .kp-sidebar nav { flex-direction:column; margin-top:16px; }
    .kp-legal .kp-sidebar a { text-decoration:none; font-size:14px; padding:8px 12px; border-left:2px solid #dce1ef; }
    .kp-legal .kp-sidebar a:hover { background:#e8ecf8; border-color:#1a237e; }
    .kp-legal main { min-width:0; background:white; padding:40px 44px; border:1px solid #e0e5f0; border-radius:18px; box-shadow:0 8px 30px #18266006; }
    .kp-legal main p { margin:0 0 22px; overflow-wrap:anywhere; }
    .kp-legal main > p:first-child { font-size:17px; color:#4f5b75; border-bottom:1px solid #e4e8f1; padding-bottom:25px; }
    .kp-legal h2 { font-size:21px; line-height:1.4; color:#1a237e; margin:30px 0 12px; scroll-margin-top:24px; }
    .kp-legal main p:last-child { margin-bottom:0; }
    .kp-legal footer { margin:0; padding:28px max(24px,calc((100vw - 1120px)/2)); border-top:1px solid #dfe4f0; background:white; font-size:14px; color:#59657c; }
    .kp-email-dialog { color:#25314c; background:#fff; width:min(440px,calc(100% - 32px)); max-height:calc(100dvh - 40px); overflow:auto; border:1px solid #dfe4f0; border-radius:20px; padding:28px; margin:auto; box-shadow:0 24px 100px #111b5440; font:16px/1.6 'Segoe UI',system-ui,sans-serif; text-align:left; }
    .kp-email-dialog::backdrop { background:#0c133a99; }
    .kp-email-dialog h2 { color:#1a237e; font-size:24px; margin:0 0 8px; line-height:1.3; }
    .kp-email-dialog p { color:#5b667e; font-size:14px; margin:0 0 20px; }
    .kp-email-providers { display:grid; gap:10px; }
    .kp-email-providers a { display:block; border:1px solid #dce2ef; border-radius:10px; padding:12px 16px; color:#1a237e; background:#f8f9fd; text-decoration:none; font-weight:650; }
    .kp-email-providers a:hover { border-color:#1a237e; background:#eef1ff; }
    .kp-email-dialog button { display:block; width:100%; margin-top:20px; padding:10px; border:0; border-radius:8px; background:#1a237e; color:white; font:600 14px/1.5 'Segoe UI',system-ui,sans-serif; cursor:pointer; }
    @media(max-width:760px) { .kp-legal .kp-header { align-items:flex-start; flex-direction:column; gap:14px; padding:18px 20px; } .kp-legal .kp-header nav { gap:2px; } .kp-legal .kp-header nav a { padding:7px 10px; } .kp-legal .kp-hero { padding:32px 20px 38px; } .kp-legal .kp-layout { grid-template-columns:1fr; gap:18px; padding:22px 16px 36px; } .kp-legal .kp-sidebar { position:static; padding:0 6px; } .kp-legal .kp-sidebar nav { flex-direction:row; gap:4px 12px; margin-top:8px; } .kp-legal .kp-sidebar a { padding:4px 8px; font-size:13px; } .kp-legal main { padding:24px; border-radius:14px; } }
    @media print { .kp-legal .kp-header,.kp-legal .kp-sidebar,.kp-email-dialog { display:none; } .kp-legal .kp-hero { background:white; color:#111; padding:0; } .kp-legal .kp-hero p,.kp-legal .kp-eyebrow { color:#444; } .kp-legal .kp-layout { display:block; padding:20px 0; } .kp-legal main { padding:0; border:0; box-shadow:none; } }
  `;
  document.head.append(style);

  const policy = /^(terms|privacy|cookies)\.html$/.test(location.pathname.split('/').pop());
  if (policy) {
    document.body.classList.add('kp-legal');
    const nav = document.querySelector('body > nav');
    const main = document.querySelector('main');
    const heading = main.querySelector('h1');
    const footer = document.querySelector('footer');
    const header = document.createElement('header');
    header.className = 'kp-header';
    const brand = document.createElement('a');
    brand.className = 'kp-brand';
    brand.href = 'index.html';
    brand.innerHTML = '<img src="logo.jpg" alt="" width="40" height="40">KryptoPesa';
    nav.setAttribute('aria-label', 'Policy navigation');
    Array.from(nav.childNodes).filter(node => node.nodeType === 3).forEach(node => node.remove());
    nav.querySelectorAll('a').forEach(link => {
      if (new URL(link.href).pathname === location.pathname) link.setAttribute('aria-current', 'page');
    });
    header.append(brand, nav);
    const hero = document.createElement('section');
    hero.className = 'kp-hero';
    const eyebrow = document.createElement('span');
    eyebrow.className = 'kp-eyebrow';
    eyebrow.textContent = 'KryptoPesa / Legal';
    const updated = document.createElement('p');
    updated.textContent = footer.textContent.match(/Last updated:.*$/)?.[0] || '';
    hero.append(eyebrow, heading, updated);
    const layout = document.createElement('div');
    layout.className = 'kp-layout';
    const sidebar = document.createElement('aside');
    sidebar.className = 'kp-sidebar';
    sidebar.innerHTML = '<strong>On this page</strong><nav aria-label="On this page"></nav>';
    const headings = main.querySelectorAll('h2');
    const targets = headings.length ? [...headings] : [...main.querySelectorAll('p')];
    targets.forEach((target, index) => {
      target.id = `policy-section-${index + 1}`;
      const link = document.createElement('a');
      link.href = `#${target.id}`;
      link.textContent = headings.length ? target.textContent : ['Essential storage', 'Tracking and consent', 'Your choices'][index] || 'Information';
      sidebar.querySelector('nav').append(link);
    });
    document.body.prepend(header, hero);
    main.before(layout);
    layout.append(sidebar, main);
  }

  const dialog = document.createElement('dialog');
  dialog.className = 'kp-email-dialog';
  dialog.id = 'kp-email-dialog';
  dialog.setAttribute('aria-labelledby', 'kp-email-title');
  dialog.setAttribute('aria-describedby', 'kp-email-description');
  dialog.innerHTML = '<h2 id="kp-email-title">Email us</h2><p id="kp-email-description">Choose your email provider. A draft opens with our address filled in. You may need to sign in.</p><div class="kp-email-providers"></div><button type="button" autofocus>Cancel</button>';
  document.body.append(dialog);
  let opener;
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => opener?.focus());
  dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
  document.querySelectorAll('a[href^="mailto:"]').forEach(link => {
    link.textContent = 'Email us';
    link.setAttribute('aria-haspopup', 'dialog');
    link.setAttribute('aria-controls', dialog.id);
    link.addEventListener('click', event => {
      if (typeof dialog.showModal !== 'function') return;
      event.preventDefault();
      opener = link;
      const mail = new URL(link.href);
      const recipient = decodeURIComponent(mail.pathname);
      const subject = mail.searchParams.get('subject') || 'KryptoPesa inquiry';
      const body = mail.searchParams.get('body') || '';
      const providers = [
        ['Gmail', 'https://mail.google.com/mail/?' + new URLSearchParams({view:'cm',fs:'1',to:recipient,su:subject,body})],
        ['Outlook', 'https://outlook.live.com/mail/0/deeplink/compose?' + new URLSearchParams({to:recipient,subject,body})],
        ['Yahoo Mail', 'https://compose.mail.yahoo.com/?' + new URLSearchParams({to:recipient,subject,body})],
        ['Default email app', link.href]
      ];
      const list = dialog.querySelector('.kp-email-providers');
      list.replaceChildren();
      providers.forEach(([name, href]) => {
        const provider = document.createElement('a');
        provider.textContent = name;
        provider.href = href;
        if (href.startsWith('https:')) {
          provider.target = '_blank';
          provider.rel = 'noopener noreferrer';
          provider.setAttribute('aria-label', `${name} (opens in a new tab)`);
        }
        provider.addEventListener('click', () => dialog.close());
        list.append(provider);
      });
      dialog.showModal();
    });
  });
})();
