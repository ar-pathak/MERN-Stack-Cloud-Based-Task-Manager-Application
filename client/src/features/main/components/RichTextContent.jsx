import "./post-rich-text.css";

import { sanitizeRichTextHtml } from "../utils/richText";

const RichTextContent = ({ content = "", className = "" }) => {
    const sanitizedHtml = sanitizeRichTextHtml(content);
    if (!sanitizedHtml) return null;

    return (
        <div
            className={`post-rich-text-content ${className}`.trim()}
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
    );
};

export default RichTextContent;
