"use client";

import { useState, useRef, useEffect } from "react";
import { useApp } from "@/components/Providers/AppProvider";

export function NotificationBell() {
  const { notifications, unreadCount, openNotifications, setOpenNotifications, markRead } = useApp();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenNotifications(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [setOpenNotifications]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpenNotifications(!openNotifications)}
        className="relative p-2 text-white/60 hover:text-white transition-colors"
        aria-label="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
        )}
      </button>

      {openNotifications && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-dark-200 border border-white/10 shadow-2xl rounded-sm animate-fade-in">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <span className="font-mono text-xs text-white/40 uppercase tracking-wider">Notifications</span>
            <span className="font-mono text-xs text-accent">{unreadCount} new</span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-white/30">No notifications yet</div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    markRead(n.id);
                    if (n.link) window.location.href = n.link;
                  }}
                  className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/[0.02] transition-colors ${!n.read ? "border-l-2 border-l-accent" : ""}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${
                      n.type === "jackpot" ? "bg-accent/20 text-accent" :
                      n.type === "halving" ? "bg-warning/20 text-warning" :
                      n.type === "milestone" ? "bg-white/10 text-white" :
                      "bg-white/5 text-white/50"
                    }`}>
                      {n.type}
                    </span>
                    <span className="font-mono text-[10px] text-white/20">
                      {new Date(n.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-white/80">{n.message}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
