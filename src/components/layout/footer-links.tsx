"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { submitFeedback, type FeedbackType } from "@/lib/api/feedback";
import { toastApiError } from "@/lib/toast-error";

type Modal = "complaint" | "info" | "advertising" | null;

const inputClass =
  "border-border bg-background focus:border-accent w-full rounded-lg border px-3 py-2 text-sm outline-none";

/** Footer form (complaint / advertising): message + optional email/url → POST /feedback/. */
function FeedbackForm({ type, onDone }: { type: FeedbackType; onDone: () => void }) {
  const t = useTranslations("footer");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!message.trim()) return;
    setSending(true);
    try {
      await submitFeedback({ type, message: message.trim(), email: email.trim() || undefined });
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
      </nav>

      <Dialog open={modal !== null} onOpenChange={(o) => !o && close()}>
        <DialogContent side="center" className="gap-4">
          {modal === "complaint" ? (
            <>
              <DialogTitle className="text-lg font-semibold">{t("complaintTitle")}</DialogTitle>
              <FeedbackForm type="complaint" onDone={close} />
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
              <FeedbackForm type="advertising" onDone={close} />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
