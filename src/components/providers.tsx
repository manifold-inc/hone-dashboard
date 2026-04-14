"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { LiveUpdateProvider } from "./live-update-provider";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2_000,
            refetchInterval: 30_000,
            retry: 2,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      <LiveUpdateProvider>{children}</LiveUpdateProvider>
    </QueryClientProvider>
  );
}
