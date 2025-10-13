// middleware/auth.js
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

// ตรวจสอบ token
export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader) return res.status(401).json({ message: "No token provided" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Invalid token format" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, username, role }
    next();
  } catch (err) {
    console.error("JWT verification error:", err.message);
    res.status(401).json({ message: "Invalid token" });
  }
}

// ✅ ตรวจสอบสิทธิ์ role
export function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role)
      return res.status(401).json({ message: "No role assigned" });

    if (!roles.includes(req.user.role))
      return res.status(403).json({ message: "Forbidden: insufficient role" });

    next();
  };
}
