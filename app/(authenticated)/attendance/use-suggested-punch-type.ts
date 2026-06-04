"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Fetches the suggested In/Out toggle for manual punch entry from the staff member's
 * latest punch at the current location (by punchAt, not the day on the form).
 */
export function useSuggestedPunchType(staffId: string | null) {
  const [type, setType] = useState<"in" | "out">("in");
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!staffId) {
      setType("in");
      return;
    }

    const ac = new AbortController();
    void (async () => {
      try {
        const res = await fetch(
          `/api/attendance/punches?staffId=${encodeURIComponent(staffId)}`,
          { signal: ac.signal },
        );
        const data = (await res.json().catch(() => ({}))) as {
          suggestedType?: "in" | "out";
          error?: string;
        };
        if (!res.ok) throw new Error(data.error || "Could not load punch default");
        if (data.suggestedType === "in" || data.suggestedType === "out") {
          setType(data.suggestedType);
        }
      } catch (e) {
        if (ac.signal.aborted) return;
        setType("in");
      }
    })();

    return () => ac.abort();
  }, [staffId, refreshKey]);

  return { type, setType, refresh };
}
