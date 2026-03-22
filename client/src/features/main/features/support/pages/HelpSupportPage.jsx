import { ArrowLeft, CircleAlert, Loader2, RefreshCcw } from "lucide-react";
import { useNavigate } from "react-router";
import HelpCenterSection from "../components/HelpCenterSection";
import TicketsSection from "../components/TicketsSection";
import ContactFeedbackSection from "../components/ContactFeedbackSection";
import useHelpSupportController from "../hooks/useHelpSupportController";

const HelpSupportPage = () => {
    const navigate = useNavigate();
    const {
        profileId,
        shouldShowBottomNav,
        refreshing,
        refreshEverything,
        helpCenterProps,
        ticketsProps,
        contactFeedbackProps
    } = useHelpSupportController();

    return (
        <div className={`min-h-full bg-slate-950 ${shouldShowBottomNav ? "pb-[5.25rem]" : "pb-8"}`}>
            <div className="mx-auto w-full max-w-7xl px-3 pt-3 sm:px-4 sm:pt-4">
                <div className="mb-4 rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="mb-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/70 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                Back
                            </button>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                Help & Support
                            </p>
                            <h1 className="mt-1 text-xl font-semibold text-slate-100">
                                Help Center, Tickets, Contact, Feedback
                            </h1>
                            <p className="mt-1 text-sm text-slate-400">
                                Search articles, open tickets, contact support, and submit product feedback.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={refreshEverything}
                            disabled={refreshing}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800/70 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {refreshing ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <RefreshCcw className="h-3.5 w-3.5" />
                            )}
                            Refresh
                        </button>
                    </div>
                </div>

                <HelpCenterSection
                    {...helpCenterProps}
                />

                <TicketsSection
                    {...ticketsProps}
                />

                <ContactFeedbackSection
                    {...contactFeedbackProps}
                />

                <div className="rounded-xl border border-slate-800/70 bg-slate-900/50 px-3 py-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                        <CircleAlert className="h-3.5 w-3.5" />
                        Help articles support markdown formatting. Ticket and reply attachments accept image files.
                    </span>
                </div>
            </div>
        </div>
    );
};

export default HelpSupportPage;
