const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const JWT_ACCESSTOKEN_EXPIRED = process.env.JWT_ACCESSTOKEN_EXPIRED;
const JWT_REFRESHTOKEN_EXPIRED = process.env.JWT_REFRESHTOKEN_EXPIRED;

module.exports = {
  JWT_SECRET_KEY,
  JWT_ACCESSTOKEN_EXPIRED,
  JWT_REFRESHTOKEN_EXPIRED,
};
