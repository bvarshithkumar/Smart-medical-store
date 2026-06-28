import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles } from 'lucide-react';
import { medicineService } from '../services/medicineService';

const SearchBar = ({ query: externalQuery, onChange: onExternalChange }) => {
  const [internalQuery, setInternalQuery] = useState('');
  const query = externalQuery !== undefined ? externalQuery : internalQuery;
  const setQuery = onExternalChange !== undefined ? onExternalChange : setInternalQuery;

  const [showModal, setShowModal] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const navigate = useNavigate();
  const searchRef = useRef(null);

  // Load and filter suggestions based on query change
  useEffect(() => {
    let active = true;
    medicineService.getMedicines().then(allMeds => {
      if (!active) return;
      if (query.trim() === '') {
        setSuggestions(allMeds);
      } else {
        const filtered = allMeds.filter(med =>
          med.name.toLowerCase().includes(query.toLowerCase()) ||
          med.brand.toLowerCase().includes(query.toLowerCase()) ||
          med.description.toLowerCase().includes(query.toLowerCase())
        );
        setSuggestions(filtered);
      }
    });
    return () => { active = false; };
  }, [query]);

  // Handle click outside to close the suggestion modal
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowModal(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    setQuery(e.target.value);
  };

  const handleSuggestionClick = (medId) => {
    setShowModal(false);
    setQuery('');
    navigate(`/medicine/${medId}`);
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (suggestions.length > 0 && query.trim() !== '') {
      handleSuggestionClick(suggestions[0].id);
    }
  };

  return (
    <div className="search-container" ref={searchRef}>
      <form onSubmit={handleSearchSubmit} className="search-form">
        <input
          type="text"
          className="search-input"
          placeholder="Search medicines, wellness..."
          value={query}
          onChange={handleInputChange}
          onFocus={() => setShowModal(true)}
          autoComplete="off"
        />
        <button type="submit" className="search-submit-btn" aria-label="Search">
          <Search size={16} />
        </button>
      </form>

      {/* Suggestion Modal Overlay */}
      {showModal && (
        <div 
          className="search-results-modal show" 
          id="search-modal"
          style={{ 
            display: 'block', 
            position: 'absolute', 
            top: '50px', 
            left: 0, 
            right: 0, 
            backgroundColor: 'var(--bg-white)', 
            borderRadius: '16px',
            boxShadow: '0 10px 40px rgba(20, 184, 166, 0.12), 0 2px 10px rgba(0, 0, 0, 0.05)',
            border: '1px solid rgba(20, 184, 166, 0.12)',
            maxHeight: '320px',
            overflowY: 'auto',
            zIndex: 999
          }}
        >
          {suggestions.length > 0 ? (
            <>
              <div className="suggestions-header" style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={12} style={{ color: 'var(--teal-accent)' }} />
                Suggested Medicines
              </div>
              <div className="suggestions-list">
                {suggestions.map((med) => {
                  // Log the image_url for every search result to audit output
                  console.log('[Search] Found result:', med.name, 'image_url:', med.image_url);

                  return (
                    <div
                      key={med.id}
                      className="suggestion-item"
                      onClick={() => handleSuggestionClick(med.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 14px',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-light)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div 
                        className="suggestion-img-wrap" 
                        style={{ 
                          width: '40px', 
                          height: '40px', 
                          backgroundColor: 'rgba(255, 255, 255, 0.03)', 
                          borderRadius: '8px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          padding: '2px',
                          border: '1px solid var(--border-color)',
                          overflow: 'hidden',
                          flexShrink: 0
                        }}
                      >
                        <img 
                          src={med.image_url} 
                          alt={med.name} 
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          onError={(e) => {
                            // Fallback to professional medicine placeholder on error
                            e.target.onerror = null;
                            e.target.src = '/images/cat_medicines.png';
                          }}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span className="suggestion-text" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                            {med.name}
                          </span>
                          {med.prescriptionRequired && (
                            <span 
                              style={{ 
                                fontSize: '9px', 
                                backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                                color: '#f87171', 
                                border: '1px solid rgba(239, 68, 68, 0.2)', 
                                padding: '1px 5px', 
                                borderRadius: '4px', 
                                fontWeight: 700 
                              }}
                            >
                              Rx Required
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {med.brand} · {med.packInfo || 'Pack of 15'}
                        </div>
                      </div>
                      <div style={{ marginLeft: 'auto', fontSize: '13px', fontWeight: 700, color: 'var(--teal-accent)', flexShrink: 0 }}>
                        ₹{med.priceDiscounted.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="search-empty-state" style={{ padding: '24px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: 'var(--accent-red)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', alignSelf: 'center', justifyContent: 'center' }}>
                <Search size={18} />
              </div>
              <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>No medicines found</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>We couldn't find matches for "{query}".</p>
              <button 
                type="button"
                onClick={() => {
                  setQuery('');
                  medicineService.getMedicines().then(list => setSuggestions(list));
                }}
                style={{
                  marginTop: '4px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'var(--primary-color)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '4px 8px'
                }}
              >
                Browse All Medicines
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
