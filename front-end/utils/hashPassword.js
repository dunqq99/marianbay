import bcrypt from "bcrypt";
const saltRounds = 10;
const hashPassword = async (password) => {
  const result = await bcrypt.hash(password, saltRounds);

  return result;
};
const comparePassword = async (password, userPassword) => {
  const result = await bcrypt.compare(password, userPassword);
  return result;
};
export { hashPassword, comparePassword };
