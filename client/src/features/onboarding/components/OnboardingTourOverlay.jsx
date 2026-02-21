import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const EDGE_PADDING = 12;
const HIGHLIGHT_PADDING = 8;
const TOOLTIP_GAP = 16;
const APPROX_TOOLTIP_HEIGHT = 272;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const readViewport = () => {
  if (typeof window === "undefined") {
    return { width: 1280, height: 720 };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

const getHighlightRect = (node) => {
  if (!node) return null;

  const rect = node.getBoundingClientRect();
  if (!rect.width && !rect.height) return null;

  const viewport = readViewport();
  const maxWidth = Math.max(viewport.width - EDGE_PADDING * 2, 0);
  const maxHeight = Math.max(viewport.height - EDGE_PADDING * 2, 0);

  const width = clamp(rect.width + HIGHLIGHT_PADDING * 2, 0, maxWidth);
  const height = clamp(rect.height + HIGHLIGHT_PADDING * 2, 0, maxHeight);
  const maxLeft = Math.max(viewport.width - width - EDGE_PADDING, EDGE_PADDING);
  const maxTop = Math.max(viewport.height - height - EDGE_PADDING, EDGE_PADDING);
  const left = clamp(rect.left - HIGHLIGHT_PADDING, EDGE_PADDING, maxLeft);
  const top = clamp(rect.top - HIGHLIGHT_PADDING, EDGE_PADDING, maxTop);

  return { top, left, width, height };
};

const getPlacementOrder = (preferred = "auto") => {
  if (preferred === "top") return ["top", "bottom", "right", "left"];
  if (preferred === "right") return ["right", "bottom", "top", "left"];
  if (preferred === "left") return ["left", "bottom", "top", "right"];
  if (preferred === "bottom") return ["bottom", "top", "right", "left"];
  return ["bottom", "top", "right", "left"];
};

const getTooltipPosition = ({ rect, viewport, panelWidth, placement }) => {
  if (!rect) {
    return {
      centered: true,
      top: viewport.height / 2,
      left: viewport.width / 2,
      width: panelWidth,
    };
  }

  const fits = {
    top: rect.top - TOOLTIP_GAP >= APPROX_TOOLTIP_HEIGHT,
    bottom: viewport.height - (rect.top + rect.height) - TOOLTIP_GAP >= APPROX_TOOLTIP_HEIGHT,
    right: viewport.width - (rect.left + rect.width) - TOOLTIP_GAP >= panelWidth,
    left: rect.left - TOOLTIP_GAP >= panelWidth,
  };

  const order = getPlacementOrder(placement);
  const chosen = order.find((side) => fits[side]) || "bottom";

  const maxLeft = Math.max(viewport.width - panelWidth - EDGE_PADDING, EDGE_PADDING);
  const maxTop = Math.max(viewport.height - APPROX_TOOLTIP_HEIGHT - EDGE_PADDING, EDGE_PADDING);
  const safeCenteredLeft = clamp(
    rect.left + rect.width / 2 - panelWidth / 2,
    EDGE_PADDING,
    maxLeft
  );

  if (chosen === "top") {
    return {
      centered: false,
      top: clamp(rect.top - APPROX_TOOLTIP_HEIGHT - TOOLTIP_GAP, EDGE_PADDING, maxTop),
      left: safeCenteredLeft,
      width: panelWidth,
    };
  }

  if (chosen === "right") {
    return {
      centered: false,
      top: clamp(
        rect.top + rect.height / 2 - APPROX_TOOLTIP_HEIGHT / 2,
        EDGE_PADDING,
        maxTop
      ),
      left: clamp(rect.left + rect.width + TOOLTIP_GAP, EDGE_PADDING, maxLeft),
      width: panelWidth,
    };
  }

  if (chosen === "left") {
    return {
      centered: false,
      top: clamp(
        rect.top + rect.height / 2 - APPROX_TOOLTIP_HEIGHT / 2,
        EDGE_PADDING,
        maxTop
      ),
      left: clamp(rect.left - panelWidth - TOOLTIP_GAP, EDGE_PADDING, maxLeft),
      width: panelWidth,
    };
  }

  return {
    centered: false,
    top: clamp(rect.top + rect.height + TOOLTIP_GAP, EDGE_PADDING, maxTop),
    left: safeCenteredLeft,
    width: panelWidth,
  };
};

const OnboardingTourOverlay = ({
  isOpen,
  step,
  stepIndex = 0,
  totalSteps = 0,
  onNext,
  onPrevious,
  onSkip,
}) => {
  const [targetNode, setTargetNode] = useState(null);
  const [highlightRect, setHighlightRect] = useState(null);
  const [viewport, setViewport] = useState(readViewport);

  useEffect(() => {
    if (!isOpen || !step) return undefined;

    const onResize = () => {
      setViewport(readViewport());
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isOpen, step]);

  useEffect(() => {
    if (!isOpen || !step) return undefined;

    let cancelled = false;
    let timeoutId = null;
    let attempts = 0;
    const maxAttempts = 36;

    const findTarget = () => {
      if (cancelled) return;

      const nextTarget = step.selector ? document.querySelector(step.selector) : null;
      if (nextTarget) {
        setTargetNode(nextTarget);
        nextTarget.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
        setHighlightRect(getHighlightRect(nextTarget));
        return;
      }

      attempts += 1;
      if (attempts < maxAttempts) {
        timeoutId = window.setTimeout(findTarget, 140);
      } else {
        setTargetNode(null);
        setHighlightRect(null);
      }
    };

    setTargetNode(null);
    setHighlightRect(null);
    findTarget();

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [isOpen, step]);

  useEffect(() => {
    if (!isOpen || !targetNode) return undefined;

    const refreshRect = () => {
      setHighlightRect(getHighlightRect(targetNode));
    };

    refreshRect();

    window.addEventListener("resize", refreshRect);
    window.addEventListener("scroll", refreshRect, true);

    return () => {
      window.removeEventListener("resize", refreshRect);
      window.removeEventListener("scroll", refreshRect, true);
    };
  }, [isOpen, targetNode, stepIndex]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onSkip?.();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        onNext?.();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onPrevious?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onNext, onPrevious, onSkip]);

  const panelWidth = useMemo(() => clamp(Math.min(360, viewport.width - 24), 260, 360), [viewport.width]);

  const tooltipPosition = useMemo(
    () =>
      getTooltipPosition({
        rect: highlightRect,
        viewport,
        panelWidth,
        placement: step?.placement,
      }),
    [highlightRect, panelWidth, step?.placement, viewport]
  );

  const progressPercent = totalSteps > 0 ? ((stepIndex + 1) / totalSteps) * 100 : 0;
  const isLastStep = totalSteps > 0 && stepIndex >= totalSteps - 1;

  return (
    <AnimatePresence>
      {isOpen && step ? (
        <motion.div
          className="fixed inset-0 z-[1200]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          aria-live="polite"
        >
          <motion.div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-[1px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {highlightRect && (
            <motion.div
              key={step.id}
              className="pointer-events-none absolute rounded-2xl border border-sky-300/90 shadow-[0_0_0_9999px_rgba(2,6,23,0.6),0_0_24px_rgba(56,189,248,0.35)]"
              initial={{ opacity: 0.7 }}
              animate={{
                opacity: 1,
                top: highlightRect.top,
                left: highlightRect.left,
                width: highlightRect.width,
                height: highlightRect.height,
              }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            />
          )}

          <motion.div
            className="absolute rounded-2xl border border-slate-700/70 bg-slate-900/95 p-4 text-slate-100 shadow-2xl shadow-black/50 backdrop-blur-xl"
            style={{
              width: tooltipPosition.width,
              top: tooltipPosition.top,
              left: tooltipPosition.left,
              transform: tooltipPosition.centered ? "translate(-50%, -50%)" : "translate(0, 0)",
            }}
            key={step.id}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            aria-label="Onboarding tour"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-300">
                Step {Math.min(stepIndex + 1, Math.max(totalSteps, 1))} of {Math.max(totalSteps, 1)}
              </p>
              <button
                type="button"
                onClick={onSkip}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2 py-1 text-xs font-medium text-slate-300 hover:border-slate-600 hover:bg-slate-800/70"
              >
                <X className="h-3.5 w-3.5" />
                Skip
              </button>
            </div>

            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-300"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              />
            </div>

            <h3 className="text-base font-semibold text-slate-100">{step.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{step.description}</p>

            {step.selector && !highlightRect && (
              <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-200">
                Looking for this section. It may appear after the page finishes loading.
              </p>
            )}

            <div className="mt-5 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onPrevious}
                disabled={stepIndex === 0}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 hover:border-slate-600 hover:bg-slate-800/80 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <button
                type="button"
                onClick={onNext}
                className="inline-flex items-center gap-1 rounded-lg border border-sky-400/30 bg-sky-500/20 px-3 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-500/30"
              >
                {isLastStep ? "Finish Tour" : "Next"}
                {!isLastStep && <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default OnboardingTourOverlay;
