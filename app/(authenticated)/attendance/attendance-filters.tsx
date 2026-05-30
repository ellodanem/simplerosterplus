"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { OrgLocation } from "@/lib/location";
import { useAttendanceFilters } from "./attendance-filter-context";

const selectClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-zinc-500 focus:outline-none";

export function AttendanceFilters({
  locations,
  currentLocationId,
  departments,
}: {
  locations: OrgLocation[];
  currentLocationId: string;
  departments: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { department, setDepartment, search, setSearch, showArchivedStaff } = useAttendanceFilters();

  function pushParams(mutator: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutator(params);
    router.push(`/attendance?${params.toString()}`);
  }

  function pushWithLocation(nextLocationId: string) {
    if (nextLocationId === currentLocationId) return;
    pushParams((params) => {
      if (locations.some((l) => l.id === nextLocationId)) {
        params.set("location", nextLocationId);
      } else {
        params.delete("location");
      }
      params.delete("staff");
    });
  }

  function toggleArchivedStaff() {
    pushParams((params) => {
      if (showArchivedStaff) params.delete("archived");
      else params.set("archived", "1");
    });
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <select
        value={department}
        onChange={(e) => setDepartment(e.target.value)}
        aria-label="Filter by department"
        className={`min-w-[10.5rem] ${selectClass}`}
      >
        <option value="">All Departments</option>
        {departments.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      {locations.length > 1 ? (
        <select
          value={currentLocationId}
          onChange={(e) => pushWithLocation(e.target.value)}
          aria-label="Filter by location"
          className={`min-w-[10.5rem] ${selectClass}`}
        >
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
      ) : (
        <select
          value=""
          disabled
          aria-label="Filter by location"
          className={`min-w-[10.5rem] cursor-not-allowed opacity-70 ${selectClass}`}
        >
          <option value="">All Locations</option>
        </select>
      )}

      <div className="relative min-w-[12rem] flex-1">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search employee"
          aria-label="Search employee"
          className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none"
        />
      </div>

      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={showArchivedStaff}
          onChange={toggleArchivedStaff}
          className="size-4 rounded border-zinc-300 text-emerald-700 focus:ring-emerald-600"
        />
        Show archived staff
      </label>
    </div>
  );
}
