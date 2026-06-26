import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const artifactDir = 'C:\\Users\\a  sai  sathwik\\.gemini\\antigravity-ide\\brain\\113f370d-a3f1-4293-9f2f-287cf8dc85b2';
console.log('Artifact Dir exists:', fs.existsSync(artifactDir));

const relativePath = path.relative(artifactDir, __dirname);
console.log('Relative path:', relativePath);

// Let's print out what absolute path works with leading slash
const testPath = '/C:/Users/a  sai  sathwik/.gemini/antigravity-ide/brain/113f370d-a3f1-4293-9f2f-287cf8dc85b2/register_modal_initial_1782468033503.png';
console.log('Test Path exists:', fs.existsSync(testPath.substring(1)));
