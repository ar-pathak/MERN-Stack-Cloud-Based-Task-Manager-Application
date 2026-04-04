const BREAK_TAG_PATTERN = /<br\s*\/?>/gi;
const BLOCK_CLOSE_TAG_PATTERN =
    /<\/(address|article|aside|blockquote|dd|div|dl|dt|fieldset|figcaption|figure|footer|form|h[1-6]|header|hr|li|main|nav|ol|p|pre|section|table|tbody|td|tfoot|th|thead|tr|ul)>/gi;
const LIST_ITEM_OPEN_TAG_PATTERN = /<li\b[^>]*>/gi;

const decodeHtmlEntities = (value = "") =>
    String(value)
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&#x27;/gi, "'");

const normalizeWhitespace = (value = "") =>
    String(value)
        .replace(/\u00a0/g, " ")
        .replace(/\r\n?/g, "\n")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

const stripRichTextToPlainText = (value = "") => {
    const raw = String(value || "");
    if (!raw) return "";

    const withoutTags = raw
        .replace(BREAK_TAG_PATTERN, "\n")
        .replace(BLOCK_CLOSE_TAG_PATTERN, "\n")
        .replace(LIST_ITEM_OPEN_TAG_PATTERN, "- ")
        .replace(/<[^>]+>/g, " ");

    return normalizeWhitespace(decodeHtmlEntities(withoutTags));
};

const getRichTextLength = (value = "") => stripRichTextToPlainText(value).length;

const getRichTextPreview = (value = "", maxLength = 160) => {
    const normalized = stripRichTextToPlainText(value).replace(/\s+/g, " ").trim();
    if (!normalized) return "";
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
};

module.exports = {
    stripRichTextToPlainText,
    getRichTextLength,
    getRichTextPreview
};
