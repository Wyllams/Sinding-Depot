'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PushNotificationManager } from '@/components/pwa/PushNotificationManager';
import { registerServiceWorker } from '@/lib/push-notifications';

/**
 * Client wrapper that:
 * 1. Registers the service worker on mount
 * 2. Gets the current user ID
 * 3. Renders the PushNotificationManager banner
 */
export function PushNotificationInit() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Register SW on mount
    registerServiceWorker();

    // Get current user
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user?.id) {
        setUserId(data.session.user.id);
      }
    });
  }, []);

  if (!userId) return null;

  return <PushNotificationManager userId={userId} />;
}
