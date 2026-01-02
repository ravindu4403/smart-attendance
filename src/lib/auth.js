import jwt from "jsonwebtoken";

// ✅ JWT token එකක් හදන function
export function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
}

// ✅ JWT token එක verify කරන function
export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}
