"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { EmptyState } from "@/components/common/empty-state";
import { getMeReports } from "@/lib/api/me-feeds";
import { useAuth } from "@/lib/auth/auth-context";
import type { Locale } from "@/lib/i18n/locales";
import { formatRelativeDate } from "@/lib/utils/format";

export function MeReports() {
  const { getToken } = useAuth();
  const locale = useLocale() as Locale;

  const { data, isLoading } = useQuery({
    queryKey: ["me-reports"],
    queryFn: () => {
      const token = getToken();
      if (!token) return { count: 0, next: null, previous: null, results: [] };
      return getMeReports(token);
    },
  });

  if (isLoading) return null;
  const reports = data?.results ?? [];
  if (reports.length === 0) return <EmptyState title="—" />;

  return (
    <ul className="divide-border flex flex-col divide-y">
      {reports.map((report) => (
        <li key={report.uuid} className="flex items-center justify-between gap-4 py-3 text-sm">
          <div className="flex flex-col">
            <span className="font-medium">
              {report.target_type} · {report.topic ?? "—"}
            </span>
            {report.description ? <span className="text-muted">{report.description}</span> : null}
          </div>
          <div className="text-muted flex shrink-0 flex-col items-end text-xs">
            <span>{report.status}</span>
            <span>{formatRelativeDate(report.created_at, locale)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
