import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/smooth-scroll.css";
import { RouterProvider } from "react-router";
import router from "./router/router.jsx";
import { Provider } from "react-redux";
import { store } from "./store";

const CHUNK_RECOVERY_FLAG = "aurora:chunk-recovery-attempted";

const resetChunkRecoveryFlag = () => {
  try {
    sessionStorage.removeItem(CHUNK_RECOVERY_FLAG);
  } catch {
    // Ignore storage failures in restricted browsers.
  }
};

const attemptChunkRecoveryReload = () => {
  try {
    if (sessionStorage.getItem(CHUNK_RECOVERY_FLAG) === "1") {
      resetChunkRecoveryFlag();
      return;
    }

    sessionStorage.setItem(CHUNK_RECOVERY_FLAG, "1");
  } catch {
    // If storage is unavailable, still attempt a single reload.
  }

  window.location.reload();
};

// Defer non-critical styles and scripts
const loadDeferredAssets = () => {
  // Load additional styles after initial render
  setTimeout(() => {
    import('./styles/deferred-styles.css').catch(() => {
      // Silently fail if file doesn't exist
    });
  }, 1000);
};

if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    attemptChunkRecoveryReload();
  });

  window.addEventListener("pageshow", () => {
    resetChunkRecoveryFlag();
  });
}

// Initialize app
const root = createRoot(document.getElementById("root"));
root.render(
  <StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </StrictMode>
);

// Load deferred assets after initial render
if (document.readyState === 'complete') {
  loadDeferredAssets();
} else {
  window.addEventListener('load', loadDeferredAssets);
}

const shouldLogPerformance =
  import.meta.env.DEV &&
  typeof window !== "undefined" &&
  window.localStorage?.getItem("debug:perf") === "1";

// Performance monitoring (development only and explicitly enabled)
if (shouldLogPerformance && typeof PerformanceObserver !== "undefined") {
  // Monitor long tasks
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.duration > 120) {
        console.warn('Long task detected:', entry);
      }
    }
  });
  observer.observe({ entryTypes: ['longtask'] });

  // Monitor LCP
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log('LCP:', entry.startTime + entry.duration);
    }
  }).observe({ entryTypes: ['largest-contentful-paint'] });
}
