import React, { useState } from 'react';
import { Search, FileText, CreditCard, Calendar, Award, Clock, HelpCircle } from 'lucide-react';

const Faqs = () => {
  const [openIndex, setOpenIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const faqList = [
    {
      question: 'Do I need a prescription to reserve medicines?',
      answer: 'Yes, for medicines marked with a "Prescription Required" badge. You must upload your prescription during reservation or present the physical copy to the pharmacist at the store counter during pickup.',
      icon: FileText,
      iconColor: 'var(--primary-color)'
    },
    {
      question: 'What are the payment methods accepted at the store?',
      answer: 'We support all major payment options at the store counter. You can pay via UPI (GPay, PhonePe, Paytm), Credit/Debit Cards, Cash, or NetBanking.',
      icon: CreditCard,
      iconColor: '#3b82f6'
    },
    {
      question: 'Can I change my scheduled pickup slot later?',
      answer: 'Absolutely! You can modify your scheduled pickup slot at any time by clicking the "Pickup Slot" selector in the top header navbar or clicking "Change" in the cart before completing your reservation.',
      icon: Calendar,
      iconColor: '#a855f7'
    },
    {
      question: 'Is there a service fee for reserving medicines online?',
      answer: 'No, reservation of medicines is 100% free of charge. You only pay for the medicines you select and collect at the store counter, with applicable discounts.',
      icon: Award,
      iconColor: '#eab308'
    },
    {
      question: 'How long will the store hold my reserved medicines?',
      answer: 'We hold your reserved package for up to 12 hours from your scheduled slot. If you cannot make it, please contact the store or reschedule to avoid cancellation.',
      icon: Clock,
      iconColor: '#f97316'
    }
  ];

  const handleToggle = (index) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  const filteredFaqs = faqList.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section className="faqs-section reveal-slide-up" id="faqs">
      <div className="section-header-premium centered">
        <span className="section-badge-pill">FAQ</span>
        <h2 className="section-main-title">Frequently Asked <span>Questions</span></h2>
        <p className="section-desc-lbl">Answers to common queries regarding ordering, prescriptions, and pickups.</p>
      </div>

      {/* FAQ Search Bar */}
      <div className="faq-search-wrapper">
        <div className="faq-search-box">
          <Search size={18} className="faq-search-icon" />
          <input 
            type="text" 
            placeholder="Search questions or answers..." 
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setOpenIndex(null); // Close active accordion during search
            }}
            className="faq-search-input"
          />
        </div>
      </div>

      <div className="faqs-accordion-list reveal-cascade">
        {filteredFaqs.length > 0 ? (
          filteredFaqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            const QuestionIcon = faq.icon;
            return (
              <div key={idx} className={`faq-item-card ${isOpen ? 'active' : ''}`}>
                <button className="faq-question-btn" onClick={() => handleToggle(idx)}>
                  <div className="faq-question-title-row">
                    <div className="faq-q-icon-box" style={{ color: faq.iconColor }}>
                      <QuestionIcon size={16} />
                    </div>
                    <span className="faq-question-text">{faq.question}</span>
                  </div>
                  <span className="faq-toggle-icon">
                    <svg 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      className={`faq-chevron-icon ${isOpen ? 'rotate' : ''}`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                </button>
                <div 
                  className="faq-answer-container" 
                  style={{ 
                    maxHeight: isOpen ? '300px' : '0', 
                    opacity: isOpen ? 1 : 0,
                    paddingBottom: isOpen ? '16px' : '0'
                  }}
                >
                  <p className="faq-answer-content">{faq.answer}</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="faq-no-results">
            <HelpCircle size={32} className="faq-no-results-icon" />
            <h4>No matching questions found</h4>
            <p>Try searching with another keyword like "prescription", "payments", or "pickup".</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default Faqs;
