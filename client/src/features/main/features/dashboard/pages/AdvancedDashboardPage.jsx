import { useEffect, useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router";
import { Loader2 } from "lucide-react";

import { useAuth } from "../../../../../context/AuthContext";
import MobileBottomNav from "../../../components/navigation/MobileBottomNav";

// Lazy-load dashboard section components (loaded progressively as user scrolls)
const CoreMetricsSection = lazy(() => import("../components/CoreMetricsSection"));
const GrowthStatsSection = lazy(() => import("../components/GrowthStatsSection"));
const PostAnalyticsSection = lazy(() => import("../components/PostAnalyticsSection"));
const AudienceInsightsSection = lazy(() => import("../components/AudienceInsightsSection"));
const PostManagementSection = lazy(() => import("../components/PostManagementSection"));

import DashboardHeader from "../components/DashboardHeader";
import { MOBILE_BREAKPOINT } from "../constants/dashboard.constants";
import useAdvancedDashboard from "../hooks/useAdvancedDashboard";

// Skeleton loaders for lazy-loaded sections
const CoreMetricsSkeleton = () => (
  <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
    <div className="h-6 w-32 bg-slate-800 rounded animate-pulse" />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 bg-slate-800 rounded animate-pulse" />
      ))}
    </div>
  </div>
);

const GrowthStatsSkeleton = () => (
  <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
    <div className="h-6 w-32 bg-slate-800 rounded animate-pulse" />
    <div className="h-64 bg-slate-800 rounded animate-pulse" />
  </div>
);

const PostAnalyticsSkeleton = () => (
  <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
    <div className="h-6 w-32 bg-slate-800 rounded animate-pulse" />
    <div className="h-10 bg-slate-800 rounded animate-pulse mb-2" />
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="h-12 bg-slate-800 rounded animate-pulse mb-2" />
    ))}
  </div>
);

const AudienceInsightsSkeleton = () => (
  <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
    <div className="h-6 w-32 bg-slate-800 rounded animate-pulse" />
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="h-64 bg-slate-800 rounded animate-pulse" />
      <div className="h-64 bg-slate-800 rounded animate-pulse" />
    </div>
  </div>
);

const PostManagementSkeleton = () => (
  <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
    <div className="h-6 w-32 bg-slate-800 rounded animate-pulse" />
    <div className="h-32 bg-slate-800 rounded animate-pulse" />
  </div>
);

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
                        <Suspense fallback={<CoreMetricsSkeleton />}>
                            <CoreMetricsSection totals={totals} />
                        </Suspense>
                        
                        <Suspense fallback={<GrowthStatsSkeleton />}>
                            <GrowthStatsSection
                                growthRows={growthRows}
                                followerGrowth={followerGrowth}
                                likesCommentsTrend={likesCommentsTrend}
                                topPerforming={topPerforming}
                            />
                        </Suspense>
                        
                        <Suspense fallback={<PostAnalyticsSkeleton />}>
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
                        </Suspense>
                        
                        <Suspense fallback={<AudienceInsightsSkeleton />}>
                            <AudienceInsightsSection
                                countryRows={countryRows}
                                hourlyRows={hourlyRows}
                                userMix={userMix}
                                bestPostingHour={bestPostingHour}
                            />
                        </Suspense>
                        
                        <Suspense fallback={<PostManagementSkeleton />}>
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
                        </Suspense>
                    </>
                ) : null}
            </div>

            {showBottom ? <MobileBottomNav activeTab="dashboard" profileId={profileId} /> : null}
        </div>
    );
};

export default AdvancedDashboardPage;
