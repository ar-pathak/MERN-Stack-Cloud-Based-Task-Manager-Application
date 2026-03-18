import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";

vi.mock("recharts", () => {
    const Wrapper = ({ children }) => <div>{children}</div>;

    return {
        ResponsiveContainer: Wrapper,
        PieChart: Wrapper,
        Pie: Wrapper,
        BarChart: Wrapper,
        Bar: Wrapper,
        LineChart: Wrapper,
        Line: Wrapper,
        AreaChart: Wrapper,
        Area: Wrapper,
        CartesianGrid: Wrapper,
        XAxis: Wrapper,
        YAxis: Wrapper,
        Cell: Wrapper,
        Tooltip: ({ content }) => <div>{content}</div>,
    };
});

import AudienceInsightsSection from "../../../../../../features/main/features/dashboard/components/AudienceInsightsSection.jsx";
import GrowthStatsSection from "../../../../../../features/main/features/dashboard/components/GrowthStatsSection.jsx";
import PostAnalyticsSection from "../../../../../../features/main/features/dashboard/components/PostAnalyticsSection.jsx";
import PostManagementSection from "../../../../../../features/main/features/dashboard/components/PostManagementSection.jsx";

test("AudienceInsightsSection renders empty states when datasets are missing", () => {
    render(<AudienceInsightsSection countryRows={[]} hourlyRows={[]} userMix={{}} />);

    expect(screen.getByText("Audience Insights")).toBeInTheDocument();
    expect(screen.getByText("No country data.")).toBeInTheDocument();
    expect(screen.getByText("No active-time data.")).toBeInTheDocument();
    expect(screen.getByText("No user mix data.")).toBeInTheDocument();
    expect(screen.getByText("N/A")).toBeInTheDocument();
});

test("AudienceInsightsSection renders populated labels and user mix summary", () => {
    render(
        <AudienceInsightsSection
            countryRows={[{ country: "IN", value: 20 }]}
            hourlyRows={[{ label: "09:00", averageEngagement: 12 }]}
            userMix={{ newUsers: 1200, returningUsers: 345 }}
            bestPostingHour={{ label: "09:00 - 10:00" }}
        />
    );

    expect(screen.getByText("09:00 - 10:00")).toBeInTheDocument();
    expect(
        screen.getByText("New: 1,200 - Returning: 345")
    ).toBeInTheDocument();
    expect(screen.queryByText("No user mix data.")).not.toBeInTheDocument();
});

test("GrowthStatsSection renders table values and chart empty states", () => {
    render(
        <GrowthStatsSection
            growthRows={[
                {
                    label: "Followers",
                    today: 3,
                    sevenDays: 24,
                    thirtyDays: 150,
                },
            ]}
            followerGrowth={[]}
            likesCommentsTrend={[]}
            topPerforming={[]}
        />
    );

    expect(screen.getByText("Growth Stats")).toBeInTheDocument();
    expect(screen.getByText("Followers")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("No follower growth data.")).toBeInTheDocument();
    expect(
        screen.getByText("No likes/comments trend data.")
    ).toBeInTheDocument();
    expect(screen.getByText("No top-performing posts.")).toBeInTheDocument();
});

test("PostAnalyticsSection supports filters and row actions", () => {
    const onStatusFilterChange = vi.fn();
    const onDateFilterChange = vi.fn();
    const onSortChange = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
        <PostAnalyticsSection
            posts={[
                {
                    _id: "post-1",
                    contentPreview: "Launch update",
                    createdAt: "2026-03-16T10:00:00.000Z",
                    views: 100,
                    likes: 20,
                    comments: 4,
                    shares: 2,
                    saves: 5,
                    engagementRate: 13.5,
                },
            ]}
            sortBy="date_desc"
            statusFilter="all"
            dateFilter="all"
            onStatusFilterChange={onStatusFilterChange}
            onDateFilterChange={onDateFilterChange}
            onSortChange={onSortChange}
            onEdit={onEdit}
            onDelete={onDelete}
        />
    );

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "active" } });
    fireEvent.change(selects[1], { target: { value: "last7" } });
    fireEvent.change(selects[2], { target: { value: "likes_desc" } });

    expect(onStatusFilterChange).toHaveBeenCalledWith("active");
    expect(onDateFilterChange).toHaveBeenCalledWith("last7");
    expect(onSortChange).toHaveBeenCalledWith("likes_desc");

    expect(screen.getByText("Launch update")).toBeInTheDocument();
    expect(screen.getByText("13.50%")).toBeInTheDocument();

    const row = screen.getByText("Launch update").closest("tr");
    expect(row).not.toBeNull();
    const rowButtons = within(row).getAllByRole("button");
    fireEvent.click(rowButtons[0]);
    fireEvent.click(rowButtons[1]);

    expect(onEdit).toHaveBeenCalledWith(
        expect.objectContaining({ _id: "post-1" })
    );
    expect(onDelete).toHaveBeenCalledWith("post-1");
});

test("PostAnalyticsSection shows empty and busy states", () => {
    const { container } = render(
        <PostAnalyticsSection
            posts={[
                {
                    _id: "post-1",
                    contentPreview: "Busy post",
                    createdAt: "2026-03-16T10:00:00.000Z",
                },
            ]}
            busyPostId="post-1"
            onStatusFilterChange={() => {}}
            onDateFilterChange={() => {}}
            onSortChange={() => {}}
            onEdit={() => {}}
            onDelete={() => {}}
        />
    );

    const row = screen.getByText("Busy post").closest("tr");
    expect(row).not.toBeNull();
    const deleteButton = within(row).getAllByRole("button")[1];
    expect(deleteButton).toBeDisabled();
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();

    render(
        <PostAnalyticsSection
            posts={[]}
            onStatusFilterChange={() => {}}
            onDateFilterChange={() => {}}
            onSortChange={() => {}}
            onEdit={() => {}}
            onDelete={() => {}}
        />
    );
    expect(screen.getByText("No posts found.")).toBeInTheDocument();
});

test("PostManagementSection updates composer state, handles actions, and renders draft lists", () => {
    const composerState = {
        mode: "create",
        visibility: "public",
        publishMode: "now",
        scheduledFor: "",
        content: "",
    };

    const setComposer = vi.fn((updater) => {
        const next = typeof updater === "function" ? updater(composerState) : updater;
        Object.assign(composerState, next);
    });

    const onSubmit = vi.fn();
    const onSaveDraft = vi.fn();
    const onResetComposer = vi.fn();
    const onLoadDraft = vi.fn();
    const onRemoveDraft = vi.fn();

    render(
        <PostManagementSection
            composer={composerState}
            setComposer={setComposer}
            composerError="Composer invalid"
            saving={false}
            scheduledPosts={[
                {
                    _id: "scheduled-1",
                    contentPreview: "Scheduled teaser",
                    scheduledFor: "2026-03-20T10:00:00.000Z",
                },
            ]}
            drafts={[
                {
                    id: "draft-1",
                    content: "Draft content",
                    updatedAt: "2026-03-16T10:00:00.000Z",
                },
            ]}
            onSubmit={onSubmit}
            onSaveDraft={onSaveDraft}
            onResetComposer={onResetComposer}
            onLoadDraft={onLoadDraft}
            onRemoveDraft={onRemoveDraft}
        />
    );

    fireEvent.change(screen.getAllByRole("combobox")[0], {
        target: { value: "private" },
    });
    expect(composerState.visibility).toBe("private");

    fireEvent.change(screen.getAllByRole("combobox")[1], {
        target: { value: "schedule" },
    });
    expect(composerState.publishMode).toBe("schedule");

    fireEvent.change(screen.getByPlaceholderText("Write post content..."), {
        target: { value: "Ready for launch" },
    });
    expect(composerState.content).toBe("Ready for launch");

    fireEvent.click(screen.getByRole("button", { name: /create post/i }));
    fireEvent.click(screen.getByRole("button", { name: /save as draft/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSaveDraft).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Load" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onLoadDraft).toHaveBeenCalledWith(
        expect.objectContaining({ id: "draft-1" })
    );
    expect(onRemoveDraft).toHaveBeenCalledWith("draft-1");

    expect(screen.getByText("Composer invalid")).toBeInTheDocument();
    expect(screen.getByText("Scheduled teaser")).toBeInTheDocument();
    expect(screen.getByText("Draft content")).toBeInTheDocument();
    expect(screen.getByText(/\/ 5,000 characters/i)).toBeInTheDocument();
});

test("PostManagementSection shows edit and empty fallbacks", () => {
    render(
        <PostManagementSection
            composer={{
                mode: "edit",
                visibility: "public",
                publishMode: "schedule",
                scheduledFor: "2026-03-17T10:00",
                content: "Edit copy",
            }}
            setComposer={() => {}}
            saving
            scheduledPosts={[]}
            drafts={[]}
            onSubmit={() => {}}
            onSaveDraft={() => {}}
            onResetComposer={() => {}}
            onLoadDraft={() => {}}
            onRemoveDraft={() => {}}
        />
    );

    expect(screen.getByText("Edit Post")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /update post/i })).toBeDisabled();
    expect(screen.getByText("No scheduled posts.")).toBeInTheDocument();
    expect(screen.getByText("No drafts saved.")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("2026-03-17T10:00")).not.toBeInTheDocument();
});

