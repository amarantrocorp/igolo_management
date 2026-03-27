import { QueryClient } from "@tanstack/react-query";

/**
 * Shared QueryClient instance.
 * Exported so the auth store can call `queryClient.clear()` on
 * org-switch / logout to prevent cross-tenant cache leaks.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      networkMode: "offlineFirst",
    },
  },
});
