import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import FeedEmptyState from "../../../../../../features/main/features/feed/components/FeedEmptyState";
import FeedSidebar from "../../../../../../features/main/features/feed/components/FeedSidebar";
import FeedSkeletonList from "../../../../../../features/main/features/feed/components/FeedSkeletonList";
import FeedToast from "../../../../../../features/main/features/feed/components/FeedToast";
import FeedTopBar from "../../../../../../features/main/features/feed/components/FeedTopBar";

describe("feed primitives", () => {
  it("renders bookmark-specific empty state copy", () => {
    render(<FeedEmptyState activeTab="bookmarks" hasSearch />);

    expect(screen.getByText("No saved posts yet")).toBeInTheDocument();
    expect(screen.getByText("Try a different search term.")).toBeInTheDocument();
  });

  it("renders the default feed empty state copy", () => {
    render(<FeedEmptyState activeTab="following" hasSearch={false} />);

    expect(screen.getByText("No posts found")).toBeInTheDocument();
    expect(
      screen.getByText("Create a post or follow more people to grow your feed."),
    ).toBeInTheDocument();
  });

  it("calls the top bar actions", () => {
    const onCreate = vi.fn();
    const onRefresh = vi.fn();

    render(<FeedTopBar onCreate={onCreate} onRefresh={onRefresh} />);

    fireEvent.click(screen.getByRole("button", { name: /Create/i }));
    fireEvent.click(screen.getByRole("button", { name: /Refresh/i }));

    expect(screen.getByText("Social Stream")).toBeInTheDocument();
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("renders the feed sidebar fallback when there are no hashtags", () => {
    render(<FeedSidebar topHashtags={[]} onPickTag={() => {}} />);

    expect(
      screen.getByText("Create posts with hashtags to see trends."),
    ).toBeInTheDocument();
  });

  it("renders hashtag buttons and handles hashtag selection", () => {
    const onPickTag = vi.fn();

    render(
      <FeedSidebar
        topHashtags={[
          ["react", 8],
          ["mern", 3],
        ]}
        onPickTag={onPickTag}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "#react - 8" }));
    fireEvent.click(screen.getByRole("button", { name: "#mern - 3" }));

    expect(onPickTag).toHaveBeenNthCalledWith(1, "react");
    expect(onPickTag).toHaveBeenNthCalledWith(2, "mern");
  });

  it("renders nothing when there is no toast", () => {
    const { container } = render(<FeedToast toast={null} mobile={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders success toast styling for mobile layouts", () => {
    render(<FeedToast toast={{ kind: "success", message: "Saved" }} mobile />);

    const toast = screen.getByText("Saved");
    expect(toast).toHaveClass("bg-emerald-500/90");
    expect(toast).toHaveClass("bottom-24");
    expect(toast).toHaveClass("left-5");
  });

  it("renders error toast styling for desktop layouts", () => {
    render(<FeedToast toast={{ kind: "error", message: "Failed" }} mobile={false} />);

    const toast = screen.getByText("Failed");
    expect(toast).toHaveClass("bg-rose-500/90");
    expect(toast).toHaveClass("bottom-5");
  });

  it("renders three feed skeleton cards", () => {
    const { container } = render(<FeedSkeletonList />);

    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(3);
  });
});


