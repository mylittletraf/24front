import { NextResponse, type NextRequest } from "next/server";
import { SERVER_API_BASE } from "@/lib/api/config";

/**
 * Same-origin proxy for authenticated client requests. The browser calls
 * /api/proxy/<path> (same origin → no CORS); this handler forwards to the backend
 * server-to-server, passing through the Authorization header and body.
 */
async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const segments = path.filter(Boolean).join("/");
  const target = `${SERVER_API_BASE}/${segments}/${req.nextUrl.search}`;

  const headers: Record<string, string> = { Accept: "application/json" };
  const auth = req.headers.get("authorization");
  if (auth) headers.Authorization = auth;
  const contentType = req.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const body = hasBody ? await req.text() : undefined;

  const res = await fetch(target, {
    method: req.method,
    headers,
    body: body || undefined,
    cache: "no-store",
  });

  const text = await res.text();
  return new NextResponse(text || null, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
  });
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
