import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { LanguageProvider } from "@/lib/i18n";
import "./styles.css";

// Cached data stays in memory across route changes, so navigating between pages
// shows the last data instantly (no flash) while it revalidates in the background.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

// Preview queries cache blob object URLs (see usePreview). Query frees the string
// on GC but can't revoke the underlying blob, so we revoke it ourselves — both
// when a cadence refetch replaces a frame with a newer one, and when the entry is
// evicted — to avoid leaking object URLs. We track the last URL seen per query.
{
  const lastUrl = new Map<string, string>();
  queryClient.getQueryCache().subscribe((event) => {
    if (event.query.queryKey[0] !== "preview") return;
    const hash = event.query.queryHash;

    if (event.type === "removed") {
      const url = lastUrl.get(hash);
      if (url) URL.revokeObjectURL(url);
      lastUrl.delete(hash);
    } else if (event.type === "updated" && event.action.type === "success") {
      const next = event.action.data;
      if (typeof next !== "string") return;
      const prev = lastUrl.get(hash);
      if (prev && prev !== next) URL.revokeObjectURL(prev); // free the frame this replaces
      lastUrl.set(hash, next);
    }
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
