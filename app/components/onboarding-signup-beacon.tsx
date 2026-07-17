"use client";

import { useEffect, useRef } from "react";

const STORAGE_KEY = "srp_ob_anon";
const ANON_RE = /^[a-zA-Z0-9_-]{8,64}$/;

function readOrCreateAnonId(): string {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY)?.trim() ?? "";
    if (ANON_RE.test(existing)) return existing;
  } catch {
    // private mode
  }
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : `anon${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore
  }
  return id;
}

async function postSignupIntent(anonymousSessionId: string, source: string) {
  await fetch("/api/onboarding/signup-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ anonymousSessionId, source }),
    credentials: "same-origin",
  });
}

/**
 * Emits signup_started on first meaningful interaction with the Clerk sign-up UI,
 * not on mere page view.
 */
export function SignupIntentBeacon({ source = "self_serve" }: { source?: string }) {
  const sent = useRef(false);

  useEffect(() => {
    const anonId = readOrCreateAnonId();

    const fire = () => {
      if (sent.current) return;
      sent.current = true;
      void postSignupIntent(anonId, source);
    };

    const root = document.querySelector(".cl-signUp-root, .cl-rootBox, form") ?? document.body;

    const onPointer = () => fire();
    const onKey = () => fire();
    const onSubmit = () => fire();

    root.addEventListener("pointerdown", onPointer, { once: true, capture: true });
    root.addEventListener("keydown", onKey, { once: true, capture: true });
    root.addEventListener("submit", onSubmit, { once: true, capture: true });

    return () => {
      root.removeEventListener("pointerdown", onPointer, true);
      root.removeEventListener("keydown", onKey, true);
      root.removeEventListener("submit", onSubmit, true);
    };
  }, [source]);

  return null;
}

/** After auth, link stored anonymous session to the AppUser. */
export function OnboardingSessionLinker() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    let anonId = "";
    try {
      anonId = window.localStorage.getItem(STORAGE_KEY)?.trim() ?? "";
    } catch {
      anonId = "";
    }
    void fetch("/api/onboarding/link-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(anonId ? { anonymousSessionId: anonId } : {}),
      credentials: "same-origin",
    }).then(() => {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    });
  }, []);

  return null;
}
