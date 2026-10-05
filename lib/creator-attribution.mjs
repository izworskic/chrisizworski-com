export const CREATOR_PROFILE_URL = "https://chrisizworski.com/chris-izworski/";

const CREDIT = '<span class="creator-credit" style="font-size:.8rem;line-height:1.4;opacity:.72">Built by <a href="https://chrisizworski.com/chris-izworski/">Chris Izworski</a></span>';

export function addCreatorAttribution(html) {
  if (html.includes('href="' + CREATOR_PROFILE_URL + '"') && html.includes("Built by")) return html;

  const footerClose = html.toLowerCase().lastIndexOf("</footer>");
  if (footerClose >= 0) {
    return html.slice(0, footerClose) + CREDIT + html.slice(footerClose);
  }

  const bodyClose = html.toLowerCase().lastIndexOf("</body>");
  if (bodyClose >= 0) {
    const footer = '<footer class="creator-credit-footer" style="padding:1rem;text-align:center">' + CREDIT + "</footer>";
    return html.slice(0, bodyClose) + footer + html.slice(bodyClose);
  }

  throw new Error("Cannot add creator attribution: HTML has no </footer> or </body>.");
}
