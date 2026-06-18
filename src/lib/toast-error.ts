import { toast } from "sonner";
import { ApiError } from "@/lib/api/errors";

/** Map an API error to a user-facing toast. Returns true if it was a 401 (handled by caller). */
export function toastApiError(error: unknown, opts?: { onUnauthorized?: () => void }): void {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      opts?.onUnauthorized?.();
      return;
    }
    if (error.status === 403) {
      toast.error("Нет доступа");
      return;
    }
    if (error.status === 429) {
      toast.error(
        error.retryAfter
          ? `Слишком много запросов. Повторите через ${error.retryAfter} с`
          : "Слишком много запросов, попробуйте позже",
      );
      return;
    }
    if (error.status === 0) {
      toast.error("Ошибка сети. Проверьте соединение");
      return;
    }
    toast.error(error.message || "Произошла ошибка");
    return;
  }
  toast.error("Произошла ошибка");
}
