'use strict';

// Keep publisher information reachable from static and composed tool pages.
module.exports = function sitePolicyLinks(html) {
  if (!/<\/body>/i.test(html)) return html;
  const links = [
    ['/about/', 'About'],
    ['/connect/', 'Contact'],
    ['/privacy/', 'Privacy Policy'],
    ['/terms/', 'Terms of Use'],
  ].filter(([href]) => !new RegExp(`href=["'](?:https://chrisizworski\\.com)?${href}["']`, 'i').test(html));
  if (!links.length) return html;
  const nav = `<nav aria-label="Site information" style="display:flex;flex-wrap:wrap;justify-content:center;gap:12px;padding:20px;font:inherit">${links.map(([href, label]) => `<a href="${href}">${label}</a>`).join('\n')}</nav>`;
  return html.replace(/<\/body>/i, `${nav}\n</body>`);
};
