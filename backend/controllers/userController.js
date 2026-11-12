const User = require("../models/userModel");
const jwt = require("jsonwebtoken");

function credentials(body) {
  const { email, password } = body || {};
  if (typeof email !== "string" || typeof password !== "string") return null;
  const normalized = email.trim().toLowerCase();
  if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ||
      password.length < 8 || Buffer.byteLength(password) > 72) return null;
  return { email: normalized, password };
}

exports.registerUser = async (req, res, next) => {
  const input = credentials(req.body);
  if (!input) return res.status(400).json({ error: "Enter a valid email and a password between 8 and 72 bytes" });
  try {
    await User.create(input);
    res.status(201).json({ message: "Account created" });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: "Email already registered" });
    next(error);
  }
};

exports.loginUser = async (req, res, next) => {
  const input = credentials(req.body);
  if (!input) return res.status(400).json({ error: "Invalid credentials" });
  try {
    const user = await User.findOne({ email: input.email });
    if (!user || !await user.comparePassword(input.password)) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token });
  } catch (error) {
    next(error);
  }
};

exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select("email");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error) {
    next(error);
  }
};
