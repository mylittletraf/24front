import DOMPurify from "isomorphic-dompurify";

/** Sanitize backend-provided HTML (collection content, ad slots) before rendering. */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html);
}
