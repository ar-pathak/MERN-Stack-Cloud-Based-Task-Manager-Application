import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Loader2 } from "lucide-react";

import { useAuth } from "../../../../../context/AuthContext";
import MobileBottomNav from "../../../components/navigation/MobileBottomNav";
import AudienceInsightsSection from "../components/AudienceInsightsSection";
import CoreMetricsSection from "../components/CoreMetricsSection";
import DashboardHeader from "../components/DashboardHeader";
import GrowthStatsSection from "../components/GrowthStatsSection";
import PostAnalyticsSection from "../components/PostAnalyticsSection";
import PostManagementSection from "../components/PostManagementSection";
import { MOBILE_BREAKPOINT } from "../constants/dashboard.constants";
import useAdvancedDashboard from "../hooks/useAdvancedDashboard";

const AdvancedDashboardPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const profileId = user?._id || user?.id || "";
    const mobileQuery = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;
    const [mobile, setMobile] = useState(() =>
        typeof window !== "undefined" ? window.matchMedia(mobileQuery).matches : false
    );

    const {
        days,
        loading,
        refreshing,
        error,
        generatedAt,
        totals,
        growthRows,
        followerGrowth,
        likesCommentsTrend,
        topPerforming,
        posts,
        sortBy,
        statusFilter,
        dateFilter,
        busyPostId,
        countryRows,
        hourlyRows,
        userMix,
        bestPostingHour,
        scheduledPosts,
        drafts,
        composer,
        saving,
        composerError,
        setDays,
        refresh,
        setSortBy,
        setStatusFilter,
        setDateFilter,
        setComposer,
        handleEdit,
        submitComposer,
        deleteOnePost,
        resetComposer,
        saveDraft,
        loadDraft,
        removeDraft
    } = useAdvancedDashboard({ profileId });

    useEffect(() => {
        if (typeof window === "undefined") return undefined;

        const mediaQuery = window.matchMedia(mobileQuery);
        const handleChange = (event) => setMobile(event.matches);

        setMobile(mediaQuery.matches);
        mediaQuery.addEventListener("change", handleChange);

        return () => mediaQuery.removeEventListener("change", handleChange);
    }, [mobileQuery]);

    const showBottom = mobile && Boolean(profileId);

    const handleBack = () => {
        if (typeof window !== "undefined" && window.history.length > 1) {
            navigate(-1);
            return;
        }
        navigate("/main");
    };

    return (
        <div className={`min-h-full bg-slate-950 ${showBottom ? "pb-[5.25rem]" : "pb-8"}`}>
            <div className="mx-auto w-full max-w-7xl px-3 pt-3 sm:px-4 sm:pt-4">
                <DashboardHeader
                    days={days}
                    generatedAt={generatedAt}
                    loading={loading}
                    refreshing={refreshing}
                    onDaysChange={setDays}
                    onRefresh={refresh}
                    onBack={handleBack}
                />

                {error ? (
                    <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                        {error}
                    </div>
                ) : null}

                {loading ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-12 text-center text-slate-400">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-sky-400" />
                        Loading...
                    </div>
                ) : null}

                {!loading && !error ? (
                    <>
                        <CoreMetricsSection totals={totals} />
                        <GrowthStatsSection
                            growthRows={growthRows}
                            followerGrowth={followerGrowth}
                            likesCommentsTrend={likesCommentsTrend}
                            topPerforming={topPerforming}
                        />
                        <PostAnalyticsSection
                            posts={posts}
                            sortBy={sortBy}
                            statusFilter={statusFilter}
                            dateFilter={dateFilter}
                            busyPostId={busyPostId}
                            onSortChange={setSortBy}
                            onStatusFilterChange={setStatusFilter}
                            onDateFilterChange={setDateFilter}
                            onEdit={handleEdit}
                            onDelete={deleteOnePost}
                        />
                        <AudienceInsightsSection
                            countryRows={countryRows}
                            hourlyRows={hourlyRows}
                            userMix={userMix}
                            bestPostingHour={bestPostingHour}
                        />
                        <PostManagementSection
                            composer={composer}
                            setComposer={setComposer}
                            composerError={composerError}
                            saving={saving}
                            scheduledPosts={scheduledPosts}
                            drafts={drafts}
                            onSubmit={submitComposer}
                            onSaveDraft={saveDraft}
                            onResetComposer={resetComposer}
                            onLoadDraft={loadDraft}
                            onRemoveDraft={removeDraft}
                        />
                    </>
                ) : null}
            </div>

            {showBottom ? <MobileBottomNav activeTab="dashboard" profileId={profileId} /> : null}
        </div>
    );
};

export default AdvancedDashboardPage;
