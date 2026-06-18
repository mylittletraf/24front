import { Suspense } from "react";
import { QuickLoginClient } from "./quick-login-client";

export default function QuickLoginPage() {
  return (
    <Suspense fallback={null}>
      <QuickLoginClient />
    </Suspense>
  );
}
