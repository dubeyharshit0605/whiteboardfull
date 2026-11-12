const mongoose = require("mongoose");

module.exports = () => {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
  return mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
};
