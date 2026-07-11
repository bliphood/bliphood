"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { NotificationItem } from "@/lib/types";

interface AppState {
  notifications: NotificationItem[];
  addNotification: (n: Omit<NotificationItem, "id" | "read" | "timestamp">) => void;
  markRead: (id: string) => void;
  unreadCount: number;
  openNotifications: boolean;
  setOpenNotifications: (v: boolean) => void;
  wallet: string | null;
  setWallet: (w: string | null) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [openNotifications, setOpenNotifications] = useState(false);
  const [wallet, setWallet] = useState<string | null>(null);

  const addNotification = useCallback((n: Omit<NotificationItem, "id" | "read" | "timestamp">) => {
    const id = `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setNotifications((prev) => [{
      ...n,
      id,
      read: false,
      timestamp: Date.now(),
    }, ...prev].slice(0, 50));
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AppContext.Provider value={{
      notifications, addNotification, markRead,
      unreadCount, openNotifications, setOpenNotifications,
      wallet, setWallet,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
