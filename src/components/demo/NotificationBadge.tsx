"use client";

import { useState } from "react";

export function NotificationBadge() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-50">
      <div className="flex items-center gap-3 rounded-full bg-[#dc3545] px-4 py-2 text-white shadow-lg">
        <div className="flex size-6 items-center justify-center rounded-full border-2 border-white/30 text-xs font-bold">
          N
        </div>
        <span className="text-sm font-bold">2 Issues</span>
        <button 
          onClick={() => setIsVisible(false)}
          className="ml-2 rounded-full p-1 hover:bg-white/20 transition-colors"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}