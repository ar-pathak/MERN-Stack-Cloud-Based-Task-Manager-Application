import { Fragment } from "react";

const INLINE_TOKEN_REGEX =
    /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(`([^`]+)`)|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)/g;

const renderInlineMarkdown = (text = "", keyPrefix = "inline") => {
    const value = String(text || "");
    const nodes = [];
    let cursor = 0;
    let match;

    while ((match = INLINE_TOKEN_REGEX.exec(value)) !== null) {
        if (match.index > cursor) {
            nodes.push(
                <Fragment key={`${keyPrefix}-text-${cursor}`}>
                    {value.slice(cursor, match.index)}
                </Fragment>
            );
        }

        if (match[1]) {
            nodes.push(
                <a
                    key={`${keyPrefix}-link-${match.index}`}
                    href={match[3]}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-300 underline underline-offset-2 hover:text-sky-200"
                >
                    {match[2]}
                </a>
            );
        } else if (match[4]) {
            nodes.push(
                <code
                    key={`${keyPrefix}-code-${match.index}`}
                    className="rounded bg-slate-800 px-1 py-0.5 text-[0.86em] text-emerald-300"
                >
                    {match[5]}
                </code>
            );
        } else if (match[6]) {
            nodes.push(
                <strong key={`${keyPrefix}-bold-${match.index}`} className="font-semibold text-slate-100">
                    {match[7]}
                </strong>
            );
        } else if (match[8]) {
            nodes.push(
                <em key={`${keyPrefix}-italic-${match.index}`} className="italic text-slate-200">
                    {match[9]}
                </em>
            );
        }

        cursor = INLINE_TOKEN_REGEX.lastIndex;
    }

    if (cursor < value.length) {
        nodes.push(
            <Fragment key={`${keyPrefix}-tail-${cursor}`}>
                {value.slice(cursor)}
            </Fragment>
        );
    }

    INLINE_TOKEN_REGEX.lastIndex = 0;
    return nodes;
};

const isUnorderedListLine = (line = "") => /^[-*]\s+/.test(line.trim());
const isOrderedListLine = (line = "") => /^\d+\.\s+/.test(line.trim());

const MarkdownArticle = ({ markdown = "", className = "" }) => {
    const source = String(markdown || "").replace(/\r\n/g, "\n");
    const lines = source.split("\n");
    const blocks = [];

    let index = 0;
    while (index < lines.length) {
        const line = lines[index];
        const trimmed = line.trim();

        if (!trimmed) {
            index += 1;
            continue;
        }

        const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            const text = headingMatch[2];
            const classNames = {
                1: "text-2xl font-semibold text-slate-100",
                2: "text-xl font-semibold text-slate-100",
                3: "text-lg font-semibold text-slate-100",
                4: "text-base font-semibold text-slate-100",
                5: "text-sm font-semibold text-slate-100",
                6: "text-sm font-semibold uppercase tracking-wide text-slate-300"
            };
            const HeadingTag = `h${level}`;

            blocks.push(
                <HeadingTag key={`heading-${index}`} className={classNames[level]}>
                    {renderInlineMarkdown(text, `heading-${index}`)}
                </HeadingTag>
            );
            index += 1;
            continue;
        }

        if (isUnorderedListLine(trimmed)) {
            const items = [];
            while (index < lines.length && isUnorderedListLine(lines[index])) {
                items.push(lines[index].trim().replace(/^[-*]\s+/, ""));
                index += 1;
            }

            blocks.push(
                <ul key={`ul-${index}`} className="list-disc space-y-1 pl-5 text-slate-300">
                    {items.map((item, itemIndex) => (
                        <li key={`ul-item-${index}-${itemIndex}`}>
                            {renderInlineMarkdown(item, `ul-item-${index}-${itemIndex}`)}
                        </li>
                    ))}
                </ul>
            );
            continue;
        }

        if (isOrderedListLine(trimmed)) {
            const items = [];
            while (index < lines.length && isOrderedListLine(lines[index])) {
                items.push(lines[index].trim().replace(/^\d+\.\s+/, ""));
                index += 1;
            }

            blocks.push(
                <ol key={`ol-${index}`} className="list-decimal space-y-1 pl-5 text-slate-300">
                    {items.map((item, itemIndex) => (
                        <li key={`ol-item-${index}-${itemIndex}`}>
                            {renderInlineMarkdown(item, `ol-item-${index}-${itemIndex}`)}
                        </li>
                    ))}
                </ol>
            );
            continue;
        }

        if (/^>\s+/.test(trimmed)) {
            const quoteLines = [];
            while (index < lines.length && /^>\s+/.test(lines[index].trim())) {
                quoteLines.push(lines[index].trim().replace(/^>\s+/, ""));
                index += 1;
            }

            blocks.push(
                <blockquote
                    key={`quote-${index}`}
                    className="rounded-r-lg border-l-2 border-sky-500/60 bg-slate-900/70 px-3 py-2 text-slate-300"
                >
                    {renderInlineMarkdown(quoteLines.join(" "), `quote-${index}`)}
                </blockquote>
            );
            continue;
        }

        const paragraphLines = [];
        while (index < lines.length) {
            const current = lines[index].trim();
            if (!current) break;
            if (/^(#{1,6})\s+/.test(current)) break;
            if (isUnorderedListLine(current)) break;
            if (isOrderedListLine(current)) break;
            if (/^>\s+/.test(current)) break;
            paragraphLines.push(current);
            index += 1;
        }

        const paragraph = paragraphLines.join(" ");
        if (paragraph) {
            blocks.push(
                <p key={`p-${index}`} className="text-sm leading-6 text-slate-300">
                    {renderInlineMarkdown(paragraph, `p-${index}`)}
                </p>
            );
        }
    }

    if (blocks.length === 0) {
        return (
            <p className="text-sm text-slate-500">
                No article content available.
            </p>
        );
    }

    return (
        <div className={`space-y-3 ${className}`}>
            {blocks}
        </div>
    );
};

export default MarkdownArticle;
