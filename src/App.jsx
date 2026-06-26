import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { ReservationProvider } from './context/ReservationContext';
import { NotificationProvider } from './context/NotificationContext';
import { OfflineProvider } from './context/OfflineContext';

// Components
import PageLoader from './components/PageLoader';
import PWAInstallModal from './components/PWAInstallModal';
import PWASuccessToast from './components/PWASuccessToast';
import OfflineBanner from './components/OfflineBanner';
import OfflineRequiredModal from './components/OfflineRequiredModal';
import ConnectionRestoredToast from './components/ConnectionRestoredToast';
import CartToastContainer from './components/CartToastContainer';

// Pages
import Home from './pages/Home';
import MedicineDetails from './pages/MedicineDetails';
import ReservationCart from './pages/ReservationCart';
import PickupSchedule from './pages/PickupSchedule';
import Confirmation from './pages/Confirmation';
import Tracking from './pages/Tracking';
import Profile from './pages/Profile';
import MyReservations from './pages/MyReservations';
import MyPrescriptions from './pages/MyPrescriptions';
import AuthCallback from './pages/AuthCallback';
import FloatingPharmacist from './components/FloatingPharmacist';
import RealTimeActivity from './components/RealTimeActivity';
import ProtectedRoute from './components/ProtectedRoute';
import AuthModal from './components/auth/AuthModal';

// Admin Panel (completely isolated)
import AdminApp from './admin/AdminApp';

/* ── PWA Context exposed via window so Navbar can call it ─── */
let _pwaInstallTrigger = null;
export const getPWATrigger = () => _pwaInstallTrigger;

const AppContent = () => {
  const { toast, hideToast } = useCart();
  const [isLoading, setIsLoading] = useState(true);
  const { openLogin, openRegister, openForgotPassword, openResetPassword, openCompleteProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const authCallback = params.get('auth_callback');
    const authType = params.get('auth');
    const verified = params.get('verified');
    const reset = params.get('reset');

    if (authCallback === 'true') {
      const newParams = new URLSearchParams(params);
      newParams.delete('auth_callback');
      const searchStr = newParams.toString() ? '?' + newParams.toString() : '';
      navigate('/auth/callback' + searchStr + location.hash, { replace: true });
      return;
    }

    if (verified === 'true') {
      openLogin();
      window.history.replaceState({}, '', window.location.pathname);
    } else if (reset === 'true') {
      openResetPassword();
      window.history.replaceState({}, '', window.location.pathname);
    } else if (authType === 'login') {
      const from = params.get('from');
      openLogin(from);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (authType === 'register') {
      const from = params.get('from');
      openRegister(from);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (authType === 'forgot-password') {
      const from = params.get('from');
      openForgotPassword(from);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (authType === 'complete-profile') {
      const from = params.get('from');
      openCompleteProfile(from);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [location.search, navigate, openLogin, openRegister, openForgotPassword, openResetPassword, openCompleteProfile]);

  /* ── PWA State ──────────────────────────────────────────── */
  const [pwaPrompt,    setPwaPrompt]  = useState(null);
  const [showManual,   setShowManual] = useState(false);
  const [showSuccess,  setShowSuccess] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const promptRef = React.useRef(null);

  // Capture beforeinstallprompt
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      promptRef.current = e;
      setPwaPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Track successful installation
  useEffect(() => {
    const handler = () => {
      setPwaPrompt(null);
      promptRef.current = null;
      setShowManual(false);
      setShowSuccess(true);
    };
    window.addEventListener('appinstalled', handler);
    return () => window.removeEventListener('appinstalled', handler);
  }, []);

  // Register Service Worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const register = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
        console.log('[SW] Registered successfully');
      } catch (err) {
        console.warn('[SW] Registration failed:', err);
      }
    };
    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register);
    }
  }, []);

  // Trigger install handler – exposed globally for Navbar
  const triggerInstall = useCallback(async () => {
    const prompt = promptRef.current || pwaPrompt;
    if (prompt) {
      setIsInstalling(true);
      try {
        await prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === 'accepted') {
          setPwaPrompt(null);
          promptRef.current = null;
        }
      } catch (err) {
        console.warn('[PWA] Install prompt error:', err);
      } finally {
        setIsInstalling(false);
      }
    } else {
      setShowManual(true);
    }
  }, [pwaPrompt]);

  // Expose to window so Navbar can call it without prop drilling
  useEffect(() => {
    _pwaInstallTrigger = triggerInstall;
    window.__svmsTriggerInstall = triggerInstall;
    return () => { window.__svmsTriggerInstall = null; };
  }, [triggerInstall]);

  return (
    <>
      {isLoading && <PageLoader onComplete={() => setIsLoading(false)} />}

      {/* ── Premium top-right cart notifications ── */}
      <CartToastContainer />

      {/* ── Offline UI Layer (always rendered, shows/hides based on state) ── */}
      <OfflineBanner />
      <OfflineRequiredModal />
      <ConnectionRestoredToast />

      <div className={isLoading ? 'app-content-loading' : 'app-content-loaded'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/medicine/:id" element={<MedicineDetails />} />
          <Route path="/cart" element={<ReservationCart />} />
          <Route path="/pickup" element={<PickupSchedule />} />
          <Route path="/confirmation" element={<Confirmation />} />
          <Route path="/tracking" element={<Tracking />} />
          <Route path="/login" element={<Navigate to="/?auth=login" replace />} />
          <Route path="/register" element={<Navigate to="/?auth=register" replace />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reservations"
            element={
              <ProtectedRoute>
                <MyReservations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-prescriptions"
            element={
              <ProtectedRoute>
                <MyPrescriptions />
              </ProtectedRoute>
            }
          />
          {/* OAuth callback — handles Google redirect, no auth guard needed */}
          <Route path="/auth/callback" element={<AuthCallback />} />
          {/* Profile completion redirects to home with modal trigger */}
          <Route path="/complete-profile" element={<Navigate to="/?auth=complete-profile" replace />} />
          <Route path="/verify-otp" element={<Navigate to="/?auth=login" replace />} />
          <Route path="/forgot-password" element={<Navigate to="/?auth=forgot-password" replace />} />
          {/* Admin Panel – fully isolated, own auth & state */}
          <Route path="/admin/*" element={<AdminApp />} />
          {/* Fallback to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {/* Global Floating Ask Pharmacist FAB & Modal */}
      {!isLoading && <FloatingPharmacist />}

      {/* Floating Real-Time Activity notification widget */}
      {!isLoading && <RealTimeActivity />}

      {/* PWA Manual Install Modal */}
      {showManual && <PWAInstallModal onClose={() => setShowManual(false)} />}

      {/* PWA Success Toast */}
      {showSuccess && <PWASuccessToast onClose={() => setShowSuccess(false)} />}

      {/* Floating Toast Notification Container */}
      <div className={`toast-container ${toast.show ? 'show' : ''}`} id="toast">
        <span className="toast-msg">{toast.message}</span>
        <span
          className="toast-action"
          onClick={() => {
            if (toast.callback) toast.callback();
            hideToast();
          }}
          style={{ cursor: 'pointer' }}
        >
          {toast.actionText}
        </span>
      </div>

      {!isLoading && <AuthModal />}
    </>
  );
};

const App = () => {
  return (
    <OfflineProvider>
      <AuthProvider>
        <CartProvider>
          <NotificationProvider>
            <ReservationProvider>
              <Router>
                <AppContent />
              </Router>
            </ReservationProvider>
          </NotificationProvider>
        </CartProvider>
      </AuthProvider>
    </OfflineProvider>
  );
};

export default App;
