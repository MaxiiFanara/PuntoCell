import { hashPassword } from './bcrypt.js';

const hash = await hashPassword('admin123');
console.log(hash);