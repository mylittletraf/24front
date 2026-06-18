"use client";

import { useEffect } from "react";
import { captureError } from "@/lib/monitoring";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error);
  }, [error]);

  return (
    <html lang="ru">
      <body
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Что-то пошло не так</h1>
          <button
            type="button"
            onClick={() => reset()}
            style={{ marginTop: 16, padding: "8px 16px", borderRadius: 9999, cursor: "pointer" }}
          >
            ↻
          </button>
        </div>
      </body>
    </html>
  );
}
