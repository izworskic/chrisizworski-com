export const CREATOR_PROFILE_URL = "https://chrisizworski.com/chris-izworski/";

const CREDIT = '<span class="creator-credit" style="display:inline-block;margin-inline-start:.65rem;font-size:.8rem;line-height:1.4;opacity:.72">Built by <a href="https://chrisizworski.com/chris-izworski/">Chris Izworski</a></span>';
const VOID_ELEMENTS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const HIDDEN_ELEMENTS = new Set(["script", "style", "template", "noscript"]);
const CONTEXT_ELEMENTS = new Set(["footer", "p", "span", "div", "li", "small", "section"]);

function decodeText(value) {
  return value.replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
}

function normalizedText(value) {
  return decodeText(value).replace(/\s+/g, " ").trim();
}

function attributesOf(tag) {
  const attrs = {};
  const source = tag.replace(/^<\/?[a-z][\w:-]*/i, "").replace(/\/?\s*>$/, "");
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of source.matchAll(pattern)) {
    const name = match[1].toLowerCase();
    attrs[name] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attrs;
}

function explicitlyHidden(tag, attrs, parentHidden) {
  if (parentHidden || HIDDEN_ELEMENTS.has(tag) || Object.hasOwn(attrs, "hidden") || attrs["aria-hidden"]?.toLowerCase() === "true") return true;
  const style = attrs.style || "";
  return /(?:^|;)\s*display\s*:\s*none\s*(?:!important\s*)?(?:;|$)/i.test(style) ||
    /(?:^|;)\s*visibility\s*:\s*hidden\s*(?:!important\s*)?(?:;|$)/i.test(style) ||
    /(?:^|;)\s*opacity\s*:\s*(?:0+(?:\.0+)?|\.0+)\s*(?:!important\s*)?(?:;|$)/i.test(style);
}

export function inspectVisibleHtml(html) {
  const source = String(html);
  const tokens = [...source.matchAll(/<!--[\s\S]*?-->|<![^>]*>|<\/?[a-z][^>]*>|[^<]+|</gi)];
  const stack = [];
  const contexts = new Map();
  const anchors = [];
  const closingTags = [];
  let visibleText = "";
  let nextContextId = 0;

  for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex++) {
    const tokenMatch = tokens[tokenIndex];
    const token = tokenMatch[0];
    if (token.startsWith("<!--") || /^<!/i.test(token)) continue;
    const tagMatch = /^<\/?([a-z][\w:-]*)\b([\s\S]*?)>$/i.exec(token);
    if (!tagMatch) {
      if (stack.some(item => item.hidden)) continue;
      const text = decodeText(token);
      visibleText += text;
      for (const item of stack) {
        if (item.contextId !== undefined) contexts.set(item.contextId, (contexts.get(item.contextId) || "") + text);
        if (item.anchor) item.anchor.text += text;
      }
      continue;
    }

    const closing = token.startsWith("</");
    const tag = tagMatch[1].toLowerCase();
    if (closing) {
      const index = stack.map(item => item.tag).lastIndexOf(tag);
      if (index >= 0) {
        const hiddenBoundary = stack.findLastIndex(item => item.hidden);
        if (hiddenBoundary >= 0 && index < hiddenBoundary) continue;
        if (!stack.some(item => item.hidden)) closingTags.push({ tag, index: tokenMatch.index });
        stack.splice(index);
      }
      continue;
    }

    const attrs = attributesOf(token);
    const hidden = explicitlyHidden(tag, attrs, stack.some(item => item.hidden));
    const item = { tag, hidden };
    if (!hidden && CONTEXT_ELEMENTS.has(tag)) {
      item.contextId = nextContextId++;
      contexts.set(item.contextId, "");
    }
    if (!hidden && tag === "a") {
      const contextIds = stack.filter(entry => entry.contextId !== undefined).map(entry => entry.contextId).concat(item.contextId === undefined ? [] : [item.contextId]);
      item.anchor = {
        href: attrs.href || "",
        text: "",
        prefixes: contextIds.map(id => normalizedText(contexts.get(id) || "")),
      };
      anchors.push(item.anchor);
    }
    if (!VOID_ELEMENTS.has(tag) && !/\/\s*>$/.test(token)) stack.push(item);
    if (!closing && (tag === "script" || tag === "style")) {
      const closeAt = source.toLowerCase().indexOf(`</${tag}`, tokenMatch.index + token.length);
      if (closeAt >= 0) {
        while (tokenIndex + 1 < tokens.length && tokens[tokenIndex + 1].index < closeAt) tokenIndex++;
      }
    }
  }
  return { text: normalizedText(visibleText), anchors: anchors.map(anchor => ({ ...anchor, text: normalizedText(anchor.text) })), contexts, closingTags };
}

export function hasVisibleCreatorAttribution(html) {
  const facts = inspectVisibleHtml(html);
  return facts.anchors.some(anchor => {
    if (anchor.href !== CREATOR_PROFILE_URL) return false;
    const textIsName = anchor.text === "Chris Izworski" || /^(?:Built\s+by|By)\s+Chris Izworski$/.test(anchor.text);
    if (!textIsName) return false;
    return anchor.prefixes.some(prefix => /\b(?:Built\s+by|By)\s*$/.test(prefix)) || /^(?:Built\s+by|By)\s+Chris Izworski$/.test(anchor.text);
  });
}

function lastVisibleClosingTag(html, tag) {
  const matches = [...String(html).matchAll(new RegExp(`</${tag}\\s*>`, "gi"))];
  const marker = "__creator_credit_insertion_point__";
  for (const match of matches.reverse()) {
    const replaced = html.slice(0, match.index) + marker + html.slice(match.index);
    if (inspectVisibleHtml(replaced).text.includes(marker)) return match.index;
  }
  return -1;
}

export function addCreatorAttribution(html) {
  if (hasVisibleCreatorAttribution(html)) return html;

  const footerClose = lastVisibleClosingTag(html, "footer");
  if (footerClose >= 0) return html.slice(0, footerClose) + CREDIT + html.slice(footerClose);

  const bodyClose = lastVisibleClosingTag(html, "body");
  if (bodyClose >= 0) {
    const footer = '<footer class="creator-credit-footer" style="padding:1rem;text-align:center">' + CREDIT + "</footer>";
    return html.slice(0, bodyClose) + footer + html.slice(bodyClose);
  }
  return html;
}
