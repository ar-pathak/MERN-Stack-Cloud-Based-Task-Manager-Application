import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CoreMetricsSection from "../../../../../../features/main/features/dashboard/components/CoreMetricsSection";
import DashboardChartTooltip from "../../../../../../features/main/features/dashboard/components/DashboardChartTooltip";
import DashboardEmptyState from "../../../../../../features/main/features/dashboard/components/DashboardEmptyState";
import DashboardHeader from "../../../../../../features/main/features/dashboard/components/DashboardHeader";
import RealtimeInteractionsSection from "../../../../../../features/main/features/dashboard/components/RealtimeInteractionsSection";

describe("dashboard primitives", () => {
  it("renders the dashboard empty state message", () => {
    render(<DashboardEmptyState message="Nothing here yet" />);
    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
  });

  it("returns null tooltip output when inactive or empty", () => {
    const inactive = render(<DashboardChartTooltip active={false} payload={[]} label="A" />);
    expect(inactive.container).toBeEmptyDOMElement();

    const emptyRows = render(
      <DashboardChartTooltip
        active
        payload={[{ name: "Likes", value: null, payload: { day: "Mon" } }]}
      />,
    );
    expect(emptyRows.container).toBeEmptyDOMElement();
  });

  it("renders tooltip rows with preferred day labels and formatted values", () => {
    render(
      <DashboardChartTooltip
        active
        label="Ignored"
        payload={[
          {
            name: "Likes",
            dataKey: "likes",
            color: "#38bdf8",
            value: 1234,
            payload: { day: "Monday" },
          },
          {
            name: "Comments",
            dataKey: "comments",
            color: "#f59e0b",
            value: "56",
            payload: { day: "Monday" },
          },
        ]}
      />,
    );

    expect(screen.getByText("Monday")).toBeInTheDocument();
    expect(screen.getByText("Likes")).toBeInTheDocument();
    expect(screen.getByText("1,234")).toBeInTheDocument();
    expect(screen.getByText("56")).toBeInTheDocument();
  });

  it("falls back to the explicit label when the payload day is blank", () => {
    render(
      <DashboardChartTooltip
        active
        label="Tuesday summary"
        payload={[
          {
            name: "Value",
            dataKey: "value",
            value: "abc",
            payload: { day: "   " },
          },
        ]}
      />,
    );

    expect(screen.getByText("Tuesday summary")).toBeInTheDocument();
    expect(screen.getByText("Value")).toBeInTheDocument();
    expect(screen.getByText("abc")).toBeInTheDocument();
  });

  it("falls back to other tooltip labels and placeholder values", () => {
    render(
      <DashboardChartTooltip
        active
        payload={[
          {
            dataKey: "shares",
            value: undefined,
            payload: { label: "Top shares" },
          },
          {
            dataKey: "shares",
            value: "abc",
            payload: { label: "Top shares" },
          },
        ]}
      />,
    );

    expect(screen.getByText("Top shares")).toBeInTheDocument();
    expect(screen.getByText("shares")).toBeInTheDocument();
    expect(screen.getByText("abc")).toBeInTheDocument();
  });

  it("renders dashboard header controls and callbacks", () => {
    const onBack = vi.fn();
    const onRefresh = vi.fn();
    const onDaysChange = vi.fn();

    render(
      <DashboardHeader
        days={14}
        generatedAt="2026-01-15T09:30:00.000Z"
        onBack={onBack}
        onRefresh={onRefresh}
        onDaysChange={onDaysChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Back/i }));
    fireEvent.click(screen.getByRole("button", { name: /Refresh/i }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "7" } });

    expect(screen.getByText("Advanced Dashboard")).toBeInTheDocument();
    expect(screen.getAllByText(/Last 14 days/i).length).toBeGreaterThan(0);
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onDaysChange).toHaveBeenCalledWith(7);
  });

  it("disables dashboard refresh while loading and omits the back button when absent", () => {
    render(
      <DashboardHeader
        days={30}
        generatedAt=""
        onDaysChange={() => {}}
        onRefresh={() => {}}
        loading
        refreshing
      />,
    );

    expect(screen.queryByRole("button", { name: /Back/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Refresh/i })).toBeDisabled();
  });

  it("renders formatted core metrics with zero fallbacks", () => {
    render(
      <CoreMetricsSection
        totals={{ posts: 12, followers: 9800, following: 32, comments: 4 }}
      />,
    );

    expect(screen.getByText("Core Metrics")).toBeInTheDocument();
    expect(screen.getByText("9,800")).toBeInTheDocument();
    expect(screen.getByText("32")).toBeInTheDocument();
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
  });

  it("renders the realtime waiting state when there are no interactions", () => {
    render(<RealtimeInteractionsSection interactions={[]} />);

    expect(screen.getByText("Real-time Updates")).toBeInTheDocument();
    expect(screen.getByText("Waiting for live post interactions...")).toBeInTheDocument();
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("renders known and fallback realtime interaction metadata", () => {
    render(
      <RealtimeInteractionsSection
        interactions={[
          {
            id: "1",
            kind: "post_like",
            message: "Alice liked your update",
            createdAt: "2026-01-01T10:00:00.000Z",
          },
          {
            id: "2",
            kind: "unknown",
            message: "Something happened",
            createdAt: "2026-01-01T11:00:00.000Z",
          },
        ]}
      />,
    );

    expect(screen.getByText("Alice liked your update")).toBeInTheDocument();
    expect(screen.getByText(/Like -/)).toBeInTheDocument();
    expect(screen.getByText("Something happened")).toBeInTheDocument();
    expect(screen.getByText(/Interaction -/)).toBeInTheDocument();
  });
});