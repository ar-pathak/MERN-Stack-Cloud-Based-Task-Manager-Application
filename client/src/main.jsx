import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/smooth-scroll.css";
import { RouterProvider } from "react-router";
import router from "./router/router.jsx";
import { Provider } from "react-redux";
import { store } from "./store";

// Defer non-critical styles and scripts
const loadDeferredAssets = () => {
  // Load additional styles after initial render
  setTimeout(() => {
    import('./styles/deferred-styles.css').catch(() => {
      // Silently fail if file doesn't exist
    });
  }, 1000);
};

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

// Performance monitoring (development only)
if (import.meta.env.DEV) {
  // Monitor long tasks
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.duration > 50) {
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

