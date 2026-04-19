'use client';

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Componente que mostra o prompt "Instalar App" quando disponível.
 * Funciona no Chrome, Edge, Samsung Internet (Android).
 * No iOS mostra instrução manual (Safari > Compartilhar > "Add to Home Screen").
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Verifica se já está instalado como PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Detecta iOS
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(isIOSDevice);

    // Se já foi descartado nessa sessão
    const wasDismissed = localStorage.getItem('install-prompt-dismissed');
    if (wasDismissed) {
      const dismissedAt = parseInt(wasDismissed, 10);
      // Re-mostrar após 7 dias
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
      }
    }

    // Chrome/Edge: beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('install-prompt-dismissed', Date.now().toString());
  };

  // Don't show if installed, dismissed, or nothing to show
  if (isInstalled || dismissed) return null;
  if (!deferredPrompt && !isIOS) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9998,
        width: 'calc(100% - 2rem)',
        maxWidth: '420px',
        background: 'linear-gradient(135deg, #1e201e 0%, #242624 100%)',
        border: '1px solid rgba(174, 238, 42, 0.25)',
        borderRadius: '16px',
        padding: '16px 20px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        fontFamily: 'var(--font-sans, Inter, system-ui, sans-serif)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* App icon */}
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: '#aeee2a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: '18px',
            fontWeight: 900,
            color: '#1e201e',
          }}
        >
          SD
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
            Install Siding Depot
          </p>
          <p
            style={{
              margin: '2px 0 0',
              fontSize: '12px',
              color: '#ababa8',
              lineHeight: 1.3,
            }}
          >
            {isIOS
              ? 'Tap the share button, then "Add to Home Screen"'
              : 'Add to your home screen for quick access'}
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
            ✕
          </button>
          {!isIOS && deferredPrompt && (
            <button
              onClick={handleInstall}
              style={{
                background: '#aeee2a',
                color: '#1e201e',
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                padding: '6px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Install
            </button>
          )}
        </div>
      </div>

      {/* iOS instruction detail */}
      {isIOS && (
        <div
          style={{
            marginTop: '12px',
            padding: '10px 12px',
            background: 'rgba(174, 238, 42, 0.08)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '20px' }}>
            {/* Share icon */}
            ⬆️
          </span>
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: '#ababa8', lineHeight: 1.4 }}>
              In Safari, tap{' '}
              <span style={{ fontWeight: 700, color: '#aeee2a' }}>Share</span>
              {' → '}
              <span style={{ fontWeight: 700, color: '#aeee2a' }}>Add to Home Screen</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
