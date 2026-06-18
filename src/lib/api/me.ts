import { z } from "zod";
import { apiFetch } from "./fetcher";

export const UserSchema = z.object({
  id: z.union([z.number(), z.string()]),
  username: z.string(),
  display_name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  is_verified: z.boolean().optional(),
  created_at: z.string().optional(),
});
export type User = z.infer<typeof UserSchema>;

export async function getMe(token: string): Promise<User> {
  const data = await apiFetch<unknown>("/me/", { token, cache: "no-store" });
  return UserSchema.parse(data);
}

export async function updateDisplayName(displayName: string, token: string): Promise<User> {
  const data = await apiFetch<unknown>("/me/", {
    method: "PATCH",
    body: { display_name: displayName },
    token,
  });
  return UserSchema.parse(data);
}

export async function deleteAccount(token: string): Promise<void> {
  await apiFetch("/me/", { method: "DELETE", token });
}

export async function requestQuickLoginLink(token: string): Promise<string> {
  const data = await apiFetch<{ quick_login_token?: string }>("/me/quick-login-link/", {
    method: "POST",
    token,
  });
  return data?.quick_login_token ?? "";
}
