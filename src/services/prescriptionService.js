export const prescriptionService = {
  uploadPrescription: (file) => {
    return new Promise((resolve) => {
      // Simulate file upload delay
      setTimeout(() => {
        resolve({
          success: true,
          fileName: file.name,
          extractedItems: ['d0106500-0000-4000-a000-000000000001', 'c00cc000-0000-4000-a000-000000000002'] // Mock items automatically added
        });
      }, 1500);
    });
  }
};
