"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/app/components/modal";

type Category = "bug" | "question" | "idea";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "bug", label: "Something's broken" },
  { value: "question", label: "Question" },
  { value: "idea", label: "Idea or suggestion" },
];

export function FeedbackButton({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("question");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function close() {
    if (pending) return;
    setOpen(false);
    setError(null);
    setSent(false);
    setMessage("");
    setCategory("question");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message: message.trim(),
          pageUrl: pathname || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not send feedback. Please try again.");
        return;
      }
      setSent(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-zinc-500 hover:text-emerald-800"
      >
        Send feedback
      </button>

      <Modal open={open} onClose={close} title="Send feedback" size="md">
        {sent ? (
          <div className="space-y-3 text-sm text-zinc-700">
            <p className="font-medium text-emerald-900">Thanks — we got it.</p>
            <p>
              We read every message from design partners. If we need more detail, we&apos;ll reply
              to <span className="font-medium">{userEmail}</span>.
            </p>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={close}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 text-sm">
            <p className="text-zinc-600">
              Tell us what&apos;s working, what&apos;s confusing, or what broke. We use your account
              email ({userEmail}) so we can follow up.
            </p>

            <fieldset>
              <legend className="mb-2 font-medium text-zinc-900">Type</legend>
              <div className="flex flex-col gap-2">
                {CATEGORIES.map(({ value, label }) => (
                  <label key={value} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="category"
                      value={value}
                      checked={category === value}
                      onChange={() => setCategory(value)}
                      className="text-emerald-700 focus:ring-emerald-500"
                    />
                    <span className="text-zinc-700">{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="feedback-message" className="mb-1 block font-medium text-zinc-900">
                Message
              </label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                required
                minLength={5}
                maxLength={4000}
                placeholder="What happened? What were you trying to do?"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring-2"
              />
            </div>

            {error ? <p className="text-sm text-rose-600">{error}</p> : null}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={close}
                disabled={pending}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending || message.trim().length < 5}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {pending ? "Sending…" : "Send"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
