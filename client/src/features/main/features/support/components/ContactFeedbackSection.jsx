import { Loader2, Star } from "lucide-react";
import {
    CATEGORY_OPTIONS,
    FEEDBACK_TYPE_OPTIONS
} from "../constants/support.constants";
import { formatDateTime, toIdString } from "../utils/support.helpers";
import { StarRatingInput } from "./SupportUI";

const ContactFeedbackSection = ({
    contactForm,
    setContactForm,
    contactSubmitting,
    handleSubmitContact,
    feedbackForm,
    setFeedbackForm,
    feedbackSubmitting,
    handleSubmitFeedback,
    feedbackLoading,
    feedbackError,
    feedbackItems,
    feedbackSummary
}) => {
    return (
        <section className="mb-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/55 p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-100">Contact Support</h3>
                <p className="mb-3 text-xs text-slate-500">
                    Submitting this form automatically creates a support ticket.
                </p>

                <form onSubmit={handleSubmitContact} className="space-y-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                        <input
                            value={contactForm.name}
                            onChange={(event) =>
                                setContactForm((previous) => ({
                                    ...previous,
                                    name: event.target.value
                                }))
                            }
                            placeholder="Name"
                            className="w-full rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500/60"
                            required
                        />
                        <input
                            type="email"
                            value={contactForm.email}
                            onChange={(event) =>
                                setContactForm((previous) => ({
                                    ...previous,
                                    email: event.target.value
                                }))
                            }
                            placeholder="Email"
                            className="w-full rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500/60"
                            required
                        />
                    </div>

                    <textarea
                        value={contactForm.message}
                        onChange={(event) =>
                            setContactForm((previous) => ({
                                ...previous,
                                message: event.target.value
                            }))
                        }
                        rows={5}
                        placeholder="How can we help?"
                        className="w-full rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500/60"
                        required
                    />

                    <button
                        type="submit"
                        disabled={contactSubmitting}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {contactSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        Submit Contact Request
                    </button>
                </form>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/55 p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-100">User Feedback</h3>

                <form onSubmit={handleSubmitFeedback} className="space-y-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                        <select
                            value={feedbackForm.type}
                            onChange={(event) =>
                                setFeedbackForm((previous) => ({
                                    ...previous,
                                    type: event.target.value
                                }))
                            }
                            className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-300 outline-none focus:border-sky-500/60"
                        >
                            {FEEDBACK_TYPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>

                        <select
                            value={feedbackForm.category}
                            onChange={(event) =>
                                setFeedbackForm((previous) => ({
                                    ...previous,
                                    category: event.target.value
                                }))
                            }
                            className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-300 outline-none focus:border-sky-500/60"
                        >
                            {CATEGORY_OPTIONS.filter((option) => option.value !== "all").map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <input
                        value={feedbackForm.title}
                        onChange={(event) =>
                            setFeedbackForm((previous) => ({
                                ...previous,
                                title: event.target.value
                            }))
                        }
                        placeholder="Title (optional)"
                        className="w-full rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500/60"
                    />

                    <textarea
                        value={feedbackForm.message}
                        onChange={(event) =>
                            setFeedbackForm((previous) => ({
                                ...previous,
                                message: event.target.value
                            }))
                        }
                        rows={4}
                        placeholder="Share your feature idea or bug details."
                        className="w-full rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500/60"
                        required
                    />

                    <div className="rounded-xl border border-slate-800/70 bg-slate-900/75 px-3 py-2">
                        <p className="text-xs text-slate-500">App rating</p>
                        <StarRatingInput
                            value={feedbackForm.rating}
                            onChange={(rating) =>
                                setFeedbackForm((previous) => ({
                                    ...previous,
                                    rating
                                }))
                            }
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={feedbackSubmitting}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {feedbackSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        Submit Feedback
                    </button>
                </form>

                <div className="mt-4 border-t border-slate-800/70 pt-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                            Recent feedback
                        </p>
                        <span className="text-xs text-slate-500">
                            Avg rating: {Number(feedbackSummary?.averageRating || 0).toFixed(2)}
                        </span>
                    </div>

                    {feedbackLoading && (
                        <p className="text-sm text-slate-400">Loading feedback...</p>
                    )}
                    {!feedbackLoading && feedbackError && (
                        <p className="text-sm text-rose-300">{feedbackError}</p>
                    )}
                    {!feedbackLoading && !feedbackError && feedbackItems.length === 0 && (
                        <p className="text-sm text-slate-500">No feedback submitted yet.</p>
                    )}

                    <div className="space-y-2">
                        {feedbackItems.map((item) => (
                            <article
                                key={toIdString(item?._id)}
                                className="rounded-xl border border-slate-800/75 bg-slate-900/70 px-3 py-2"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                                        {item?.type === "bug_report" ? "Bug report" : "Feature request"}
                                    </p>
                                    <div className="flex items-center gap-0.5">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Star
                                                key={`${toIdString(item?._id)}-star-${star}`}
                                                className={`h-3.5 w-3.5 ${
                                                    star <= Number(item?.rating || 0)
                                                        ? "fill-amber-400 text-amber-400"
                                                        : "text-slate-700"
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                                {item?.title ? (
                                    <p className="mt-1 text-sm font-medium text-slate-200">
                                        {item.title}
                                    </p>
                                ) : null}
                                <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                                    {item?.message || ""}
                                </p>
                                <p className="mt-1 text-[11px] text-slate-500">
                                    {formatDateTime(item?.createdAt)}
                                </p>
                            </article>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ContactFeedbackSection;
