import { useEffect, useRef } from "react";
import { supabase } from "../supabase";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

// ─── Types ─────────────────────────────────────────────────────
type PostgresEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface SubscriptionConfig {
  /** The database table to subscribe to */
  table: string;
  /** The schema (defaults to "public") */
  schema?: string;
  /** Postgres change event type to listen for */
  event?: PostgresEvent;
  /** Optional filter expression, e.g. "job_id=eq.some-uuid" */
  filter?: string;
  /** Callback when a change is received */
  onPayload: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
  /** Whether the subscription is enabled (defaults to true) */
  enabled?: boolean;
}

/**
 * Hook reutilizável para Supabase Realtime subscriptions.
 *
 * Cria um canal exclusivo por combinação table+filter, limpa automaticamente
 * no unmount, e suporta toggle via `enabled`.
 *
 * @example
 * useRealtimeSubscription({
 *   table: "change_orders",
 *   event: "*",
 *   onPayload: () => refetch(),
 * });
 */
export function useRealtimeSubscription({
  table,
  schema = "public",
  event = "*",
  filter,
  onPayload,
  enabled = true,
}: SubscriptionConfig): void {
  // Ref to hold the latest callback without re-subscribing
  const callbackRef = useRef(onPayload);
  callbackRef.current = onPayload;

  useEffect(() => {
    if (!enabled) return;

    const channelName = `realtime:${schema}:${table}${filter ? `:${filter}` : ""}:${Date.now()}`;

    // Build the postgres_changes config
    const changesConfig: {
      event: PostgresEvent;
      schema: string;
      table: string;
      filter?: string;
    } = {
      event,
      schema,
      table,
    };

    if (filter) {
      changesConfig.filter = filter;
    }

    const channel: RealtimeChannel = supabase
      .channel(channelName)
      .on(
        "postgres_changes" as any,
        changesConfig,
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          callbackRef.current(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, schema, event, filter, enabled]);
}
