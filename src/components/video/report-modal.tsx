"use client";

import { Flag } from "lucide-react";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { track } from "@/lib/analytics/track";
import { getReportTopics, reportVideo, type ReportTopic } from "@/lib/api/video-actions";
import type { Locale } from "@/lib/i18n/locales";
import { toastApiError } from "@/lib/toast-error";

export function ReportModal({ videoUuid }: { videoUuid: string }) {
  const locale = useLocale() as Locale;
  const [open, setOpen] = useState(false);
  const [topics, setTopics] = useState<ReportTopic[]>([]);
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && topics.length === 0) {
      getReportTopics(locale)
        .then((list) => {
          setTopics(list);
          if (list[0]) setTopic(list[0].slug);
        })
        .catch(() => undefined);
    }
  }, [open, topics.length, locale]);

  async function submit() {
    if (!topic) return;
    setSubmitting(true);
    try {
      await reportVideo(videoUuid, topic, description);
      track("report_submit", { video_uuid: videoUuid, topic });
      toast.success("Жалоба отправлена");
      setOpen(false);
      setDescription("");
    } catch (error) {
      toastApiError(error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="md" aria-label="Report">
          <Flag size={18} />
        </Button>
      </DialogTrigger>
      <DialogContent side="center" className="gap-4">
        <DialogTitle className="text-lg font-semibold">Пожаловаться</DialogTitle>
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="border-border bg-surface h-10 rounded-lg border px-3 text-sm outline-none"
        >
          {topics.length === 0 ? <option value="">—</option> : null}
          {topics.map((tpc) => (
            <option key={tpc.slug} value={tpc.slug}>
              {tpc.name}
            </option>
          ))}
        </select>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Опишите проблему"
          className="border-border bg-surface resize-none rounded-lg border p-3 text-sm outline-none"
        />
        <Button variant="primary" onClick={submit} disabled={submitting || !topic}>
          Отправить
        </Button>
      </DialogContent>
    </Dialog>
  );
}
