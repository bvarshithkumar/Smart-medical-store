import React from 'react';

const Footer = () => {
  return (
    <footer className="app-footer" id="footer" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Visual Pattern & Glow Overlays */}
      <div className="footer-pattern-overlay" aria-hidden="true"></div>
      <div className="footer-ambient-glow" aria-hidden="true"></div>

      <div className="footer-top-grid" style={{ position: 'relative', zIndex: 1 }}>
        {/* Column 1: About */}
        <div className="footer-col-about">
          <div className="footer-logo">
            <div className="footer-logo-icon">SV</div>
            <div className="footer-logo-text">
              Sri Venkateshwara
              <span>Medical Store</span>
            </div>
          </div>
          <p className="footer-about-desc">
            Your trusted neighborhood pharmacy for genuine medicines, health devices, baby products, and daily wellness essentials. Providing online reservations and scheduled pickups since 2010.
          </p>
          <div className="drug-licenses">
            <div className="license-badge">Drug License No: HYD-23456-A</div>
            <div className="license-badge">Form 20B/21B Registered</div>
          </div>
        </div>

        {/* Column 2: Categories */}
        <div className="footer-col-links">
          <h4 className="footer-col-title">Shop Categories</h4>
          <ul className="footer-links-list">
            <li><a href="#categories">Prescription Medicines</a></li>
            <li><a href="#categories">Over-the-Counter (OTC)</a></li>
            <li><a href="#categories">Wellness & Immunity</a></li>
            <li><a href="#categories">Health Monitoring Devices</a></li>
            <li><a href="#categories">Baby & Mother Care</a></li>
          </ul>
        </div>

        {/* Column 3: Our Services */}
        <div className="footer-col-links">
          <h4 className="footer-col-title">Our Services</h4>
          <ul className="footer-links-list">
            <li><a href="#upload-rx">Upload Prescription</a></li>
            <li><a href="#popular-medicines">Reserve Medicines</a></li>
            <li><a href="#why-choose-us">Scheduled Pickup Slots</a></li>
            <li><a href="#store-info">Home Inquiry Support</a></li>
            <li><a href="#store-info">Store Location Finder</a></li>
          </ul>
        </div>

        {/* Column 4: Contact & Policies */}
        <div className="footer-col-contact">
          <h4 className="footer-col-title">Get in Touch</h4>
          <p className="footer-contact-info">
            <strong>Address:</strong> Gachibowli, Hyderabad, TS, 500032
          </p>
          <p className="footer-contact-info">
            <strong>Phone:</strong> +91 98765 43210
          </p>
          <p className="footer-contact-info">
            <strong>Email:</strong> contact@svmspharmacy.com
          </p>
          <div className="footer-social-row">
            <a href="https://facebook.com" className="social-icon-btn" aria-label="Facebook">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="social-icon">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </svg>
            </a>
            <a href="https://twitter.com" className="social-icon-btn" aria-label="Twitter">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="social-icon">
                <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
              </svg>
            </a>
            <a href="https://instagram.com" className="social-icon-btn" aria-label="Instagram">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="social-icon">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Trust Badges Row */}
      <div className="footer-trust-row">
        <div className="trust-badge-card">
          <div className="trust-icon-wrapper ring-teal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 11 11 13 15 9" />
            </svg>
          </div>
          <div className="trust-badge-content">
            <h5 className="trust-title">Licensed Pharmacy</h5>
            <p className="trust-desc">Form 20B & 21B Registered</p>
          </div>
        </div>

        <div className="trust-badge-card">
          <div className="trust-icon-wrapper ring-blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="trust-badge-content">
            <h5 className="trust-title">GST Registered</h5>
            <p className="trust-desc">GSTIN: 36APGPD4321A1Z5</p>
          </div>
        </div>

        <div className="trust-badge-card">
          <div className="trust-icon-wrapper ring-teal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="trust-badge-content">
            <h5 className="trust-title">Verified Medicines</h5>
            <p className="trust-desc">100% sourced & validated</p>
          </div>
        </div>

        <div className="trust-badge-card">
          <div className="trust-icon-wrapper ring-purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div className="trust-badge-content">
            <h5 className="trust-title">Secure Payments</h5>
            <p className="trust-desc">SSL Encrypted UPI & Cards</p>
          </div>
        </div>

        <div className="trust-badge-card">
          <div className="trust-icon-wrapper ring-blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <rect x="9" y="11" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          </div>
          <div className="trust-badge-content">
            <h5 className="trust-title">Data Privacy Protected</h5>
            <p className="trust-desc">Secure prescription vaults</p>
          </div>
        </div>

        <div className="trust-badge-card">
          <div className="trust-icon-wrapper ring-purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="trust-badge-content">
            <h5 className="trust-title">Fast Pickup</h5>
            <p className="trust-desc">15 Min Counter Collection</p>
          </div>
        </div>
      </div>

      <div className="footer-bottom-bar">
        <div className="footer-bottom-content">
          <p className="copyright-text">
            © {new Date().getFullYear()} Sri Venkateshwara Medical Store. All Rights Reserved. Designed with Healthcare Excellence.
          </p>
          <div className="payment-gateways">
            <span className="payment-label">We Accept:</span>
            <span className="gateway-badge">UPI</span>
            <span className="gateway-badge">Visa</span>
            <span className="gateway-badge">Mastercard</span>
            <span className="gateway-badge">RuPay</span>
            <span className="gateway-badge">Credit Card</span>
            <span className="gateway-badge">Debit Card</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
