import { apiFetch } from "./fetcher";

export type FeedbackType = "complaint" | "advertising";

export interface FeedbackPayload {
  type: FeedbackType;
  message: string;
  email?: string;
  url?: string;
}

/** Submit a footer form (complaint / advertising enquiry). Needs backend POST /feedback/. */
export async function submitFeedback(payload: FeedbackPayload): Promise<void> {
  await apiFetch("/feedback/", { method: "POST", body: payload });
}
