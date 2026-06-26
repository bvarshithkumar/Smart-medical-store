import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, MapPin, Clock, Calendar, Check, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useReservation } from '../context/ReservationContext';
import { medicineService } from '../services/medicineService';
import { useAuth } from '../context/AuthContext';

const DesktopPickupWidget = () => {
  const { cart, clearCart, getCartCount, getCartTotal, showToast } = useCart();
  const { pickupDate, pickupTime, setPickupSlot, confirmReservation } = useReservation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dateList, setDateList] = useState([]);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');

  // Sync state from ReservationContext if any exists
  useEffect(() => {
    if (pickupTime) {
      setSelectedTimeSlot(pickupTime);
    }
  }, [pickupTime]);

  // Generate 5 days starting today
  useEffect(() => {
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

    // Sync selectedDateIndex based on context pickupDate
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
  }, [pickupDate]);

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
      showToast(`Selected pickup slot: ${formattedDate} at ${time}`, 'OK');
    }
  };

  const handleDateChange = (index) => {
    setSelectedDateIndex(index);
    setSelectedTimeSlot('');
    // Clear time in context, but set date if possible
    const dateObj = dateList[index];
    if (dateObj) {
      const formattedDate = dateObj.dayName === 'Today' || dateObj.dayName === 'Tomorrow'
        ? dateObj.dayName
        : `${dateObj.dayName}, ${dateObj.dayDate} ${dateObj.monthName}`;
      setPickupSlot(formattedDate, '');
    }
  };

  const handleActionClick = async () => {
    if (!selectedTimeSlot) {
      showToast('Please select a pickup time slot first.', 'OK');
      return;
    }

    const dateObj = dateList[selectedDateIndex];
    if (!dateObj) return;

    const formattedDate = dateObj.dayName === 'Today' || dateObj.dayName === 'Tomorrow'
      ? dateObj.dayName
      : `${dateObj.dayName}, ${dateObj.dayDate} ${dateObj.monthName}`;

    const cartCount = getCartCount();
    if (cartCount === 0) {
      showToast('Pickup slot selected! Now add medicines to your cart below.', 'Browse');
      return;
    }

    // Process direct checkout
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
        name: med ? med.name : 'Unknown Medicine'
      };
    }).filter(Boolean);

    const customerName = user?.name || 'Walk-in Customer';
    const phoneNumber = user?.phone || '';
    const dateStr = dateObj.rawDate?.toISOString().split('T')[0];

    try {
      const orderId = await confirmReservation(
        cartItemsPayload,
        totalPrice,
        prepTime,
        formattedDate,
        selectedTimeSlot,
        customerName,
        phoneNumber,
        dateStr
      );
      if (orderId) {
        clearCart();
        navigate(`/confirmation?id=${orderId}`);
      } else {
        showToast('Failed to confirm reservation. Please try again.', 'OK');
      }
    } catch (err) {
      console.error('Reservation confirmation failed from widget:', err);
      showToast(`Error: ${err.message || 'Database insert failed. Please check RLS policies.'}`, 'OK');
    }
  };

  const cartCount = getCartCount();

  return (
    <div className="desktop-pickup-widget">
      <div className="widget-header">
        <div className="widget-header-title">
          <Calendar size={20} className="widget-icon" />
          <h2>Schedule Store Pickup</h2>
        </div>
        <p className="widget-tagline">Select a convenient slot and bypass the queue</p>
      </div>

      <div className="widget-store-info">
        <Store size={16} className="store-icon" />
        <div className="store-text">
          <strong>Sri Venkateshwara Medical Store</strong>
          <span>Kachiguda, Hyderabad</span>
        </div>
      </div>

      {/* Date chips */}
      <div className="widget-section">
        <label className="section-label">Select Date</label>
        <div className="widget-date-scroller">
          {dateList.map((item) => (
            <button
              key={item.index}
              className={`widget-date-card ${item.index === selectedDateIndex ? 'active' : ''}`}
              onClick={() => handleDateChange(item.index)}
            >
              <span className="day-name">{item.dayName}</span>
              <span className="day-date">{item.dayDate}</span>
              <span className="month-name">{item.monthName}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Time slots */}
      <div className="widget-section">
        <label className="section-label">Select Time Slot</label>
        {allTodaySlotsDisabled ? (
          <div className="widget-error-message">
            Today's slots are closed. Please select Tomorrow or another date above.
          </div>
        ) : (
          <div className="widget-time-grid">
            {renderedSlots.map((slot, idx) => {
              if (slot.isDisabled) {
                return (
                  <div key={idx} className="widget-time-slot disabled">
                    {slot.time}
                  </div>
                );
              }
              const isSelected = slot.time === selectedTimeSlot;
              return (
                <button
                  key={idx}
                  className={`widget-time-slot ${isSelected ? 'active' : ''}`}
                  onClick={() => handleSlotChange(slot.time)}
                >
                  {slot.time}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* CTA action */}
      <div className="widget-action-footer">
        {selectedTimeSlot ? (
          <div className="widget-selection-summary">
            <Check size={14} className="check-icon" />
            <span>
              Pickup: <strong>{selectedDateObj?.dayName === 'Today' || selectedDateObj?.dayName === 'Tomorrow' ? selectedDateObj?.dayName : `${selectedDateObj?.dayName}, ${selectedDateObj?.dayDate} ${selectedDateObj?.monthName}`}</strong> at <strong>{selectedTimeSlot}</strong>
            </span>
          </div>
        ) : (
          <div className="widget-selection-prompt">
            Please choose a time slot to continue.
          </div>
        )}

        <button
          className={`widget-cta-btn ${selectedTimeSlot ? 'active' : ''} ${cartCount > 0 ? 'checkout' : ''}`}
          onClick={handleActionClick}
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
        {cartCount > 0 && selectedTimeSlot && (
          <p className="widget-cta-note">Instant reservations are finalized immediately.</p>
        )}
      </div>
    </div>
  );
};

export default DesktopPickupWidget;
