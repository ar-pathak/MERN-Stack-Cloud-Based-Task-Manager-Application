import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

import "./post-rich-text.css";
import {
    extractRichTextPlainText,
    sanitizeRichTextHtml,
    looksLikeRichTextHtml,
    isRichTextEffectivelyEmpty,
} from "../utils/richText";

const TOOLBAR_OPTIONS = [
    [{ header: [1, 2, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["blockquote", "code-block", "link"],
    ["clean"]
];

const FORMATS = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "list",
    "blockquote",
    "code-block",
    "link"
];

const normalizeEditorPlainText = (value = "") =>
    String(value || "")
        .replace(/\u00a0/g, " ")
        .replace(/\r\n?/g, "\n")
        .replace(/\n$/, "");

const getEditorPlainText = (editor) => normalizeEditorPlainText(editor?.getText?.() || "");
const isTestEnvironment =
    typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent || "");

const loadQuillModule = () => {
    if (import.meta.env.DEV) {
        return import(
            /* @vite-ignore */
            "/node_modules/quill/quill.js"
        );
    }

    return import("quill");
};

const getMentionState = (plainText = "", selectionIndex = 0) => {
    if (!Number.isFinite(selectionIndex) || selectionIndex < 0) {
        return { query: "", range: null };
    }

    const beforeCursor = plainText.slice(0, selectionIndex);
    const match = /(^|\s)@([a-z0-9_]{1,20})$/i.exec(beforeCursor);
    if (!match) {
        return { query: "", range: null };
    }

    const leadingWhitespaceLength = match[1] ? match[1].length : 0;
    const startIndex =
        selectionIndex - match[0].length + leadingWhitespaceLength;

    return {
        query: String(match[2] || ""),
        range: {
            index: startIndex,
            length: selectionIndex - startIndex
        }
    };
};

const applyEditorValue = (editor, value = "") => {
    if (!editor) return;

    const raw = String(value || "");
    editor.setText("", "silent");
    if (!raw.trim()) return;

    if (looksLikeRichTextHtml(raw)) {
        editor.clipboard.dangerouslyPasteHTML(sanitizeRichTextHtml(raw), "silent");
        return;
    }

    editor.setText(raw, "silent");
};

const PostRichTextEditor = forwardRef(function PostRichTextEditor(
    {
        value = "",
        onChange,
        onMentionTriggerChange,
        placeholder = "Write something...",
        ariaLabel = "Post content",
        compact = false,
        className = ""
    },
    forwardedRef
) {
    const hostRef = useRef(null);
    const editorRef = useRef(null);
    const fallbackTextareaRef = useRef(null);
    const lastValueRef = useRef("");
    const lastMentionStateRef = useRef({ query: "", range: null });
    const onChangeRef = useRef(onChange);
    const onMentionTriggerChangeRef = useRef(onMentionTriggerChange);
    const [isEnhancedEditorReady, setIsEnhancedEditorReady] = useState(false);
    const [editorLoadFailed, setEditorLoadFailed] = useState(false);

    useEffect(() => {
        onChangeRef.current = onChange;
        onMentionTriggerChangeRef.current = onMentionTriggerChange;
    }, [onChange, onMentionTriggerChange]);

    const emitPlainTextChange = (nextPlainText, selectionIndex = nextPlainText.length) => {
        const normalizedPlainText = normalizeEditorPlainText(nextPlainText);
        const nextValue = normalizedPlainText.trim()
            ? sanitizeRichTextHtml(normalizedPlainText)
            : "";
        const mentionState = getMentionState(normalizedPlainText, selectionIndex);

        lastValueRef.current = nextValue;
        lastMentionStateRef.current = mentionState;
        onMentionTriggerChangeRef.current?.(mentionState);
        onChangeRef.current?.(nextValue, {
            plainText: normalizedPlainText,
            characterCount: normalizedPlainText.length
        });
    };

    useImperativeHandle(
        forwardedRef,
        () => ({
            focus: () => {
                if (editorRef.current) {
                    editorRef.current.focus();
                    return;
                }

                fallbackTextareaRef.current?.focus();
            },
            insertMention: (candidate) => {
                const username = String(candidate?.username || "").trim();
                if (!username) return;

                const editor = editorRef.current;
                const mentionState = lastMentionStateRef.current;

                if (editor && mentionState?.range) {
                    const insertAt = mentionState.range.index;
                    const deleteLength = mentionState.range.length;

                    editor.focus();
                    editor.deleteText(insertAt, deleteLength, "user");
                    editor.insertText(insertAt, `@${username}`, "user");
                    editor.insertText(insertAt + username.length + 1, " ", "user");
                    editor.setSelection(insertAt + username.length + 2, 0, "user");
                    return;
                }

                const textarea = fallbackTextareaRef.current;
                const currentPlainText = extractRichTextPlainText(value);
                const range = mentionState?.range || {
                    index: textarea?.selectionStart ?? currentPlainText.length,
                    length: 0
                };
                const nextPlainText = `${currentPlainText.slice(0, range.index)}@${username} ${currentPlainText.slice(range.index + range.length)}`;
                const nextCursorIndex = range.index + username.length + 2;

                emitPlainTextChange(nextPlainText, nextCursorIndex);
                requestAnimationFrame(() => {
                    textarea?.focus();
                    textarea?.setSelectionRange(nextCursorIndex, nextCursorIndex);
                });
            },
            getPlainText: () =>
                editorRef.current
                    ? getEditorPlainText(editorRef.current)
                    : extractRichTextPlainText(value)
        }),
        [value]
    );

    useEffect(() => {
        if (!hostRef.current || isTestEnvironment || editorRef.current) return undefined;

        let active = true;
        let cleanup = null;

        const loadEditor = async () => {
            try {
                const module = await loadQuillModule();
                if (!active || !hostRef.current) return;

                const Quill = module?.default;
                if (!Quill) {
                    throw new Error("Quill failed to load");
                }

                const editor = new Quill(hostRef.current, {
                    theme: "snow",
                    placeholder,
                    modules: {
                        toolbar: TOOLBAR_OPTIONS
                    },
                    formats: FORMATS
                });

                editor.root.setAttribute("aria-label", ariaLabel);
                editor.root.setAttribute("spellcheck", "true");
                editorRef.current = editor;
                applyEditorValue(editor, value);
                lastValueRef.current = isRichTextEffectivelyEmpty(value)
                    ? ""
                    : String(value || "");

                const emitMentionState = (selectionIndex) => {
                    const plainText = getEditorPlainText(editor);
                    const mentionState = getMentionState(plainText, selectionIndex);
                    lastMentionStateRef.current = mentionState;
                    onMentionTriggerChangeRef.current?.(mentionState);
                };

                const handleTextChange = () => {
                    const plainText = getEditorPlainText(editor);
                    const selectionIndex = editor.getSelection()?.index ?? plainText.length;
                    const nextValue = plainText.trim()
                        ? sanitizeRichTextHtml(editor.root.innerHTML)
                        : "";

                    lastValueRef.current = nextValue;
                    emitMentionState(selectionIndex);
                    onChangeRef.current?.(nextValue, {
                        plainText,
                        characterCount: plainText.trim().length ? plainText.length : 0
                    });
                };

                const handleSelectionChange = (range) => {
                    if (!range || range.length > 0) {
                        onMentionTriggerChangeRef.current?.({ query: "", range: null });
                        lastMentionStateRef.current = { query: "", range: null };
                        return;
                    }

                    emitMentionState(range.index);
                };

                editor.on("text-change", handleTextChange);
                editor.on("selection-change", handleSelectionChange);
                setIsEnhancedEditorReady(true);
                setEditorLoadFailed(false);

                cleanup = () => {
                    editor.off("text-change", handleTextChange);
                    editor.off("selection-change", handleSelectionChange);
                    editorRef.current = null;
                    if (hostRef.current) {
                        hostRef.current.innerHTML = "";
                    }
                };
            } catch (error) {
                if (!active) return;
                setEditorLoadFailed(true);
                setIsEnhancedEditorReady(false);
                console.warn("Falling back to plain textarea editor.", error);
            }
        };

        loadEditor();

        return () => {
            active = false;
            cleanup?.();
        };
    }, [ariaLabel, placeholder]);

    useEffect(() => {
        if (!editorRef.current) return;

        const editor = editorRef.current;
        const normalizedValue = isRichTextEffectivelyEmpty(value)
            ? ""
            : String(value || "");

        if (normalizedValue === lastValueRef.current) {
            return;
        }

        const previousSelection = editor.getSelection();
        applyEditorValue(editor, normalizedValue);
        lastValueRef.current = normalizedValue;

        if (previousSelection) {
            const nextIndex = Math.min(previousSelection.index, Math.max(editor.getLength() - 1, 0));
            editor.setSelection(nextIndex, previousSelection.length, "silent");
        }
    }, [value]);

    const handleFallbackChange = (event) => {
        const nextPlainText = event.target.value;
        emitPlainTextChange(nextPlainText, event.target.selectionStart ?? nextPlainText.length);
    };

    const handleFallbackSelect = (event) => {
        const nextPlainText = event.target.value;
        const mentionState = getMentionState(
            normalizeEditorPlainText(nextPlainText),
            event.target.selectionStart ?? nextPlainText.length
        );
        lastMentionStateRef.current = mentionState;
        onMentionTriggerChangeRef.current?.(mentionState);
    };

    const plainTextValue = extractRichTextPlainText(value);
    const showFallback = isTestEnvironment || editorLoadFailed || !isEnhancedEditorReady;

    return (
        <div
            className={`post-rich-text-editor ${compact ? "is-compact" : ""} ${className}`.trim()}
        >
            {showFallback && (
                <textarea
                    ref={fallbackTextareaRef}
                    aria-label={ariaLabel}
                    placeholder={placeholder}
                    rows={compact ? 5 : 6}
                    value={plainTextValue}
                    onChange={handleFallbackChange}
                    onClick={handleFallbackSelect}
                    onKeyUp={handleFallbackSelect}
                    onSelect={handleFallbackSelect}
                    className="post-rich-text-fallback w-full rounded-xl border border-slate-700/80 bg-slate-950/70 px-3 py-3 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-slate-600"
                />
            )}
            <div
                ref={hostRef}
                className={showFallback ? "hidden" : ""}
            />
        </div>
    );
});

export default PostRichTextEditor;
