import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export const hashPassword = async (pwd) => {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return await bcrypt.hash(pwd, salt);
};

export const comparePassword = async (pwd, hash) => {
  return await bcrypt.compare(pwd, hash);
};