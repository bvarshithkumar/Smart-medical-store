import React from 'react';
import { useCart } from '../context/CartContext';
import { useOfflineContext } from '../context/OfflineContext';
import { ONLINE_REQUIRED_FEATURES } from '../hooks/useOffline';

const FloatingWhatsApp = () => {
  const { showToast } = useCart();
  const { requireOnline } = useOfflineContext();

  const handleWhatsAppClick = () => {
    if (!requireOnline(ONLINE_REQUIRED_FEATURES.WHATSAPP_PHARMACIST)) return;
    const phoneNumber = '919876543210';
    const message = encodeURIComponent('Hello Sri Venkateshwara Medical Store, I need assistance with ordering medicines.');
    const url = `https://wa.me/${phoneNumber}?text=${message}`;
    
    showToast('Opening WhatsApp to chat with pharmacist...', 'Close');
    window.open(url, '_blank');
  };

  return (
    <div 
      className="whatsapp-btn" 
      onClick={handleWhatsAppClick} 
      aria-label="Chat with Pharmacist on WhatsApp"
      style={{ cursor: 'pointer', zIndex: 999 }}
    >
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.458L0 24zm6.59-4.846c1.6.95 3.498 1.452 5.411 1.453 5.541 0 10.057-4.513 10.06-10.06.002-2.69-1.047-5.216-2.951-7.121C17.26 1.521 14.736.472 12.01.472c-5.548 0-10.067 4.516-10.07 10.067-.001 1.92.501 3.791 1.457 5.4l-.993 3.626 3.714-.974zm11.272-7.7c-.3-.15-1.772-.875-2.047-.975-.276-.1-.476-.15-.676.15-.2.3-.775.975-.95 1.175-.175.2-.35.225-.65.075-.3-.15-1.265-.467-2.41-1.485-.89-.795-1.49-1.77-1.665-2.07-.175-.3-.018-.462.13-.61.135-.133.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.676-1.63-1.01-2.435-.29-.696-.6-.6-.826-.612-.213-.011-.457-.013-.7-.013-.243 0-.64.09-1.07.56-.43.47-1.64 1.6-1.64 3.9s1.67 4.53 1.9 4.84c.23.3 3.284 5.013 7.956 7.027 1.11.48 1.98.767 2.656.98.114.037.227.03.312.018.913-.135 1.772-.72 2.022-1.38.25-.66.25-1.225.175-1.38-.075-.15-.275-.25-.575-.4z"/>
      </svg>
    </div>
  );
};

export default FloatingWhatsApp;
