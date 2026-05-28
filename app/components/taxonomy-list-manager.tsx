"use client";

import { useMemo, useState } from "react";

export type TaxonomyItem = {
  id: string;
  name: string;
  sortOrder: number;
  staffCount?: number;
};

export function TaxonomyListManager({
  kind,
  apiBase,
  initial,
  presets,
  onChange,
  description,
}: {
  kind: "role" | "department";
  apiBase: "/api/roles" | "/api/departments";
  initial: TaxonomyItem[];
  presets?: readonly string[];
  onChange?: (items: TaxonomyItem[]) => void;
  description?: string;
}) {
  const [items, setItems] = useState<TaxonomyItem[]>(sortItems(initial));
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const existingNames = useMemo(
    () => new Set(items.map((i) => i.name.toLowerCase())),
    [items],
  );

  function applyUpdate(next: TaxonomyItem[]) {
    const sorted = sortItems(next);
    setItems(sorted);
    onChange?.(sorted);
  }

  async function createName(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (existingNames.has(trimmed.toLowerCase())) {
      setError(`That ${kind} already exists.`);
      return;
    }

    setError(null);
    setWarning(null);
    setPending(true);
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        warning?: string;
        role?: TaxonomyItem;
        department?: TaxonomyItem;
      };
      if (!res.ok) {
        setError(data.error || `Could not add ${kind}`);
        return;
      }
      const created = data.role ?? data.department;
      if (!created) {
        setError(`Could not add ${kind}`);
        return;
      }
      applyUpdate([...items, { ...created, staffCount: 0 }]);
      setNewName("");
      if (data.warning) setWarning(data.warning);
    } finally {
      setPending(false);
    }
  }

  async function renameItem(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;

    setError(null);
    setWarning(null);
    const res = await fetch(`${apiBase}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      warning?: string;
      role?: TaxonomyItem;
      department?: TaxonomyItem;
    };
    if (!res.ok) {
      setError(data.error || "Could not save");
      return;
    }
    const updated = data.role ?? data.department;
    if (!updated) return;
    applyUpdate(items.map((item) => (item.id === id ? { ...item, ...updated } : item)));
    if (data.warning) setWarning(data.warning);
  }

  async function deleteItem(id: string, name: string) {
    if (!confirm(`Delete ${kind} "${name}"?`)) return;

    setError(null);
    setWarning(null);
    const res = await fetch(`${apiBase}/${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(data.error || "Could not delete");
      return;
    }
    applyUpdate(items.filter((item) => item.id !== id));
  }

  const label = kind === "role" ? "Role" : "Department";

  return (
    <div className="space-y-4">
      {description ? <p className="text-sm text-zinc-600">{description}</p> : null}

      {presets && presets.length > 0 ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Common {label.toLowerCase()}s
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {presets.map((preset) => {
              const added = existingNames.has(preset.toLowerCase());
              return (
                <button
                  key={preset}
                  type="button"
                  disabled={added || pending}
                  onClick={() => void createName(preset)}
                  className={`rounded-full px-3 py-1 text-sm font-medium ${
                    added
                      ? "cursor-default bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 disabled:opacity-60"
                  }`}
                >
                  {added ? `✓ ${preset}` : preset}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void createName(newName);
        }}
      >
        <div className="min-w-[12rem] flex-1">
          <label className="text-xs font-medium text-zinc-600" htmlFor={`${kind}-new-name`}>
            Add {label.toLowerCase()}
          </label>
          <input
            id={`${kind}-new-name`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={`Type a ${label.toLowerCase()} name`}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={pending || !newName.trim()}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          Add
        </button>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {warning ? <p className="text-sm text-amber-700">{warning}</p> : null}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="w-24 px-3 py-2">Staff</th>
              <th className="w-28 px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-zinc-500">
                  No {label.toLowerCase()}s yet.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <TaxonomyRow
                  key={item.id}
                  item={item}
                  onRename={(name) => renameItem(item.id, name)}
                  onDelete={() => deleteItem(item.id, item.name)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TaxonomyRow({
  item,
  onRename,
  onDelete,
}: {
  item: TaxonomyItem;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);

  if (editing) {
    return (
      <tr>
        <td className="px-3 py-2" colSpan={2}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm"
            autoFocus
          />
        </td>
        <td className="px-3 py-2 text-right">
          <button
            type="button"
            onClick={() => {
              onRename(name);
              setEditing(false);
            }}
            className="text-sm font-medium text-emerald-700 hover:text-emerald-900"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setName(item.name);
              setEditing(false);
            }}
            className="ml-2 text-sm text-zinc-600 hover:text-zinc-900"
          >
            Cancel
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="px-3 py-2 font-medium text-zinc-900">{item.name}</td>
      <td className="px-3 py-2 text-zinc-600">{item.staffCount ?? 0}</td>
      <td className="px-3 py-2 text-right">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-sm font-medium text-emerald-700 hover:text-emerald-900"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="ml-2 text-sm font-medium text-red-700 hover:text-red-900"
        >
          Delete
        </button>
      </td>
    </tr>
  );
}

function sortItems(items: TaxonomyItem[]): TaxonomyItem[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}
