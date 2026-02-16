import {
    BookOpenText,
    ChevronDown,
    ChevronUp,
    MessagesSquare,
    Search
} from "lucide-react";
import MarkdownArticle from "./MarkdownArticle";
import { formatDateTime } from "../utils/support.helpers";

const HelpCenterSection = ({
    articleSearch,
    setArticleSearch,
    articleCategory,
    setArticleCategory,
    articleCategories,
    categoryOptions,
    articles,
    articlesLoading,
    articlesError,
    selectedArticleSlug,
    setSelectedArticleSlug,
    articleDetailLoading,
    articleDetailError,
    selectedArticle,
    relatedArticles,
    faqs,
    openFaqId,
    setOpenFaqId
}) => {
    return (
        <>
            <section className="mb-4 rounded-2xl border border-slate-800/80 bg-slate-900/55 p-4">
                <div className="mb-3 flex items-center gap-2">
                    <BookOpenText className="h-4 w-4 text-sky-400" />
                    <h2 className="text-sm font-semibold text-slate-100">Knowledge Base</h2>
                </div>

                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem]">
                    <label className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-slate-300">
                        <Search className="h-4 w-4 text-slate-500" />
                        <input
                            value={articleSearch}
                            onChange={(event) => setArticleSearch(event.target.value)}
                            placeholder="Search help articles and FAQs"
                            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                        />
                    </label>

                    <select
                        value={articleCategory}
                        onChange={(event) => setArticleCategory(event.target.value)}
                        className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-300 outline-none focus:border-sky-500/60"
                    >
                        {categoryOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                    {articleCategories.map((category) => (
                        <button
                            key={category?.key}
                            type="button"
                            onClick={() => setArticleCategory(category?.key || "all")}
                            className={`rounded-full border px-2 py-0.5 text-[11px] ${
                                articleCategory === category?.key
                                    ? "border-sky-500/30 bg-sky-500/10 text-sky-300"
                                    : "border-slate-700 bg-slate-900/70 text-slate-400 hover:border-slate-600"
                            }`}
                        >
                            {category?.label || category?.key} ({Number(category?.count || 0)})
                        </button>
                    ))}
                </div>
            </section>

            <section className="mb-4 grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)_minmax(0,1fr)]">
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/55 p-3">
                    <h3 className="mb-2 text-sm font-semibold text-slate-100">Articles</h3>

                    {articlesLoading && (
                        <p className="text-sm text-slate-400">Loading articles...</p>
                    )}
                    {!articlesLoading && articlesError && (
                        <p className="text-sm text-rose-300">{articlesError}</p>
                    )}
                    {!articlesLoading && !articlesError && articles.length === 0 && (
                        <p className="text-sm text-slate-500">No articles found.</p>
                    )}

                    {!articlesLoading && !articlesError && articles.length > 0 && (
                        <div className="space-y-2">
                            {articles.map((article) => (
                                <button
                                    key={article.slug}
                                    type="button"
                                    onClick={() => setSelectedArticleSlug(article.slug)}
                                    className={`w-full rounded-xl border px-3 py-2 text-left ${
                                        selectedArticleSlug === article.slug
                                            ? "border-sky-500/40 bg-sky-500/10"
                                            : "border-slate-800/70 bg-slate-900/65 hover:border-slate-700"
                                    }`}
                                >
                                    <p className="line-clamp-2 text-sm font-medium text-slate-100">
                                        {article.title}
                                    </p>
                                    <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">
                                        {article.summary}
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/55 p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-slate-100">Article Detail</h3>
                        {selectedArticle ? (
                            <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2 py-0.5 text-[11px] uppercase tracking-[0.1em] text-slate-400">
                                {selectedArticle.category}
                            </span>
                        ) : null}
                    </div>

                    {articleDetailLoading && (
                        <p className="text-sm text-slate-400">Loading article...</p>
                    )}

                    {!articleDetailLoading && articleDetailError && (
                        <p className="text-sm text-rose-300">{articleDetailError}</p>
                    )}

                    {!articleDetailLoading && !articleDetailError && !selectedArticle && (
                        <p className="text-sm text-slate-500">
                            Select an article to read details.
                        </p>
                    )}

                    {!articleDetailLoading && !articleDetailError && selectedArticle && (
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-lg font-semibold text-slate-100">
                                    {selectedArticle.title}
                                </h4>
                                <p className="mt-1 text-xs text-slate-500">
                                    Updated {formatDateTime(selectedArticle.updatedAt)}
                                </p>
                            </div>

                            <MarkdownArticle markdown={selectedArticle.contentMarkdown} />

                            {relatedArticles.length > 0 && (
                                <div>
                                    <p className="mb-2 text-xs uppercase tracking-[0.14em] text-slate-500">
                                        Related articles
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {relatedArticles.map((article) => (
                                            <button
                                                key={article.slug}
                                                type="button"
                                                onClick={() => setSelectedArticleSlug(article.slug)}
                                                className="rounded-full border border-slate-700 bg-slate-900/75 px-2 py-0.5 text-[11px] text-slate-300 hover:border-slate-600 hover:text-slate-100"
                                            >
                                                {article.title}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/55 p-4">
                    <div className="mb-3 flex items-center gap-2">
                        <MessagesSquare className="h-4 w-4 text-emerald-400" />
                        <h3 className="text-sm font-semibold text-slate-100">FAQ</h3>
                    </div>

                    {faqs.length === 0 && (
                        <p className="text-sm text-slate-500">
                            No FAQ items for the current filter.
                        </p>
                    )}

                    <div className="space-y-2">
                        {faqs.map((faq) => {
                            const open = openFaqId === faq.id;

                            return (
                                <div
                                    key={faq.id}
                                    className="overflow-hidden rounded-xl border border-slate-800/75 bg-slate-900/70"
                                >
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setOpenFaqId((previous) =>
                                                previous === faq.id ? "" : faq.id
                                            )
                                        }
                                        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
                                    >
                                        <p className="text-sm text-slate-200">
                                            {faq.question}
                                        </p>
                                        {open ? (
                                            <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                                        )}
                                    </button>

                                    {open && (
                                        <div className="border-t border-slate-800/70 px-3 py-2.5">
                                            <MarkdownArticle markdown={faq.answerMarkdown} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>
        </>
    );
};

export default HelpCenterSection;
