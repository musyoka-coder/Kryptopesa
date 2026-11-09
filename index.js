/* Email-provider chooser for mailto: links.
 *
 * The dialog's styling lives in assets/kp-tokens.css rather than an injected
 * <style> element, so this file works under the site's `style-src 'self'` CSP.
 * If <dialog> is unsupported the link keeps its plain mailto behaviour.
 */
(() => {
  'use strict';

  const links = Array.from(document.querySelectorAll('a[href^="mailto:"]'));
  if (!links.length) return;

  const dialog = document.createElement('dialog');
  dialog.className = 'kp-email-dialog';
  dialog.id = 'kp-email-dialog';
  dialog.setAttribute('aria-labelledby', 'kp-email-dialog-title');
  dialog.setAttribute('aria-describedby', 'kp-email-dialog-desc');

  const title = document.createElement('h2');
  title.id = 'kp-email-dialog-title';
  title.textContent = 'Email us';

  const description = document.createElement('p');
  description.id = 'kp-email-dialog-desc';
  description.textContent =
    'Choose your email provider. A draft opens with our address filled in. You may need to sign in.';

  const providers = document.createElement('div');
  providers.className = 'kp-email-providers';

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'kp-email-dialog__cancel';
  cancel.textContent = 'Cancel';

  dialog.append(title, description, providers, cancel);
  document.body.append(dialog);

  let opener = null;

  cancel.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    opener?.focus();
    opener = null;
  });
  dialog.addEventListener('click', event => {
    const box = dialog.getBoundingClientRect();
    const outside =
      event.clientX < box.left || event.clientX > box.right ||
      event.clientY < box.top || event.clientY > box.bottom;
    if (event.target === dialog && outside) dialog.close();
  });

  const buildProviders = href => {
    const mail = new URL(href);
    const recipient = decodeURIComponent(mail.pathname);
    const subject = mail.searchParams.get('subject') || 'KryptoPesa inquiry';
    const body = mail.searchParams.get('body') || '';
    const query = (keys, values) => new URLSearchParams(
      Object.fromEntries(keys.map((key, index) => [key, values[index]]))
    ).toString();

    return [
      ['Gmail', 'https://mail.google.com/mail/?' + query(['view', 'fs', 'to', 'su', 'body'], ['cm', '1', recipient, subject, body])],
      ['Outlook', 'https://outlook.live.com/mail/0/deeplink/compose?' + query(['to', 'subject', 'body'], [recipient, subject, body])],
      ['Yahoo Mail', 'https://compose.mail.yahoo.com/?' + query(['to', 'subject', 'body'], [recipient, subject, body])],
      ['Default email app', href]
    ];
  };

  links.forEach(link => {
    link.textContent = 'Email us';
    if (typeof dialog.showModal !== 'function') return;

    link.setAttribute('aria-haspopup', 'dialog');
    link.setAttribute('aria-controls', dialog.id);
    link.addEventListener('click', event => {
      event.preventDefault();
      opener = link;
      providers.replaceChildren();

      buildProviders(link.href).forEach(([name, href]) => {
        const provider = document.createElement('a');
        provider.textContent = name;
        provider.href = href;
        if (href.startsWith('https:')) {
          provider.target = '_blank';
          provider.rel = 'noopener noreferrer';
          provider.setAttribute('aria-label', name + ' (opens in a new tab)');
        }
        provider.addEventListener('click', () => dialog.close());
        providers.append(provider);
      });

      dialog.showModal();
    });
  });
})();
