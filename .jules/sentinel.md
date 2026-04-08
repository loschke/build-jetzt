## 2024-03-31 - Unsanitized HTML rendering from Shiki
**Vulnerability:** XSS vulnerability via unsanitized rendering of HTML code from the `shiki` syntax highlighter in `src/components/assistant/code-preview.tsx` through `dangerouslySetInnerHTML`.
**Learning:** Even specialized HTML builders like syntax highlighters might output HTML that could be abused or need to be restricted to safe formatting structural tags in modern apps where source input may be controlled by AI or external text.
**Prevention:** Always sanitize any raw HTML (e.g. using `xss`) before injecting it via `dangerouslySetInnerHTML`, even if it comes from an ostensibly "safe" code formatting library. Create and enforce explicit safelists (e.g. `pre`, `code`, `span`) tailored to the expected HTML structure.
