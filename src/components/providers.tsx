"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { LiveUpdateProvider } from "./live-update-provider";
import { TooltipProvider } from "./ui/tooltip";

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
      <TooltipProvider delay={500} closeDelay={0}>
        <LiveUpdateProvider>{children}</LiveUpdateProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
