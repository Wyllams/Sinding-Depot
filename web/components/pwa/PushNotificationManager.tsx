'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  saveSubscriptionToServer,
} from '@/lib/push-notifications';

interface PushNotificationManagerProps {
  userId: string;
}

/**
 * Componente que gerencia o opt-in de push notifications.
 * Mostra um banner convidando o user a ativar notificações.
 */
export function PushNotificationManager({ userId }: PushNotificationManagerProps) {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const status = getNotificationPermission();
    setPermission(status);

    if (status === 'granted') {
      setIsSubscribed(true);
    }

    // Se o usuário já descartou o banner nessa sessão, não mostra
    const wasDismissed = sessionStorage.getItem('push-banner-dismissed');
    if (wasDismissed) setDismissed(true);
  }, []);

  const handleEnable = useCallback(async () => {
    if (!isPushSupported()) return;

    setIsLoading(true);

    try {
      const perm = await requestNotificationPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        setIsLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await subscribeToPush(registration);

      if (subscription) {
        await saveSubscriptionToServer(subscription, userId);
        setIsSubscribed(true);
      }
    } catch (error) {
      console.error('[Push] Enable failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('push-banner-dismissed', 'true');
  };

  // Don't render if: not supported, already subscribed, denied, or dismissed
  if (
    permission === 'unsupported' ||
    permission === 'denied' ||
    isSubscribed ||
    dismissed
  ) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        width: 'calc(100% - 2rem)',
        maxWidth: '420px',
        background: 'linear-gradient(135deg, #1e201e 0%, #242624 100%)',
        border: '1px solid rgba(174, 238, 42, 0.3)',
        borderRadius: '16px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        fontFamily: 'var(--font-sans, Inter, system-ui, sans-serif)',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: 'rgba(174, 238, 42, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontSize: '20px',
        }}
      >
        🔔
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 600,
            color: '#faf9f5',
            lineHeight: 1.3,
          }}
        >
          Enable Notifications
        </p>
        <p
          style={{
            margin: '2px 0 0',
            fontSize: '12px',
            color: '#ababa8',
            lineHeight: 1.3,
          }}
        >
          Get alerts for new jobs, schedule changes & blockers.
        </p>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: '#747673',
            fontSize: '12px',
            padding: '6px 10px',
            cursor: 'pointer',
            borderRadius: '8px',
          }}
        >
          Later
        </button>
        <button
          onClick={handleEnable}
          disabled={isLoading}
          style={{
            background: '#aeee2a',
            color: '#1e201e',
            border: 'none',
            fontSize: '12px',
            fontWeight: 700,
            padding: '6px 14px',
            borderRadius: '8px',
            cursor: isLoading ? 'wait' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {isLoading ? '...' : 'Enable'}
        </button>
      </div>
    </div>
  );
}
