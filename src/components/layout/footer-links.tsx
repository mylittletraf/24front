"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { submitReport } from "@/lib/api/video-actions";
import { toastApiError } from "@/lib/toast-error";

type Modal = "complaint" | "info" | "advertising" | null;

// Report topic slugs from /report-topics/ — auto-selected per form (no picker shown).
const COMPLAINT_TOPIC = "abuse";
const ADVERTISING_TOPIC = "ads";

const inputClass =
  "border-border bg-background focus:border-accent w-full rounded-lg border px-3 py-2 text-sm outline-none";

/** Footer contact form: email + message are folded into the report's description. */
function ReportForm({ topic, onDone }: { topic: string; onDone: () => void }) {
  const t = useTranslations("footer");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function submit() {
    const text = message.trim();
    if (!text) return;
    const description = email.trim() ? `Email: ${email.trim()}\n\n${text}` : text;
    setSending(true);
    try {
      await submitReport(topic, description);
      toast.success(t("sent"));
      onDone();
    } catch (error) {
      toastApiError(error);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("emailOptional")}
        className={inputClass}
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={t("message")}
        rows={5}
        className={`${inputClass} resize-y`}
      />
      <div className="flex justify-end">
        <Button variant="primary" size="sm" onClick={submit} disabled={sending || !message.trim()}>
          {t("send")}
        </Button>
      </div>
    </div>
  );
}

/** Multi-paragraph formatted text (paragraphs split on blank lines). */
function FormattedText({ text }: { text: string }) {
  return (
    <div className="text-muted flex flex-col gap-2 text-sm leading-relaxed">
      {text.split("\n\n").map((para, i) => (
        <p key={i}>{para}</p>
      ))}
    </div>
  );
}

export function FooterLinks() {
  const t = useTranslations("footer");
  const tp = useTranslations("privacy");
  const [modal, setModal] = useState<Modal>(null);
  const close = () => setModal(null);

  const linkClass = "hover:text-foreground transition-colors";

  return (
    <>
      <nav className="text-muted flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
        <button type="button" className={linkClass} onClick={() => setModal("complaint")}>
          {t("complaint")}
        </button>
        <span aria-hidden className="text-border">
          ·
        </span>
        <button type="button" className={linkClass} onClick={() => setModal("info")}>
          {t("info")}
        </button>
        <span aria-hidden className="text-border">
          ·
        </span>
        <button type="button" className={linkClass} onClick={() => setModal("advertising")}>
          {t("advertising")}
        </button>
        <span aria-hidden className="text-border">
          ·
        </span>
        <Link href="/privacy" className={linkClass}>
          {tp("title")}
        </Link>
      </nav>

      <Dialog open={modal !== null} onOpenChange={(o) => !o && close()}>
        <DialogContent side="center" className="gap-4">
          {modal === "complaint" ? (
            <>
              <DialogTitle className="text-lg font-semibold">{t("complaintTitle")}</DialogTitle>
              <ReportForm topic={COMPLAINT_TOPIC} onDone={close} />
            </>
          ) : null}

          {modal === "info" ? (
            <>
              <DialogTitle className="text-lg font-semibold">{t("infoTitle")}</DialogTitle>
              <FormattedText text={t("infoBody")} />
            </>
          ) : null}

          {modal === "advertising" ? (
            <>
              <DialogTitle className="text-lg font-semibold">{t("advertisingTitle")}</DialogTitle>
              <FormattedText text={t("advertisingBody")} />
              <ReportForm topic={ADVERTISING_TOPIC} onDone={close} />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
