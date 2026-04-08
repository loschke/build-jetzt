import xss from "xss"

/**
 * Custom XSS configuration for Shiki HTML.
 * Allows standard structural tags and class/style attributes required by Shiki.
 */
export const sanitizeShikiHtml = (html: string) => {
  return xss(html, {
    whiteList: {
      pre: ["class", "style", "tabindex"],
      code: ["class", "style", "dir"],
      span: ["class", "style", "line", "data-line"],
      div: ["class", "style"],
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ["script", "style", "xml", "iframe", "object", "embed"],
  })
}
