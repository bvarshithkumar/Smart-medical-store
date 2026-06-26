import { jsPDF } from 'jspdf';

/**
 * Shared service to generate Prescription Quote PDF documents.
 */
export const generateQuotePDF = async ({
  action,
  quoteNumber,
  customerName,
  customerPhone,
  prescriptionRef,
  pickupDate,
  pickupTime,
  pharmacistNotes,
  medicines,
  grandTotal
}) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const blue = [37, 99, 235];
  const dark = [31, 41, 55];
  const muted = [107, 114, 128];
  const green = [22, 163, 74];

  // Header — Cross logo
  doc.setFillColor(...blue);
  doc.roundedRect(15, 12, 6, 18, 1, 1, 'F');
  doc.roundedRect(9, 18, 18, 6, 1, 1, 'F');
  doc.setTextColor(...blue);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Sri Venkateshwara Medical Store', 38, 19);
  doc.setTextColor(...muted);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Licensed Pharmacy | Gachibowli, Hyderabad, Telangana', 38, 24);
  doc.text('Phone: +91 99891 78696 | GSTIN: 36AAAAA1111A1Z1', 38, 28);
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(15, 34, 195, 34);

  // Title
  doc.setTextColor(...dark);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('PHARMACY PRESCRIPTION QUOTATION', 15, 43);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...muted);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 148, 43);

  // Info card
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(15, 48, 180, 28, 2, 2, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(15, 48, 180, 28, 2, 2, 'S');

  // Left col
  doc.setFontSize(9);
  doc.setTextColor(...muted);
  doc.text('Quote Number:', 20, 54);
  doc.setTextColor(...blue); doc.setFont('Helvetica', 'bold');
  doc.text(quoteNumber, 52, 54);

  doc.setTextColor(...muted); doc.setFont('Helvetica', 'normal');
  doc.text('Customer:', 20, 60);
  doc.setTextColor(...dark); doc.setFont('Helvetica', 'bold');
  doc.text(customerName || 'Walk-in Customer', 52, 60);

  doc.setTextColor(...muted); doc.setFont('Helvetica', 'normal');
  doc.text('Phone:', 20, 66);
  doc.setTextColor(...dark);
  doc.text(customerPhone || 'N/A', 52, 66);

  doc.setTextColor(...muted);
  doc.text('Prescription Ref:', 20, 72);
  doc.setTextColor(...dark);
  doc.text(prescriptionRef || '—', 52, 72);

  // Right col
  doc.setTextColor(...muted);
  doc.text('Est. Pickup Date:', 115, 54);
  doc.setTextColor(...dark); doc.setFont('Helvetica', 'bold');
  doc.text(pickupDate || '—', 142, 54);

  doc.setTextColor(...muted); doc.setFont('Helvetica', 'normal');
  doc.text('Est. Pickup Time:', 115, 60);
  doc.setTextColor(...blue); doc.setFont('Helvetica', 'bold');
  doc.text(pickupTime || '—', 142, 60);

  doc.setTextColor(...muted); doc.setFont('Helvetica', 'normal');
  doc.text('Status:', 115, 66);
  doc.setTextColor(...green); doc.setFont('Helvetica', 'bold');
  doc.text('Quote Generated', 142, 66);

  // Items table header
  let y = 85;
  doc.setFillColor(243, 244, 246);
  doc.rect(15, y, 180, 8, 'F');
  doc.setTextColor(...dark); doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Check', 18, y + 5.5);
  doc.text('Medicine Name', 35, y + 5.5);
  doc.text('Qty', 122, y + 5.5);
  doc.text('Unit Price', 142, y + 5.5);
  doc.text('Total', 173, y + 5.5);
  y += 8;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  
  const getMedicineDetails = (name) => {
    let brand = 'Generic';
    let genericName = 'Essential Medicine';
    let strength = 'Standard Strength';
    let availability = 'In Stock';
    
    const lowerName = name.toLowerCase();
    if (lowerName.includes('dolo') || lowerName.includes('paracetamol')) {
      brand = 'Micro Labs';
      genericName = 'Paracetamol';
      strength = '650 mg';
    } else if (lowerName.includes('zincovit')) {
      brand = 'Abbott';
      genericName = 'Multivitamins & Minerals';
      strength = 'Standard Strength';
    } else if (lowerName.includes('kof-kure') || lowerName.includes('cough syrup')) {
      brand = 'Kof-Kure Pharma';
      genericName = 'Dextromethorphan + Guaifenesin';
      strength = '100 ml';
    } else if (lowerName.includes('relief-max') || lowerName.includes('pain gel')) {
      brand = 'Relief-Max Therapeutics';
      genericName = 'Diclofenac + Methyl Salicylate';
      strength = '30 gm';
    }
    
    const strengthMatch = name.match(/\b\d+\s*(?:mg|ml|gm|g|mcg)\b/i);
    if (strengthMatch) {
      strength = strengthMatch[0];
    }
    
    return { brand, genericName, strength, availability };
  };

  medicines.forEach((med) => {
    doc.setDrawColor(156, 163, 175);
    doc.setLineWidth(0.3);
    // Draw Checkbox
    doc.rect(21, y + 2.2, 3, 3);

    const details = getMedicineDetails(med.name);

    doc.setTextColor(...dark);
    doc.setFont('Helvetica', 'bold');
    doc.text(med.name.substring(0, 42), 35, y + 4.5);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(...muted);
    doc.text(`${details.brand} | Generic: ${details.genericName} | Strength: ${details.strength} | ${details.availability}`, 35, y + 8.2);
    doc.setFontSize(9);

    doc.setTextColor(...dark);
    doc.text(String(med.qty || med.quantity), 124, y + 6);
    doc.setTextColor(...muted);
    const uPrice = med.unit_price || med.price || 0;
    const tPrice = med.total_price || med.total || (uPrice * (med.qty || med.quantity));
    doc.text(`Rs.${uPrice.toFixed(2)}`, 140, y + 6);
    doc.setTextColor(...dark);
    doc.setFont('Helvetica', 'bold');
    doc.text(`Rs.${tPrice.toFixed(2)}`, 170, y + 6);
    doc.setFont('Helvetica', 'normal');
    y += 12;
  });

  // Grand Total
  y += 4;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...dark);
  doc.text('Grand Total:', 130, y + 5);
  doc.setTextColor(...blue);
  doc.text(`Rs.${grandTotal.toFixed(2)}`, 170, y + 5);

  // Pharmacist Notes
  if (pharmacistNotes) {
    y += 12;
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(15, y, 180, 16, 1, 1, 'F');
    doc.setTextColor(180, 83, 9);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Pharmacist Notes:', 18, y + 5);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(pharmacistNotes.substring(0, 95), 18, y + 10);
    y += 16;
  }

  // Signature and Contact area
  y += 15;
  doc.setDrawColor(229, 231, 235);
  doc.line(15, y, 195, y);
  y += 8;

  doc.setTextColor(...dark);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Pharmacist Signature:', 15, y);
  doc.line(15, y + 10, 65, y + 10);

  doc.text('Store Contact Details:', 115, y);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...muted);
  doc.text('For queries, WhatsApp us at: +91 99891 78696', 115, y + 4.5);
  doc.text('Email: svms@example.com', 115, y + 8.5);

  // Footer
  doc.setFontSize(8);
  doc.text('Thank you for choosing Sri Venkateshwara Medical Store!', 60, 282);

  if (action === 'print') {
    doc.autoPrint();
    const bloburl = doc.output('bloburl');
    if (typeof window !== 'undefined') window.open(bloburl, '_blank');
  } else if (action === 'save') {
    doc.save(`Quote_${quoteNumber}.pdf`);
  }
  return doc;
};
