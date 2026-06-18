"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { AuthUIProvider } from "@/components/auth/auth-ui";
import { Toaster } from "@/components/common/toaster";
import { getQueryClient } from "@/lib/api/query-client";

export function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <AuthUIProvider>{children}</AuthUIProvider>
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
