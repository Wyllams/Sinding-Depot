/**
 * Push Notification utilities — client-side
 *
 * Handles service worker registration, push subscription,
 * and permission management.
 */

// ─── Types ──────────────────────────────────────────────────────
interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// ─── Service Worker Registration ────────────────────────────────

/** Registra o Service Worker e retorna a registration. */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[PWA] Service Workers not supported in this browser.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    console.log('[PWA] Service Worker registered:', registration.scope);
    return registration;
  } catch (error) {
    console.error('[PWA] Service Worker registration failed:', error);
    return null;
  }
}

// ─── Push Notification Permission ───────────────────────────────

/** Verifica se push notifications são suportadas. */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** Retorna o status atual da permissão. */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/** Solicita permissão para notificações push. */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('Notifications not supported in this browser.');
  }

  const permission = await Notification.requestPermission();
  return permission;
}

// ─── Push Subscription ─────────────────────────────────────────

/**
 * Inscreve o browser no serviço de push notifications.
 * Retorna a subscription para enviar ao servidor.
 */
export async function subscribeToPush(
  registration: ServiceWorkerRegistration
): Promise<PushSubscriptionPayload | null> {
  try {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    if (!vapidPublicKey) {
      console.error('[PWA] Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY env var.');
      return null;
    }

    // Convert VAPID key from base64 to Uint8Array
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });
    }

    const subscriptionJSON = subscription.toJSON();

    if (!subscriptionJSON.endpoint || !subscriptionJSON.keys) {
      console.error('[PWA] Invalid push subscription.');
      return null;
    }

    return {
      endpoint: subscriptionJSON.endpoint,
      keys: {
        p256dh: subscriptionJSON.keys.p256dh!,
        auth: subscriptionJSON.keys.auth!,
      },
    };
  } catch (error) {
    console.error('[PWA] Push subscription failed:', error);
    return null;
  }
}

/** Cancela a inscrição de push. */
export async function unsubscribeFromPush(
  registration: ServiceWorkerRegistration
): Promise<boolean> {
  try {
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      return true;
    }
    return false;
  } catch (error) {
    console.error('[PWA] Push unsubscribe failed:', error);
    return false;
  }
}

// ─── Save subscription to server ────────────────────────────────

/** Envia a subscription para o servidor salvar no Supabase. */
export async function saveSubscriptionToServer(
  subscription: PushSubscriptionPayload,
  userId: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription, userId }),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    console.log('[PWA] Subscription saved to server.');
    return true;
  } catch (error) {
    console.error('[PWA] Failed to save subscription:', error);
    return false;
  }
}

// ─── Helpers ────────────────────────────────────────────────────

/** Converte VAPID key de base64url para Uint8Array. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
