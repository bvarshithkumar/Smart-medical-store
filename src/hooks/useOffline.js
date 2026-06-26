/**
 * useOffline – Reactive online/offline detection hook
 * Sri Venkateshwara Medical Store
 */
import { useState, useEffect, useCallback } from 'react';

/* Features that require an active internet connection */
export const ONLINE_REQUIRED_FEATURES = {
  UPLOAD_PRESCRIPTION:  'Upload Prescription',
  SCHEDULE_PICKUP:      'Schedule Pickup',
  TRACK_ORDER:          'Track Order',
  PAYMENTS:             'Payments',
  LOGIN:                'Login',
  WHATSAPP_PHARMACIST:  'WhatsApp Pharmacist',
  REPEAT_ORDER:         'Repeat Order',
};

export function useOffline() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const [showRestoreToast, setShowRestoreToast] = useState(false);
  const [offlineModal, setOfflineModal] = useState({ show: false, feature: '' });

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setOfflineModal({ show: false, feature: '' });
      if (wasOffline) {
        setShowRestoreToast(true);
        setTimeout(() => setShowRestoreToast(false), 4000);
      }
      setWasOffline(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  /**
   * Guard: call before any action that requires internet.
   * Returns true if online (action should proceed).
   * Returns false and shows modal if offline.
   */
  const requireOnline = useCallback((featureName) => {
    if (navigator.onLine) return true;
    setOfflineModal({ show: true, feature: featureName || 'This feature' });
    return false;
  }, []);

  const closeOfflineModal = useCallback(() => {
    setOfflineModal({ show: false, feature: '' });
  }, []);

  const retryConnection = useCallback(() => {
    const online = navigator.onLine;
    if (online) {
      setIsOnline(true);
      setOfflineModal({ show: false, feature: '' });
      setShowRestoreToast(true);
      setTimeout(() => setShowRestoreToast(false), 4000);
    }
    return online;
  }, []);

  const closeRestoreToast = useCallback(() => setShowRestoreToast(false), []);

  return {
    isOnline,
    wasOffline,
    showRestoreToast,
    offlineModal,
    requireOnline,
    closeOfflineModal,
    retryConnection,
    closeRestoreToast,
  };
}
