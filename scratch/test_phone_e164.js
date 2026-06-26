import { usePhoneInput, defaultCountries, parseCountry } from 'react-international-phone';
// Let's test the helper functions directly since we are in node environment
console.log('defaultCountries length:', defaultCountries.length);
const parsedIndia = parseCountry(defaultCountries.find(c => c[1] === 'in'));
console.log('Parsed India:', parsedIndia);
