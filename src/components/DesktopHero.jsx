import React from 'react';
import { ShieldCheck, Calendar, FileText, Search, Tag } from 'lucide-react';
import { useReservation } from '../context/ReservationContext';
import { useCart } from '../context/CartContext';

const DesktopHero = () => {
  const { setIsSchedulerOpen, pickupDate, pickupTime } = useReservation();
  const { showToast } = useCart();

  const handleUploadPrescription = () => {
    showToast("Prescription upload initiated! Please select files from your computer.", "OK");
  };

  const handleSearchFocus = () => {
    const navSearch = document.querySelector('.desktop-search-bar input');
    if (navSearch) {
      navSearch.focus();
      showToast("Use the main search bar in the header to search our medicine catalog!", "OK");
    }
  };

  return (
    <div className="desktop-hero-banner">
      <div className="hero-main-container">
        
        {/* Left Side: Search and Actions */}
        <div className="hero-left-col">
          <div className="hero-badge">
            <ShieldCheck size={14} />
            <span>Verified Neighborhood Pharmacy Counter</span>
          </div>
          
          <h1 className="hero-title">
            Reserve Medicines Online & <br />
            <span>Pick Up in 15 Minutes</span>
          </h1>
          
          <p className="hero-subtitle">
            SVMS Pharmacy makes scheduled pickups simple. Reserve your medicines, choose a pickup slot, and pay at store counter.
          </p>

          {/* Search medicines prompt */}
          <div className="hero-search-prompt" onClick={handleSearchFocus}>
            <Search size={18} className="search-icon-hero" />
            <span className="search-placeholder-text">Search medicines, wellness drugs, diabetes care...</span>
            <button className="hero-search-btn">Search</button>
          </div>

          {/* Core interactive action cards */}
          <div className="hero-quick-cards">
            <button className="hero-action-card highlight" onClick={handleUploadPrescription}>
              <div className="card-icon-wrap rx">
                <FileText size={20} />
              </div>
              <div className="card-text-wrap">
                <h4>Upload Prescription</h4>
                <p>We'll package and schedule it</p>
              </div>
            </button>

            <button className="hero-action-card highlight" onClick={() => setIsSchedulerOpen(true)}>
              <div className="card-icon-wrap pickup">
                <Calendar size={20} />
              </div>
              <div className="card-text-wrap">
                <h4>Schedule Pickup</h4>
                <p>{pickupDate && pickupTime ? `${pickupDate}, ${pickupTime}` : 'Choose slot to skip queue'}</p>
              </div>
            </button>
          </div>
        </div>

        {/* Right Side: Offers & CSS Graphic */}
        <div className="hero-right-col">
          <div className="featured-offers-panel">
            <h3 className="offers-title">
              <Tag size={14} />
              Featured Pharmacy Offers
            </h3>
            
            <div className="offer-list">
              <div className="offer-item">
                <div className="offer-discount">₹30 OFF</div>
                <div className="offer-details">
                  <strong>First Pickup Order</strong>
                  <span>Reserve medicines and save instantly</span>
                </div>
              </div>
              <div className="offer-item">
                <div className="offer-discount">15% OFF</div>
                <div className="offer-details">
                  <strong>Wellness Categories</strong>
                  <span>On diabetes monitoring & baby care</span>
                </div>
              </div>
              <div className="offer-item">
                <div className="offer-discount">FREE</div>
                <div className="offer-details">
                  <strong>Talk to Pharmacist</strong>
                  <span>Get dosage consultations instantly</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="hero-illustration-widescreen">
            <div className="illustration-blob blob-1"></div>
            <div className="illustration-blob blob-2"></div>
            
            <div className="floating-card med-illust-card">
              <span className="illust-badge otc">OTC</span>
              <div className="illust-icon">💊</div>
              <strong>Medicine Strip</strong>
              <span>Prepared & Sealed</span>
            </div>

            <div className="floating-card pickup-illust-card">
              <div className="illust-icon">🏪</div>
              <div>
                <strong>Counter pickup</strong>
                <span>Ready in 15 mins</span>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default DesktopHero;
