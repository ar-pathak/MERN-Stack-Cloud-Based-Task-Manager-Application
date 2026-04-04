const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;
const BREAK_TAG_PATTERN = /<br\s*\/?>/gi;
const BLOCK_CLOSE_TAG_PATTERN =
    /<\/(address|article|aside|blockquote|dd|div|dl|dt|fieldset|figcaption|figure|footer|form|h[1-6]|header|hr|li|main|nav|ol|p|pre|section|table|tbody|td|tfoot|th|thead|tr|ul)>/gi;
const LIST_ITEM_OPEN_TAG_PATTERN = /<li\b[^>]*>/gi;
const INLINE_WHITESPACE_PATTERN = /[ \t]+\n/g;
const MULTILINE_BREAK_PATTERN = /\n{3,}/g;

const ALLOWED_TAGS = new Set([
    "a",
    "blockquote",
    "br",
    "code",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "li",
    "ol",
    "p",
    "pre",
    "s",
    "strong",
    "u",
    "ul"
]);

const BLOCKED_TAGS = new Set([
    "script",
    "style",
    "iframe",
    "object",
    "embed",
    "link",
    "meta"
]);

const isSafeHref = (value = "") => {
    const normalized = String(value || "").trim();
    if (!normalized) return false;

    return /^(https?:|mailto:|tel:|\/|#)/i.test(normalized);
};

const escapeHtml = (value = "") =>
    String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

const collapsePlainText = (value = "") =>
    String(value)
        .replace(/\u00a0/g, " ")
        .replace(/\r\n?/g, "\n")
        .replace(INLINE_WHITESPACE_PATTERN, "\n")
        .replace(MULTILINE_BREAK_PATTERN, "\n\n")
        .trim();

const stripHtmlTags = (content = "") => {
    const prepared = String(content)
        .replace(BREAK_TAG_PATTERN, "\n")
        .replace(BLOCK_CLOSE_TAG_PATTERN, "\n")
        .replace(LIST_ITEM_OPEN_TAG_PATTERN, "- ");

    if (typeof window !== "undefined" && typeof window.DOMParser !== "undefined") {
        const parser = new window.DOMParser();
        const document = parser.parseFromString(`<div>${prepared}</div>`, "text/html");
        return collapsePlainText(document.body.textContent || "");
    }

    return collapsePlainText(prepared.replace(/<[^>]+>/g, " "));
};

const appendSanitizedChildren = (sourceNode, targetNode, outputDocument) => {
    sourceNode.childNodes.forEach((childNode) => {
        const sanitizedChild = sanitizeNode(childNode, outputDocument);
        if (!sanitizedChild) return;
        targetNode.appendChild(sanitizedChild);
    });
};

const sanitizeAnchorAttributes = (sourceNode, targetNode) => {
    const href = String(sourceNode.getAttribute("href") || "").trim();
    if (!isSafeHref(href)) return;

    targetNode.setAttribute("href", href);

    if (/^https?:/i.test(href)) {
        targetNode.setAttribute("target", "_blank");
        targetNode.setAttribute("rel", "noopener noreferrer nofollow");
    }
};

const sanitizeNode = (node, outputDocument) => {
    if (!node) return null;

    if (node.nodeType === Node.TEXT_NODE) {
        return outputDocument.createTextNode(node.textContent || "");
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
        return null;
    }

    const tagName = String(node.nodeName || "").toLowerCase();
    if (!tagName || BLOCKED_TAGS.has(tagName)) {
        return outputDocument.createDocumentFragment();
    }

    if (!ALLOWED_TAGS.has(tagName)) {
        const fragment = outputDocument.createDocumentFragment();
        appendSanitizedChildren(node, fragment, outputDocument);
        return fragment;
    }

    const nextNode = outputDocument.createElement(tagName);

    if (tagName === "a") {
        sanitizeAnchorAttributes(node, nextNode);
    }

    if (tagName !== "br") {
        appendSanitizedChildren(node, nextNode, outputDocument);
    }

    return nextNode;
};

export const looksLikeRichTextHtml = (content = "") =>
    HTML_TAG_PATTERN.test(String(content || ""));

export const extractRichTextPlainText = (content = "") => {
    const raw = String(content || "");
    if (!raw) return "";

    if (!looksLikeRichTextHtml(raw)) {
        return collapsePlainText(raw);
    }

    return stripHtmlTags(raw);
};

export const getRichTextCharacterCount = (content = "") =>
    extractRichTextPlainText(content).length;

export const isRichTextEffectivelyEmpty = (content = "") =>
    getRichTextCharacterCount(content) === 0;

export const sanitizeRichTextHtml = (content = "") => {
    const raw = String(content || "");
    if (!raw.trim()) return "";

    if (!looksLikeRichTextHtml(raw)) {
        return escapeHtml(raw).replace(/\n/g, "<br />");
    }

    if (typeof window === "undefined" || typeof window.DOMParser === "undefined") {
        return escapeHtml(extractRichTextPlainText(raw)).replace(/\n/g, "<br />");
    }

    const parser = new window.DOMParser();
    const parsedDocument = parser.parseFromString(`<div>${raw}</div>`, "text/html");
    const outputDocument = document.implementation.createHTMLDocument("");
    const container = outputDocument.createElement("div");

    parsedDocument.body.childNodes.forEach((childNode) => {
        const sanitizedChild = sanitizeNode(childNode, outputDocument);
        if (!sanitizedChild) return;
        container.appendChild(sanitizedChild);
    });

    return container.innerHTML.trim();
};

export const normalizeRichTextForSubmission = (content = "") => {
    const sanitized = sanitizeRichTextHtml(content);
    return isRichTextEffectivelyEmpty(sanitized) ? "" : sanitized;
};

export const getRichTextPreview = (content = "", maxLength = 160) => {
    const normalized = extractRichTextPlainText(content).replace(/\s+/g, " ").trim();
    if (!normalized) return "";
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
};
