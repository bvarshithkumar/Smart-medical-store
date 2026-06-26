import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import ForgotPasswordForm from './ForgotPasswordForm';
import VerifyEmailCard from './VerifyEmailCard';
import ResetPasswordForm from './ResetPasswordForm';
import CompleteGoogleProfileForm from './CompleteGoogleProfileForm';

export default function AuthModal() {
  const { authModal, closeAuthModal } = useAuth();
  const modalRef = useRef(null);

  const isCritical = authModal === 'reset-password' || authModal === 'complete-profile';

  // Prevent scroll on body when modal is open
  useEffect(() => {
    if (authModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [authModal]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (!isCritical) {
          closeAuthModal();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCritical, closeAuthModal]);

  // Trap focus inside modal
  useEffect(() => {
    if (!authModal || !modalRef.current) return;

    const modalElement = modalRef.current;
    const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    
    const getFocusableElements = () => Array.from(modalElement.querySelectorAll(focusableSelectors));

    const handleTab = (e) => {
      if (e.key !== 'Tab') return;
      const elements = getFocusableElements();
      if (elements.length === 0) return;

      const firstEl = elements[0];
      const lastEl = elements[elements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab: loop back to last element if at the first
        if (document.activeElement === firstEl) {
          lastEl.focus();
          e.preventDefault();
        }
      } else {
        // Tab: loop back to first element if at the last
        if (document.activeElement === lastEl) {
          firstEl.focus();
          e.preventDefault();
        }
      }
    };

    // Autofocus first input or close button when modal opens
    const elements = getFocusableElements();
    if (elements.length > 0) {
      const firstInput = elements.find(el => el.tagName === 'INPUT');
      if (firstInput) {
        firstInput.focus();
      } else {
        elements[0].focus();
      }
    }

    modalElement.addEventListener('keydown', handleTab);
    return () => modalElement.removeEventListener('keydown', handleTab);
  }, [authModal]);

  if (!authModal) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isCritical) {
      closeAuthModal();
    }
  };

  const renderContent = () => {
    switch (authModal) {
      case 'login':
        return <LoginForm />;
      case 'register':
        return <RegisterForm />;
      case 'forgot-password':
        return <ForgotPasswordForm />;
      case 'verify-email':
        return <VerifyEmailCard />;
      case 'reset-password':
        return <ResetPasswordForm />;
      case 'complete-profile':
        return <CompleteGoogleProfileForm />;
      default:
        return null;
    }
  };

  return (
    <div 
      className="auth-modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="auth-modal-card" 
        ref={modalRef}
        style={{
          // Extra animations are handled by CSS class triggers
          animation: 'modalScaleIn 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards'
        }}
      >
        {/* Close Button */}
        {!isCritical && (
          <button 
            type="button" 
            className="auth-modal-close-btn"
            onClick={closeAuthModal}
            aria-label="Close authentication modal"
          >
            <X size={18} />
          </button>
        )}

        <div className="auth-modal-body">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
