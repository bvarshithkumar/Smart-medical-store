import fs from 'fs';
import path from 'path';

const users = fs.readdirSync('C:\\Users');
console.log('Users list:', users);
for (const u of users) {
  console.log(`User "${u}" length: ${u.length}`);
  console.log('Char codes:', [...u].map(c => c.charCodeAt(0)));
}
console.log('Current Cwd:', process.cwd());
console.log('Cwd char codes:', [...process.cwd()].map(c => c.charCodeAt(0)));
