const Canvas = require("../models/canvasModel");
const User = require("../models/userModel");
const { isObjectIdOrHexString } = require("mongoose");
const { normalizeElements } = require("../models/drawing");

const access = (userId) => ({ $or: [{ owner: userId }, { shared: userId }] });
const missing = (res) => res.status(404).json({ error: "Canvas unavailable" });
exports.access = access;

exports.createCanvas = async (req, res) => {
  const canvas = await Canvas.create({ owner: req.userId });
  res.status(201).json({ canvasId: canvas.id });
};

exports.updateCanvas = async (req, res) => {
  const { canvasId, revision, elements } = req.body;
  const drawing = normalizeElements(elements);
  if (!isObjectIdOrHexString(canvasId) || !Number.isSafeInteger(revision) || revision < 0 || !drawing) {
    return res.status(400).json({ error: "Invalid drawing or revision" });
  }
  const filter = { _id: canvasId, ...access(req.userId) };
  const saved = await Canvas.findOneAndUpdate(
    { ...filter, __v: revision }, { $set: { elements: drawing }, $inc: { __v: 1 } }, { new: true },
  ).select("__v");
  if (!saved) {
    if (!await Canvas.exists(filter)) return missing(res);
    return res.status(409).json({ error: "Canvas has changed" });
  }
  req.app.get("io").to(canvasId.toLowerCase()).emit("canvasChanged", saved.__v);
  res.json({ revision: saved.__v });
};

exports.loadCanvas = async (req, res) => {
  const canvas = await Canvas.findOne({ _id: req.params.id, ...access(req.userId) }).lean();
  if (!canvas) return missing(res);
  res.json({ elements: canvas.elements, revision: canvas.__v });
};

exports.shareCanvas = async (req, res) => {
  const { email } = req.body;
  if (typeof email !== "string" || email.length > 254 || !email.trim()) {
    return res.status(400).json({ error: "Enter a valid email" });
  }
  const filter = { _id: req.params.id, owner: req.userId };
  if (!await Canvas.exists(filter)) return missing(res);
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select("_id");
  if (!user) return res.status(404).json({ error: "User with this email not found" });
  if (user.id === req.userId) return res.status(400).json({ error: "You already own this canvas" });
  const result = await Canvas.updateOne(filter, { $addToSet: { shared: user.id } });
  if (!result.matchedCount) return missing(res);
  res.json({ message: "Canvas shared successfully" });
};

exports.unshareCanvas = async (req, res) => {
  const { userIdToRemove } = req.body;
  if (!isObjectIdOrHexString(userIdToRemove)) return res.status(400).json({ error: "Invalid user" });
  const result = await Canvas.updateOne(
    { _id: req.params.id, owner: req.userId }, { $pull: { shared: userIdToRemove } },
  );
  if (!result.matchedCount) return missing(res);
  req.app.get("io").in(req.params.id + ":" + userIdToRemove.toLowerCase()).disconnectSockets();
  res.json({ message: "Canvas unshared successfully" });
};

exports.deleteCanvas = async (req, res) => {
  const result = await Canvas.deleteOne({ _id: req.params.id, owner: req.userId });
  if (!result.deletedCount) return missing(res);
  req.app.get("io").in(req.params.id).disconnectSockets();
  res.json({ message: "Canvas deleted" });
};

exports.getUserCanvases = async (req, res) => {
  const canvases = await Canvas.find(access(req.userId)).select("owner createdAt").sort({ createdAt: -1 });
  res.json(canvases.map(({ id, owner, createdAt }) => ({
    _id: id, isOwner: String(owner) === req.userId, createdAt,
  })));
};
