import React from 'react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, X, Check, Plus } from 'lucide-react';

const CartToastContainer = () => {
  const { cartNotifications, dismissCartNotification } = useCart();
  const navigate = useNavigate();

  if (cartNotifications.length === 0) return null;

  return (
    <div className="cart-toast-container" aria-live="polite" aria-label="Cart notifications">
      {cartNotifications.map(notification => (
        <div
          key={notification.id}
          className={`cart-toast cart-toast--${notification.type}`}
          role="status"
        >
          {/* Icon */}
          <div className="cart-toast__icon">
            {notification.type === 'quantity' ? (
              <Plus size={14} strokeWidth={3} />
            ) : (
              <Check size={14} strokeWidth={3} />
            )}
          </div>

          {/* Message */}
          <div className="cart-toast__body">
            <p className="cart-toast__message">{notification.message}</p>
          </div>

          {/* View Cart button */}
          <button
            className="cart-toast__action"
            onClick={() => {
              dismissCartNotification(notification.id);
              navigate('/cart');
            }}
            aria-label="View cart"
          >
            <ShoppingCart size={13} />
            <span>View</span>
          </button>

          {/* Dismiss */}
          <button
            className="cart-toast__dismiss"
            onClick={() => dismissCartNotification(notification.id)}
            aria-label="Dismiss notification"
          >
            <X size={13} />
          </button>

          {/* Progress bar */}
          <div className="cart-toast__progress" />
        </div>
      ))}
    </div>
  );
};

export default CartToastContainer;
