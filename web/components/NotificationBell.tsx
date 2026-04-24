"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface Notification {
  id: string;
  title: string;
  body: string;
  notification_type: "new_job" | "new_change_order" | string;
  related_entity_id: string | null;
  read: boolean;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen]              = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.read).length;

  // ── Load notifications ────────────────────────────────────
  const load = useCallback(async () => {
    const { data } = await supabase
      .from("notifications")
      .select("id, title, body, notification_type, related_entity_id, read, created_at")
      .order("created_at", { ascending: false })
      .limit(30);

    if (data) setNotifications(data as Notification[]);
  }, []);

  useEffect(() => {
    load();

    // Real-time: listen for new inserts
    const channel = supabase
      .channel("public:notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => load()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load]);

  // ── Close on outside click ────────────────────────────────
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // ── Mark a single notification as read ───────────────────
  const markRead = useCallback(async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }, []);

  // ── Mark all as read ─────────────────────────────────────
  const markAllRead = useCallback(async () => {
    const ids = notifications.filter((n) => !n.read).map((n) => n.id);
    if (!ids.length) return;
    await supabase.from("notifications").update({ read: true }).in("id", ids);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [notifications]);

  // ── Navigate on click ────────────────────────────────────
  const handleClick = useCallback(async (n: Notification) => {
    await markRead(n.id);
    setOpen(false);

    if (!n.related_entity_id) return;

    if (n.notification_type === "new_job") {
      // Navega para a página de DETALHES do projeto
      // Usa window.location.href para garantir reload completo da página de detalhe
      window.location.href = `/projects/${n.related_entity_id}`;
    } else if (n.notification_type === "new_change_order") {
      window.location.href = `/projects/${n.related_entity_id}`;
    } else if (n.related_entity_id) {
      // Fallback genérico: tenta navegar para o projeto relacionado
      router.push(`/projects/${n.related_entity_id}`);
    }
  }, [markRead, router]);

  // ── Icon color based on type ──────────────────────────────
  const iconFor = (type: string) =>
    type === "new_job" ? "person_add" : "edit_note";

  const colorFor = (type: string) =>
    type === "new_job" ? "text-primary" : "text-[#e3eb5d]";

  // ─────────────────────────────────────────────────────────
  return (
    <div className="relative hidden sm:block" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 text-on-surface-variant hover:text-on-surface transition-colors rounded-full hover:bg-surface-container-highest"
        aria-label="Notifications"
      >
        <span className="material-symbols-outlined text-[22px]" translate="no">
          notifications
        </span>

        {/* Badge */}
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-error rounded-full flex items-center justify-center text-[9px] font-black text-white leading-none">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-3 w-80 bg-surface-container rounded-2xl shadow-2xl border border-white/5 overflow-hidden z-50 origin-top-right animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <p className="text-sm font-black text-on-surface uppercase tracking-widest">
              Notifications
            </p>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-[10px] font-bold text-primary hover:text-white transition-colors uppercase tracking-widest"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-outline-variant">
                <span className="material-symbols-outlined text-4xl" translate="no">
                  notifications_off
                </span>
                <p className="text-xs font-bold">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-surface-container-highest transition-colors border-b border-white/5 last:border-0 ${
                    !n.read ? "bg-primary/5" : ""
                  }`}
                >
                  {/* Icon */}
                  <div className={`shrink-0 mt-0.5 ${colorFor(n.notification_type)}`}>
                    <span className="material-symbols-outlined text-[20px]" translate="no">
                      {iconFor(n.notification_type)}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${!n.read ? "text-on-surface" : "text-on-surface-variant"}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-outline truncate mt-0.5">{n.body}</p>
                    <p className="text-[10px] text-outline-variant mt-1">{timeAgo(n.created_at)}</p>
                  </div>

                  {/* Unread dot */}
                  {!n.read && (
                    <div className="shrink-0 mt-2 w-2 h-2 rounded-full bg-primary" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
