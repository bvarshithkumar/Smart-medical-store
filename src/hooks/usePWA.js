/**
 * PWA Hook – Sri Venkateshwara Medical Store
 * Manages beforeinstallprompt, install state, and success notification
 */
import { useState, useEffect, useCallback, useRef } from 'react';

export function usePWA() {
  const [installPrompt, setInstallPrompt]   = useState(null);
  const [isInstalled,   setIsInstalled]     = useState(false);
  const [isInstalling,  setIsInstalling]    = useState(false);
  const [showManual,    setShowManual]       = useState(false);
  const [showSuccess,   setShowSuccess]     = useState(false);
  const [swRegistered,  setSwRegistered]    = useState(false);
  const promptRef = useRef(null);

  /* ── Detect if already installed ───────────────────────── */
  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://');
    setIsInstalled(isStandalone);
  }, []);

  /* ── Capture beforeinstallprompt ───────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      console.log('[PWA] beforeinstallprompt captured');
      promptRef.current = e;
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  /* ── Track appinstalled event ───────────────────────────── */
  useEffect(() => {
    const handler = () => {
      console.log('[PWA] App installed successfully');
      setIsInstalled(true);
      setInstallPrompt(null);
      setShowSuccess(true);
      setShowManual(false);
      // Auto-hide success after 5 seconds
      setTimeout(() => setShowSuccess(false), 5000);
    };
    window.addEventListener('appinstalled', handler);
    return () => window.removeEventListener('appinstalled', handler);
  }, []);

  /* ── Register Service Worker ─────────────────────────────── */
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    
    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });
        console.log('[SW] Registered:', registration.scope);
        setSwRegistered(true);

        // Check for updates every 60 minutes
        setInterval(() => registration.update(), 60 * 60 * 1000);

        // Handle waiting SW (new version available)
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available – could show update toast here
              console.log('[SW] New version available');
            }
          });
        });
      } catch (err) {
        console.warn('[SW] Registration failed:', err);
      }
    };

    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW);
    }
  }, []);

  /* ── Trigger install ──────────────────────────────────────── */
  const triggerInstall = useCallback(async () => {
    const prompt = promptRef.current || installPrompt;

    if (prompt) {
      // Native install prompt available
      setIsInstalling(true);
      try {
        await prompt.prompt();
        const { outcome } = await prompt.userChoice;
        console.log('[PWA] User choice:', outcome);
        if (outcome === 'accepted') {
          setInstallPrompt(null);
          promptRef.current = null;
        }
      } catch (err) {
        console.warn('[PWA] Install prompt error:', err);
      } finally {
        setIsInstalling(false);
      }
    } else {
      // No native prompt – show manual instructions
      setShowManual(true);
    }
  }, [installPrompt]);

  const closeManual  = useCallback(() => setShowManual(false),  []);
  const closeSuccess = useCallback(() => setShowSuccess(false), []);

  return {
    installPrompt,
    isInstalled,
    isInstalling,
    showManual,
    showSuccess,
    swRegistered,
    triggerInstall,
    closeManual,
    closeSuccess,
    canInstall: !!installPrompt,
  };
}
