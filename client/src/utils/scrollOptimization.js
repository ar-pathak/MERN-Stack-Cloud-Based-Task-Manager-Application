/**
 * Scroll Optimization Utilities
 * Provides performance-optimized scroll handling with passive listeners and debouncing
 */

import React from "react";

/**
 * Add passive scroll listener for better performance
 * Passive listeners don't block scrolling performance
 */
export const addPassiveScrollListener = (element, callback, options = {}) => {
  if (!element) return null;

  const wrappedCallback = (e) => {
    callback(e);
  };

  // Use passive listener where supported
  const listenerOptions = {
    passive: true,
    capture: false,
    ...options,
  };

  try {
    element.addEventListener("scroll", wrappedCallback, listenerOptions);
  } catch (err) {
    // Fallback for browsers that don't support passive listeners
    element.addEventListener("scroll", wrappedCallback, false);
  }

  // Return cleanup function
  return () => {
    try {
      element.removeEventListener("scroll", wrappedCallback, listenerOptions);
    } catch (err) {
      element.removeEventListener("scroll", wrappedCallback, false);
    }
  };
};

/**
 * Debounced scroll handler to reduce unnecessary re-renders
 * Useful for expensive scroll operations
 */
export const createDebouncedScrollHandler = (callback, delay = 150) => {
  let timeoutId;
  let lastScrollTime = 0;

  return (event) => {
    const now = Date.now();

    // Allow immediate call if enough time has passed
    if (now - lastScrollTime > delay) {
      lastScrollTime = now;
      callback(event);
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        lastScrollTime = Date.now();
        callback(event);
      }, delay);
    }
  };
};

/**
 * Smooth scroll to element with fallback
 * Uses native scrollIntoView when available, falls back to custom scroll
 */
export const smoothScrollToElement = (element, options = {}) => {
  if (!element) return;

  const defaultOptions = {
    behavior: "smooth",
    block: "nearest",
    inline: "nearest",
    ...options,
  };

  // Use native scrollIntoView if available
  if ("scrollIntoView" in element) {
    element.scrollIntoView(defaultOptions);
  } else {
    // Fallback for older browsers
    element.scrollIntoView();
  }
};

/**
 * Smooth scroll to specific position in a container
 * Useful for jumping to specific content
 */
export const smoothScrollTo = (element, target, duration = 300) => {
  if (!element || !target) return;

  const startPosition = element.scrollTop;
  const targetPosition = target;
  const distance = targetPosition - startPosition;
  let startTime = null;

  const easeInOutQuad = (t) => {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  };

  const scroll = (currentTime) => {
    if (startTime === null) startTime = currentTime;
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = easeInOutQuad(progress);

    element.scrollTop = startPosition + distance * ease;

    if (progress < 1) {
      requestAnimationFrame(scroll);
    }
  };

  requestAnimationFrame(scroll);
};

/**
 * Detect if user is at bottom of scroll container
 * Threshold in pixels (default: 120px)
 */
export const isNearBottom = (element, threshold = 120) => {
  if (!element) return true;
  return (
    element.scrollHeight - element.scrollTop - element.clientHeight <
    threshold
  );
};

/**
 * Detect if user is at top of scroll container
 */
export const isNearTop = (element, threshold = 120) => {
  if (!element) return true;
  return element.scrollTop < threshold;
};

/**
 * Throttle scroll handler for continuous scroll operations
 * More aggressive than debounce - executes at intervals
 */
export const createThrottledScrollHandler = (callback, delay = 100) => {
  let lastExecuted = 0;

  return (event) => {
    const now = Date.now();
    if (now - lastExecuted >= delay) {
      lastExecuted = now;
      callback(event);
    }
  };
};

/**
 * Enable GPU acceleration for smooth scrolling
 * Adds will-change and transform hints to element
 */
export const enableScrollAcceleration = (element) => {
  if (!element) return;
  element.style.willChange = "scroll-position";
  element.style.transform = "translateZ(0)";
  element.style.backfaceVisibility = "hidden";
};

/**
 * Disable GPU acceleration (cleanup)
 */
export const disableScrollAcceleration = (element) => {
  if (!element) return;
  element.style.willChange = "auto";
  element.style.transform = "none";
  element.style.backfaceVisibility = "visible";
};

/**
 * Lock scrolling on element (useful for modals)
 */
export const lockScroll = (element) => {
  if (!element) return;
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  element.style.overflow = "hidden";
  element.style.paddingRight = `${scrollbarWidth}px`;
};

/**
 * Unlock scrolling on element
 */
export const unlockScroll = (element) => {
  if (!element) return;
  element.style.overflow = "";
  element.style.paddingRight = "";
};

/**
 * Hook for using passive scroll listeners in React components
 * Usage: usePassiveScroll(containerRef, handleScroll)
 */
export const usePassiveScroll = (elementRef, callback, options = {}) => {
  const callbackRef = React.useRef(callback);

  React.useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  React.useEffect(() => {
    const element = elementRef?.current;
    if (!element) return;

    const handler = (e) => callbackRef.current?.(e);

    const listenerOptions = {
      passive: true,
      ...options,
    };

    try {
      element.addEventListener("scroll", handler, listenerOptions);
      return () => {
        try {
          element.removeEventListener("scroll", handler, listenerOptions);
        } catch (err) {
          element.removeEventListener("scroll", handler, false);
        }
      };
    } catch (err) {
      element.addEventListener("scroll", handler, false);
      return () => element.removeEventListener("scroll", handler, false);
    }
  }, [elementRef, options]);
};

export default {
  addPassiveScrollListener,
  createDebouncedScrollHandler,
  smoothScrollToElement,
  smoothScrollTo,
  isNearBottom,
  isNearTop,
  createThrottledScrollHandler,
  enableScrollAcceleration,
  disableScrollAcceleration,
  lockScroll,
  unlockScroll,
};
