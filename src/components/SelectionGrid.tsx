"use client";

import { useMemo, useState } from "react";

type SelectionGridProps = {
  items?: string[];
  onSelect?: (item: string) => void;
};

const DEFAULT_ITEMS = Array.from({ length: 25 }, (_, i) => `test${i + 1}`);

function toAssetPath(item: string) {
  return `/assets/${item}.png`;
}

export function SelectionGrid({ items = DEFAULT_ITEMS, onSelect }: SelectionGridProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.toLowerCase().includes(q));
  }, [items, searchTerm]);

  return (
    <section className="min-h-screen w-full bg-[#f9fafb] p-4 md:p-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6 flex justify-center">
          <label className="relative w-full max-w-md">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
              className="w-full rounded-full border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-700 shadow-sm outline-none transition-all focus:border-gray-300 focus:ring-2 focus:ring-gray-200"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {filteredItems.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onSelect?.(item)}
              className="aspect-[16/10] rounded-3xl border border-gray-100 bg-white p-4 text-left shadow-sm transition-all hover:scale-[1.02] hover:shadow-md"
            >
              <div className="mb-3 flex h-[65%] items-center justify-center overflow-hidden rounded-2xl bg-gray-50">
                <img
                  src={toAssetPath(item)}
                  alt={item}
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = "none";
                    const fallback = target.nextElementSibling as HTMLDivElement | null;
                    if (fallback) fallback.style.display = "grid";
                  }}
                />
                <div className="hidden h-full w-full place-items-center text-2xl font-semibold text-gray-400">
                  {item.slice(0, 1).toUpperCase()}
                </div>
              </div>
              <p className="truncate text-center text-sm font-medium text-gray-700">{item}</p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
