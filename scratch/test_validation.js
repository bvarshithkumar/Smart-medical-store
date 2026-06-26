import { parsePhoneNumberFromString } from 'libphonenumber-js';

const testNum1 = parsePhoneNumberFromString('+919876543210');
console.log('Test +919876543210 validity:', testNum1 ? testNum1.isValid() : false);

const testNum2 = parsePhoneNumberFromString('+9112345');
console.log('Test +9112345 validity:', testNum2 ? testNum2.isValid() : false);

const testNum3 = parsePhoneNumberFromString('9876543210', 'IN');
console.log('Test 9876543210 with IN validity:', testNum3 ? testNum3.isValid() : false);
