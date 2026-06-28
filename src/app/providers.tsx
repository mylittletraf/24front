"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { AuthUIProvider } from "@/components/auth/auth-ui";
import { Toaster } from "@/components/common/toaster";
import { FeedUnreadProvider } from "@/components/feed/feed-unread-context";
import { ShortsPrefProvider } from "@/components/shorts/shorts-pref";
import { VideoStateProvider } from "@/components/video/video-state-context";
import { getQueryClient } from "@/lib/api/query-client";
import { AuthProvider } from "@/lib/auth/auth-context";

export function Providers({ children, showShorts }: { children: ReactNode; showShorts: boolean }) {
  const queryClient = getQueryClient();
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <VideoStateProvider>
            <FeedUnreadProvider>
              <ShortsPrefProvider initialShow={showShorts}>
                <AuthUIProvider>{children}</AuthUIProvider>
              </ShortsPrefProvider>
            </FeedUnreadProvider>
          </VideoStateProvider>
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
