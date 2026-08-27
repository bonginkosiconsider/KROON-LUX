"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function logout() {
    startTransition(async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      router.refresh();
    });
  }

  return (
    <button className="button button-outline" type="button" onClick={logout} disabled={pending}>
      {pending ? "Signing out..." : "Sign out"}
    </button>
  );
}

