export const orderService = {
  getStatusFlow: () => {
    return [
      { index: 0, label: 'Reservation Received', desc: 'Your reservation request has been submitted.' },
      { index: 1, label: 'Prescription Verified', desc: 'Our pharmacist is checking your prescription requirements.' },
      { index: 2, label: 'Medicines Reserved', desc: 'Items are being selected and packed from the shelf inventory.' },
      { index: 3, label: 'Ready For Pickup', desc: 'Your order is packaged and waiting at the counter. Skip waiting queue!' },
      { index: 4, label: 'Completed', desc: 'Medicines picked up and payment processed at the store counter.' }
    ];
  },
  
  getOTCStatusFlow: () => {
    return [
      { index: 0, label: 'Reservation Received', desc: 'Your reservation request has been submitted.' },
      { index: 1, label: 'OTC Verification', desc: 'No prescription needed. Checked for general health standards.' },
      { index: 2, label: 'Medicines Reserved', desc: 'Items are being selected and packed from the shelf inventory.' },
      { index: 3, label: 'Ready For Pickup', desc: 'Your order is packaged and waiting at the counter. Skip waiting queue!' },
      { index: 4, label: 'Completed', desc: 'Medicines picked up and payment processed at the store counter.' }
    ];
  }
};
