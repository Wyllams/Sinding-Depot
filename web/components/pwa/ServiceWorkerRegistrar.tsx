'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/push-notifications';

/**
 * Componente silencioso que registra o Service Worker.
 * Deve ser colocado no root layout — não renderiza nada.
 */
export function ServiceWorkerRegistrar(): null {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null;
}
