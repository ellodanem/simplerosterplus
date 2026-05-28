"use client";

import { createContext, useContext, useDeferredValue, useMemo, useState, type ReactNode } from "react";
import type { AttendanceStaff } from "@/lib/attendance-week";

type AttendanceFilterContextValue = {
  department: string;
  setDepartment: (value: string) => void;
  search: string;
  setSearch: (value: string) => void;
  deferredSearch: string;
  matchesStaff: (staff: AttendanceStaff) => boolean;
};

const AttendanceFilterContext = createContext<AttendanceFilterContextValue | null>(null);

export function AttendanceFilterProvider({ children }: { children: ReactNode }) {
  const [department, setDepartment] = useState("");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const value = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();

    function matchesStaff(staff: AttendanceStaff): boolean {
      if (department && (staff.departmentName ?? "") !== department) return false;
      if (q) {
        const hay =
          `${staff.firstName} ${staff.lastName} ${staff.role ?? ""} ${staff.departmentName ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }

    return {
      department,
      setDepartment,
      search,
      setSearch,
      deferredSearch,
      matchesStaff,
    };
  }, [department, search, deferredSearch]);

  return (
    <AttendanceFilterContext.Provider value={value}>{children}</AttendanceFilterContext.Provider>
  );
}

export function useAttendanceFilters() {
  const ctx = useContext(AttendanceFilterContext);
  if (!ctx) {
    throw new Error("useAttendanceFilters must be used within AttendanceFilterProvider");
  }
  return ctx;
}
