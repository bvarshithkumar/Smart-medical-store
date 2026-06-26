import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Clock, Calendar, Check, X, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useReservation } from '../context/ReservationContext';
import { medicineService } from '../services/medicineService';
import { useAuth } from '../context/AuthContext';

const SchedulerModal = () => {
  const { cart, clearCart, getCartCount, getCartTotal, showToast } = useCart();
  const { 
    isSchedulerOpen, 
    setIsSchedulerOpen, 
    pickupDate, 
    pickupTime, 
    setPickupSlot, 
    confirmReservation,
    latestPrescription
  } = useReservation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dateList, setDateList] = useState([]);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Prefill customer details
  useEffect(() => {
    if (latestPrescription) {
      setCustomerName(latestPrescription.customerName || '');
      setPhoneNumber(latestPrescription.phoneNumber || '');
    } else if (user) {
      setCustomerName(user.name || '');
      setPhoneNumber(user.phone || '');
    }
  }, [latestPrescription, user, isSchedulerOpen]);

  // Sync state from context when modal opens or slot context changes
  useEffect(() => {
    if (isSchedulerOpen) {
      if (pickupTime) {
        setSelectedTimeSlot(pickupTime);
      } else {
        setSelectedTimeSlot('');
      }
    }
  }, [isSchedulerOpen, pickupTime]);

  useEffect(() => {
    // Generate dates
    const dates = [];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      
      let label = daysOfWeek[d.getDay()];
      if (i === 0) label = 'Today';
      else if (i === 1) label = 'Tomorrow';

      dates.push({
        index: i,
        dayName: label,
        dayDate: d.getDate(),
        monthName: months[d.getMonth()],
        year: d.getFullYear(),
        rawDate: d
      });
    }
    setDateList(dates);

    if (pickupDate) {
      const idx = dates.findIndex(d => {
        const fmt = d.dayName === 'Today' || d.dayName === 'Tomorrow'
          ? d.dayName
          : `${d.dayName}, ${d.dayDate} ${d.monthName}`;
        return fmt === pickupDate;
      });
      if (idx !== -1) {
        setSelectedDateIndex(idx);
      }
    }
  }, [isSchedulerOpen, pickupDate]);

  if (!isSchedulerOpen) return null;

  const rawSlots = [
    { time: '9:00 AM', hour: 9 },
    { time: '10:00 AM', hour: 10 },
    { time: '11:00 AM', hour: 11 },
    { time: '12:00 PM', hour: 12 },
    { time: '1:00 PM', hour: 13 },
    { time: '2:00 PM', hour: 14 },
    { time: '3:00 PM', hour: 15 },
    { time: '4:00 PM', hour: 16 },
    { time: '5:00 PM', hour: 17 },
    { time: '6:00 PM', hour: 18 },
    { time: '7:00 PM', hour: 19 },
    { time: '8:00 PM', hour: 20 },
    { time: '9:00 PM', hour: 21 },
  ];

  const selectedDateObj = dateList[selectedDateIndex];
  const now = new Date();
  const isToday = selectedDateObj?.index === 0;

  const renderedSlots = rawSlots.map(slot => {
    let isDisabled = false;
    if (isToday && now.getHours() >= slot.hour) {
      isDisabled = true;
    }
    return { ...slot, isDisabled };
  });

  const allTodaySlotsDisabled = isToday && renderedSlots.every(slot => slot.isDisabled);

  const handleSlotChange = (time) => {
    setSelectedTimeSlot(time);
    const dateObj = dateList[selectedDateIndex];
    if (dateObj) {
      const formattedDate = dateObj.dayName === 'Today' || dateObj.dayName === 'Tomorrow'
        ? dateObj.dayName
        : `${dateObj.dayName}, ${dateObj.dayDate} ${dateObj.monthName}`;
      setPickupSlot(formattedDate, time);
    }
  };

  const handleDateChange = (index) => {
    setSelectedDateIndex(index);
    setSelectedTimeSlot('');
    const dateObj = dateList[index];
    if (dateObj) {
      const formattedDate = dateObj.dayName === 'Today' || dateObj.dayName === 'Tomorrow'
        ? dateObj.dayName
        : `${dateObj.dayName}, ${dateObj.dayDate} ${dateObj.monthName}`;
      setPickupSlot(formattedDate, '');
    }
  };

  const handleConfirmAction = async () => {
    if (!selectedTimeSlot) {
      showToast('Please select a pickup time slot first.', 'OK');
      return;
    }

    const dateObj = dateList[selectedDateIndex];
    if (!dateObj) return;

    if (!customerName.trim()) {
      showToast('Please enter customer name.', 'OK');
      return;
    }
    if (phoneNumber.replace(/\D/g, '').length < 10) {
      showToast('Please enter a valid 10-digit phone number.', 'OK');
      return;
    }

    const formattedDate = dateObj.dayName === 'Today' || dateObj.dayName === 'Tomorrow'
      ? dateObj.dayName
      : `${dateObj.dayName}, ${dateObj.dayDate} ${dateObj.monthName}`;

    const dateStr = dateObj.rawDate.toISOString().split('T')[0];

    const cartCount = getCartCount();
    if (cartCount === 0) {
      setIsSchedulerOpen(false);
      showToast(`Pickup slot locked: ${formattedDate} at ${selectedTimeSlot}`, 'OK');
      return;
    }

    // Direct confirm reservation flow if there are cart items
    const list = await medicineService.getMedicines();
    const medicinesDb = list.reduce((acc, med) => {
      acc[med.id] = med;
      return acc;
    }, {});

    const hasRx = cart.some(item => medicinesDb[item.id]?.requiresPrescription);
    const totalPrice = getCartTotal(medicinesDb);
    const prepTime = hasRx ? '30 mins' : '15 mins';

    const cartItemsPayload = cart.map(item => {
      const med = medicinesDb[item.id];
      return {
        id: item.id,
        qty: item.qty,
        name: med ? med.name : 'Unknown Medicine',
        price: med ? med.priceDiscounted : 0
      };
    }).filter(Boolean);

    try {
      const orderId = await confirmReservation(cartItemsPayload, totalPrice, prepTime, formattedDate, selectedTimeSlot, customerName.trim(), phoneNumber.replace(/\D/g, ''), dateStr);
      if (orderId) {
        clearCart();
        setIsSchedulerOpen(false);
        navigate(`/confirmation?id=${orderId}`);
      } else {
        showToast('Failed to confirm reservation. Please try again.', 'OK');
      }
    } catch (err) {
      console.error('Reservation confirmation failed in modal:', err);
      showToast(`Error: ${err.message || 'Database insert failed. Please check RLS policies.'}`, 'OK');
    }
  };

  const cartCount = getCartCount();

  return (
    <div className="scheduler-modal-overlay" onClick={() => setIsSchedulerOpen(false)}>
      <div className="scheduler-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={() => setIsSchedulerOpen(false)} aria-label="Close modal">
          <X size={20} />
        </button>

        <div className="modal-header">
          <Calendar size={22} className="modal-header-icon" />
          <div>
            <h2>Schedule Store Pickup</h2>
            <p>Skip lines by picking a convenient collection slot</p>
          </div>
        </div>

        <div className="modal-store-info">
          <Store size={16} className="store-icon" />
          <div>
            <strong>Sri Venkateshwara Medical Store</strong>
            <span>Kachiguda, Hyderabad</span>
          </div>
        </div>

        {/* Date Section */}
        <div className="modal-section">
          <label className="section-label">Select Date</label>
          <div className="modal-date-scroller">
            {dateList.map((item) => (
              <button
                key={item.index}
                className={`modal-date-card ${item.index === selectedDateIndex ? 'active' : ''}`}
                onClick={() => handleDateChange(item.index)}
              >
                <span className="day-name">{item.dayName}</span>
                <span className="day-date">{item.dayDate}</span>
                <span className="month-name">{item.monthName}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Time Section */}
        <div className="modal-section">
          <label className="section-label">Select Time Slot</label>
          {allTodaySlotsDisabled ? (
            <div className="modal-error-message">
              Today's slots are closed. Please select Tomorrow or another date above.
            </div>
          ) : (
            <div className="modal-time-grid">
              {renderedSlots.map((slot, idx) => {
                if (slot.isDisabled) {
                  return (
                    <div key={idx} className="modal-time-slot disabled">
                      {slot.time}
                    </div>
                  );
                }
                const isSelected = slot.time === selectedTimeSlot;
                return (
                  <button
                    key={idx}
                    className={`modal-time-slot ${isSelected ? 'active' : ''}`}
                    onClick={() => handleSlotChange(slot.time)}
                  >
                    {slot.time}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Customer Contact Info Section */}
        {selectedTimeSlot && (
          <div className="modal-section" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '16px' }}>
            <label className="section-label">Customer Contact Info</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Customer Name *</label>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Enter full name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: '12px', outline: 'none' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Phone Number *</label>
                <input
                  type="tel"
                  className="search-input"
                  placeholder="Enter 10-digit phone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').substring(0, 10))}
                  style={{ width: '100%', padding: '8px 12px', fontSize: '12px', outline: 'none' }}
                  required
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="modal-action-footer">
          {selectedTimeSlot ? (
            <div className="modal-selection-summary">
              <Check size={14} className="check-icon" />
              <span>
                Selected Slot: <strong>{selectedDateObj?.dayName === 'Today' || selectedDateObj?.dayName === 'Tomorrow' ? selectedDateObj?.dayName : `${selectedDateObj?.dayName}, ${selectedDateObj?.dayDate} ${selectedDateObj?.monthName}`}</strong> at <strong>{selectedTimeSlot}</strong>
              </span>
            </div>
          ) : (
            <div className="modal-selection-prompt">
              Please pick a time slot to lock your scheduled pickup.
            </div>
          )}

          <button
            className={`modal-cta-btn ${selectedTimeSlot ? 'active' : ''} ${cartCount > 0 ? 'checkout' : ''}`}
            onClick={handleConfirmAction}
            disabled={!selectedTimeSlot}
          >
            {cartCount > 0 ? (
              <>
                Confirm Reservation ({cartCount} {cartCount === 1 ? 'item' : 'items'})
                <ArrowRight size={16} />
              </>
            ) : (
              <>
                Lock Pickup Slot
                <Check size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SchedulerModal;
