import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "../../../../../context/AuthContext";
import { uploadService } from "../../../../../service/upload.service";
import {
    addSupportTicketComment,
    createSupportTicket,
    getMySupportFeedback,
    getSupportArticle,
    getSupportArticles,
    getSupportFaqs,
    getSupportTicketById,
    getSupportTickets,
    submitContactSupport,
    submitSupportFeedback
} from "../../../../../service/support.service";
import {
    CATEGORY_OPTIONS,
    INITIAL_FEEDBACK_FORM,
    INITIAL_TICKET_FORM,
    MOBILE_BREAKPOINT
} from "../constants/support.constants";
import {
    buildCommentTree,
    normalizeErrorMessage,
    toIdString
} from "../utils/support.helpers";

const useHelpSupportController = () => {
    const { user } = useAuth();
    const profileId = toIdString(user?._id || user?.id || user);

    const [isMobileViewport, setIsMobileViewport] = useState(() =>
        typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false
    );
    const [refreshing, setRefreshing] = useState(false);

    const [articleSearch, setArticleSearch] = useState("");
    const [articleCategory, setArticleCategory] = useState("all");
    const [articles, setArticles] = useState([]);
    const [articleCategories, setArticleCategories] = useState([]);
    const [articlesLoading, setArticlesLoading] = useState(true);
    const [articlesError, setArticlesError] = useState("");
    const [selectedArticleSlug, setSelectedArticleSlug] = useState("");
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [relatedArticles, setRelatedArticles] = useState([]);
    const [articleDetailLoading, setArticleDetailLoading] = useState(false);
    const [articleDetailError, setArticleDetailError] = useState("");
    const [faqs, setFaqs] = useState([]);
    const [openFaqId, setOpenFaqId] = useState("");

    const [ticketStatusFilter, setTicketStatusFilter] = useState("all");
    const [tickets, setTickets] = useState([]);
    const [ticketStatuses, setTicketStatuses] = useState([]);
    const [ticketsLoading, setTicketsLoading] = useState(true);
    const [ticketsError, setTicketsError] = useState("");
    const [selectedTicketId, setSelectedTicketId] = useState("");
    const [ticketDetail, setTicketDetail] = useState(null);
    const [ticketDetailLoading, setTicketDetailLoading] = useState(false);
    const [ticketDetailError, setTicketDetailError] = useState("");
    const [ticketForm, setTicketForm] = useState({ ...INITIAL_TICKET_FORM });
    const [ticketFiles, setTicketFiles] = useState([]);
    const [ticketSubmitting, setTicketSubmitting] = useState(false);
    const [commentBody, setCommentBody] = useState("");
    const [commentReplyParentId, setCommentReplyParentId] = useState("");
    const [commentFiles, setCommentFiles] = useState([]);
    const [commentSubmitting, setCommentSubmitting] = useState(false);

    const [contactForm, setContactForm] = useState({
        name: user?.name || "",
        email: user?.email || "",
        message: ""
    });
    const [contactSubmitting, setContactSubmitting] = useState(false);

    const [feedbackForm, setFeedbackForm] = useState({ ...INITIAL_FEEDBACK_FORM });
    const [feedbackItems, setFeedbackItems] = useState([]);
    const [feedbackSummary, setFeedbackSummary] = useState({
        averageRating: 0,
        total: 0
    });
    const [feedbackLoading, setFeedbackLoading] = useState(true);
    const [feedbackError, setFeedbackError] = useState("");
    const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

    useEffect(() => {
        const onResize = () => setIsMobileViewport(window.innerWidth < MOBILE_BREAKPOINT);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    useEffect(() => {
        setContactForm((previous) => ({
            ...previous,
            name: previous.name || user?.name || "",
            email: previous.email || user?.email || ""
        }));
    }, [user?.name, user?.email]);

    const uploadImageAttachments = useCallback(async (files = []) => {
        const selectedFiles = Array.isArray(files) ? files : Array.from(files || []);
        if (!selectedFiles.length) return [];

        if (selectedFiles.length > 5) {
            throw new Error("You can upload up to 5 screenshots at a time.");
        }

        const hasUnsupportedFile = selectedFiles.some(
            (file) => !String(file?.type || "").startsWith("image/")
        );
        if (hasUnsupportedFile) {
            throw new Error("Only image attachments are supported.");
        }

        const uploaded = await uploadService.uploadMultipleFiles(selectedFiles);
        const normalized = Array.isArray(uploaded) ? uploaded : [];

        return normalized
            .map((entry) => ({
                url: String(entry?.url || "").trim(),
                name: String(entry?.name || "").trim(),
                type: String(entry?.type || "").trim(),
                size: Math.max(0, Number(entry?.size || 0))
            }))
            .filter((attachment) => Boolean(attachment.url));
    }, []);

    const loadArticles = useCallback(async ({ silent = false } = {}) => {
        if (!silent) setArticlesLoading(true);
        setArticlesError("");

        try {
            const result = await getSupportArticles({
                category: articleCategory,
                search: String(articleSearch || "").trim() || undefined,
                limit: 50
            });

            const nextArticles = Array.isArray(result?.articles) ? result.articles : [];
            setArticles(nextArticles);
            setArticleCategories(Array.isArray(result?.categories) ? result.categories : []);
            setSelectedArticleSlug((previous) => {
                if (previous && nextArticles.some((article) => article.slug === previous)) {
                    return previous;
                }
                return nextArticles[0]?.slug || "";
            });
        } catch (error) {
            setArticlesError(normalizeErrorMessage(error, "Failed to load help articles."));
            setArticles([]);
            setArticleCategories([]);
            setSelectedArticleSlug("");
        } finally {
            if (!silent) setArticlesLoading(false);
        }
    }, [articleCategory, articleSearch]);

    const loadFaqs = useCallback(async () => {
        try {
            const result = await getSupportFaqs({
                category: articleCategory,
                search: String(articleSearch || "").trim() || undefined
            });
            setFaqs(Array.isArray(result?.faqs) ? result.faqs : []);
            setOpenFaqId((previous) => {
                if (previous && result?.faqs?.some((faq) => faq.id === previous)) {
                    return previous;
                }
                return "";
            });
        } catch {
            setFaqs([]);
            setOpenFaqId("");
        }
    }, [articleCategory, articleSearch]);

    const loadTickets = useCallback(async ({ silent = false } = {}) => {
        if (!silent) setTicketsLoading(true);
        setTicketsError("");

        try {
            const result = await getSupportTickets({
                status: ticketStatusFilter,
                limit: 50
            });
            const nextTickets = Array.isArray(result?.tickets) ? result.tickets : [];
            setTickets(nextTickets);
            setTicketStatuses(Array.isArray(result?.statuses) ? result.statuses : []);
            setSelectedTicketId((previous) => {
                if (previous && nextTickets.some((ticket) => toIdString(ticket?._id) === previous)) {
                    return previous;
                }
                return toIdString(nextTickets[0]?._id);
            });
        } catch (error) {
            setTicketsError(normalizeErrorMessage(error, "Failed to load support tickets."));
            setTickets([]);
            setTicketStatuses([]);
            setSelectedTicketId("");
        } finally {
            if (!silent) setTicketsLoading(false);
        }
    }, [ticketStatusFilter]);

    const loadTicketDetail = useCallback(async (ticketId, { silent = false } = {}) => {
        if (!ticketId) {
            setTicketDetail(null);
            return;
        }

        if (!silent) setTicketDetailLoading(true);
        setTicketDetailError("");

        try {
            const result = await getSupportTicketById(ticketId);
            setTicketDetail(result || null);
        } catch (error) {
            setTicketDetailError(normalizeErrorMessage(error, "Failed to load ticket details."));
            setTicketDetail(null);
        } finally {
            if (!silent) setTicketDetailLoading(false);
        }
    }, []);

    const loadFeedback = useCallback(async ({ silent = false } = {}) => {
        if (!silent) setFeedbackLoading(true);
        setFeedbackError("");

        try {
            const result = await getMySupportFeedback({ limit: 10 });
            setFeedbackItems(Array.isArray(result?.feedback) ? result.feedback : []);
            setFeedbackSummary(result?.summary || { averageRating: 0, total: 0 });
        } catch (error) {
            setFeedbackError(normalizeErrorMessage(error, "Failed to load feedback history."));
            setFeedbackItems([]);
            setFeedbackSummary({ averageRating: 0, total: 0 });
        } finally {
            if (!silent) setFeedbackLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadArticles();
            loadFaqs();
        }, 260);

        return () => clearTimeout(timer);
    }, [loadArticles, loadFaqs]);

    useEffect(() => {
        if (!selectedArticleSlug) {
            setSelectedArticle(null);
            setRelatedArticles([]);
            setArticleDetailError("");
            return;
        }

        let disposed = false;
        const fetchArticle = async () => {
            setArticleDetailLoading(true);
            setArticleDetailError("");
            try {
                const result = await getSupportArticle(selectedArticleSlug);
                if (disposed) return;
                setSelectedArticle(result?.article || null);
                setRelatedArticles(Array.isArray(result?.related) ? result.related : []);
            } catch (error) {
                if (disposed) return;
                setSelectedArticle(null);
                setRelatedArticles([]);
                setArticleDetailError(normalizeErrorMessage(error, "Failed to load article."));
            } finally {
                if (!disposed) setArticleDetailLoading(false);
            }
        };

        fetchArticle();
        return () => {
            disposed = true;
        };
    }, [selectedArticleSlug]);

    useEffect(() => {
        loadTickets();
    }, [loadTickets]);

    useEffect(() => {
        loadFeedback();
    }, [loadFeedback]);

    useEffect(() => {
        if (!selectedTicketId) {
            setTicketDetail(null);
            setTicketDetailError("");
            return;
        }
        loadTicketDetail(selectedTicketId);
    }, [selectedTicketId, loadTicketDetail]);

    const refreshEverything = async () => {
        setRefreshing(true);
        try {
            const tasks = [
                loadArticles({ silent: true }),
                loadFaqs(),
                loadTickets({ silent: true }),
                loadFeedback({ silent: true })
            ];

            if (selectedArticleSlug) {
                tasks.push(
                    (async () => {
                        const result = await getSupportArticle(selectedArticleSlug);
                        setSelectedArticle(result?.article || null);
                        setRelatedArticles(Array.isArray(result?.related) ? result.related : []);
                    })()
                );
            }

            if (selectedTicketId) {
                tasks.push(loadTicketDetail(selectedTicketId, { silent: true }));
            }

            await Promise.allSettled(tasks);
        } finally {
            setRefreshing(false);
        }
    };

    const handleFileSelection = (event, target = "ticket") => {
        const incoming = Array.from(event.target.files || []);
        event.target.value = "";

        const unsupported = incoming.some(
            (file) => !String(file?.type || "").startsWith("image/")
        );
        if (unsupported) {
            toast.error("Only image files are allowed.");
            return;
        }

        const setFiles = target === "comment" ? setCommentFiles : setTicketFiles;
        setFiles((previous) => [...previous, ...incoming].slice(0, 5));
    };

    const handleCreateTicket = async (event) => {
        event.preventDefault();
        if (ticketSubmitting) return;

        try {
            setTicketSubmitting(true);
            const attachments = await uploadImageAttachments(ticketFiles);
            const createdTicket = await createSupportTicket({
                ...ticketForm,
                attachments
            });

            toast.success("Support ticket created.");
            setTicketForm({ ...INITIAL_TICKET_FORM });
            setTicketFiles([]);

            const createdId = toIdString(createdTicket?._id);
            await loadTickets({ silent: true });
            if (createdId) setSelectedTicketId(createdId);
        } catch (error) {
            toast.error(normalizeErrorMessage(error, "Could not create support ticket."));
        } finally {
            setTicketSubmitting(false);
        }
    };

    const handleAddComment = async (event) => {
        event.preventDefault();
        if (!selectedTicketId || commentSubmitting) return;

        try {
            setCommentSubmitting(true);
            const attachments = await uploadImageAttachments(commentFiles);

            await addSupportTicketComment(selectedTicketId, {
                body: commentBody,
                parentCommentId: commentReplyParentId || undefined,
                attachments
            });

            toast.success("Reply posted.");
            setCommentBody("");
            setCommentReplyParentId("");
            setCommentFiles([]);

            await Promise.all([
                loadTickets({ silent: true }),
                loadTicketDetail(selectedTicketId, { silent: true })
            ]);
        } catch (error) {
            toast.error(normalizeErrorMessage(error, "Could not post reply."));
        } finally {
            setCommentSubmitting(false);
        }
    };

    const handleSubmitContact = async (event) => {
        event.preventDefault();
        if (contactSubmitting) return;

        try {
            setContactSubmitting(true);
            const createdTicket = await submitContactSupport(contactForm);
            toast.success("Contact request sent. Ticket created.");

            setContactForm((previous) => ({
                ...previous,
                message: ""
            }));

            const createdId = toIdString(createdTicket?._id);
            await loadTickets({ silent: true });
            if (createdId) setSelectedTicketId(createdId);
        } catch (error) {
            toast.error(normalizeErrorMessage(error, "Could not submit contact request."));
        } finally {
            setContactSubmitting(false);
        }
    };

    const handleSubmitFeedback = async (event) => {
        event.preventDefault();
        if (feedbackSubmitting) return;

        try {
            setFeedbackSubmitting(true);
            await submitSupportFeedback(feedbackForm);
            toast.success("Feedback submitted.");

            setFeedbackForm({ ...INITIAL_FEEDBACK_FORM });
            await loadFeedback({ silent: true });
        } catch (error) {
            toast.error(normalizeErrorMessage(error, "Could not submit feedback."));
        } finally {
            setFeedbackSubmitting(false);
        }
    };

    const commentTree = useMemo(
        () => buildCommentTree(ticketDetail?.comments || []),
        [ticketDetail?.comments]
    );

    const replyingToComment = useMemo(() => {
        if (!commentReplyParentId) return null;
        const comments = Array.isArray(ticketDetail?.comments) ? ticketDetail.comments : [];
        return comments.find(
            (comment) => toIdString(comment?._id) === commentReplyParentId
        );
    }, [ticketDetail?.comments, commentReplyParentId]);

    const shouldShowBottomNav = isMobileViewport && Boolean(profileId);

    return {
        profileId,
        shouldShowBottomNav,
        refreshing,
        refreshEverything,
        helpCenterProps: {
            articleSearch,
            setArticleSearch,
            articleCategory,
            setArticleCategory,
            articleCategories,
            categoryOptions: CATEGORY_OPTIONS,
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
        },
        ticketsProps: {
            ticketForm,
            setTicketForm,
            ticketFiles,
            handleFileSelection,
            ticketSubmitting,
            handleCreateTicket,
            ticketStatusFilter,
            setTicketStatusFilter,
            ticketStatuses,
            ticketsLoading,
            ticketsError,
            tickets,
            selectedTicketId,
            setSelectedTicketId,
            ticketDetailLoading,
            ticketDetailError,
            ticketDetail,
            commentTree,
            setCommentReplyParentId,
            replyingToComment,
            commentBody,
            setCommentBody,
            commentFiles,
            commentSubmitting,
            handleAddComment
        },
        contactFeedbackProps: {
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
        }
    };
};

export default useHelpSupportController;
