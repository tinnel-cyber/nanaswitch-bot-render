/**
 * NANASORE - Security & Hardening Utilities
 * 
 * Provides robust HTML sanitization against XSS vectors, safe URL checking,
 * and text input sanitization for user-generated content (store descriptions,
 * product details, invoice notes, etc.).
 */

const ALLOWED_TAGS = new Set([
  'a', 'b', 'blockquote', 'br', 'code', 'div', 'em', 'h1', 'h2', 'h3', 'h4',
  'h5', 'h6', 'hr', 'i', 'li', 'ol', 'p', 'pre', 's', 'span', 'strike',
  'strong', 'sub', 'sup', 'table', 'tbody', 'td', 'th', 'thead', 'tr', 'u', 'ul',
  'img', 'small', 'mark'
]);

const ALLOWED_ATTRS = new Set([
  'href', 'title', 'target', 'rel', 'class', 'style', 'src', 'alt', 'width', 'height', 'align'
]);

const DANGEROUS_PROTOCOLS = ['javascript:', 'data:text/html', 'vbscript:', 'file:'];

/**
 * Checks whether a URL is strictly safe (prevents javascript: and dangerous execution schemes).
 */
export function isSafeUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  for (const proto of DANGEROUS_PROTOCOLS) {
    if (trimmed.startsWith(proto)) return false;
  }
  return true;
}

/**
 * Sanitizes inline CSS styles to prevent expression() or javascript url() execution.
 */
function sanitizeStyle(styleString: string): string {
  if (!styleString) return '';
  const lower = styleString.toLowerCase();
  if (
    lower.includes('expression(') ||
    lower.includes('javascript:') ||
    lower.includes('behavior:') ||
    lower.includes('-moz-binding')
  ) {
    return '';
  }
  return styleString;
}

/**
 * Robust HTML sanitizer designed for rich-text editors and preview containers.
 * Whitelists safe semantic tags and strips any event handlers, scripts, or malicious protocols.
 */
export function sanitizeRichHtml(dirtyHtml: string | null | undefined): string {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') {
    return '';
  }

  // If executing in non-DOM environment (Node.js/SSR), perform strict fallback tag filtering
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return dirtyHtml
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=/gi, 'data-blocked=')
      .replace(/javascript:/gi, 'blocked:');
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<body>${dirtyHtml}</body>`, 'text/html');
    const body = doc.body;

    // Recursively sanitize all DOM nodes
    const cleanNode = (node: Node) => {
      // 1. Text nodes are inherently safe
      if (node.nodeType === Node.TEXT_NODE) {
        return;
      }

      // 2. Element nodes
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const tagName = element.tagName.toLowerCase();

        // Remove disallowed tags completely
        if (!ALLOWED_TAGS.has(tagName)) {
          // If it's an executable/risky tag, completely eradicate it with children
          if (['script', 'iframe', 'object', 'embed', 'style', 'base', 'meta', 'link', 'svg'].includes(tagName)) {
            element.remove();
            return;
          }
          // For unknown markup tags, unwrap text children safely
          const parent = element.parentNode;
          if (parent) {
            while (element.firstChild) {
              parent.insertBefore(element.firstChild, element);
            }
            parent.removeChild(element);
          }
          return;
        }

        // Clean attributes on allowed tag
        const attrs = Array.from(element.attributes);
        for (const attr of attrs) {
          const attrName = attr.name.toLowerCase();

          // Strip all inline event listeners (onclick, onerror, onload, etc.)
          if (attrName.startsWith('on')) {
            element.removeAttribute(attr.name);
            continue;
          }

          // Strip attributes not in whitelist
          if (!ALLOWED_ATTRS.has(attrName)) {
            element.removeAttribute(attr.name);
            continue;
          }

          // Check dangerous URL protocols in href/src
          if (attrName === 'href' || attrName === 'src') {
            if (!isSafeUrl(attr.value)) {
              element.removeAttribute(attr.name);
              continue;
            }
          }

          // Ensure external links open safely
          if (tagName === 'a' && attrName === 'target' && attr.value === '_blank') {
            element.setAttribute('rel', 'noopener noreferrer');
          }

          // Sanitize inline style
          if (attrName === 'style') {
            const cleanCss = sanitizeStyle(attr.value);
            if (!cleanCss) {
              element.removeAttribute('style');
            } else {
              element.setAttribute('style', cleanCss);
            }
          }
        }

        // Recursively clean children
        const children = Array.from(element.childNodes);
        for (const child of children) {
          cleanNode(child);
        }
      } else if (node.nodeType === Node.COMMENT_NODE) {
        // Strip HTML comments
        node.parentNode?.removeChild(node);
      }
    };

    const rootChildren = Array.from(body.childNodes);
    for (const child of rootChildren) {
      cleanNode(child);
    }

    return body.innerHTML;
  } catch {
    // Fallback: strip dangerous characters
    return dirtyHtml.replace(/<[^>]*>?/gm, '');
  }
}

/**
 * Strips dangerous control characters and null bytes from text inputs
 * (search fields, customer names, PIN pads, notes).
 */
export function sanitizeInputText(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') return '';
  // Remove null bytes and invisible control characters except standard tabs & newlines
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}
