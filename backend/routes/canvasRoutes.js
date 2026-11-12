const express = require("express");
const { isObjectIdOrHexString } = require("mongoose");
const canvas = require("../controllers/canvasController");
const { authMiddleware } = require("../middlewares/authMiddleware");

const router = express.Router();
const handle = (fn) => (req, res, next) => fn(req, res).catch(next);

router.use(authMiddleware);
router.param("id", (req, res, next, id) => {
  if (!isObjectIdOrHexString(id)) return res.status(400).json({ error: "Invalid canvas" });
  req.params.id = id.toLowerCase();
  next();
});
router.post("/create", handle(canvas.createCanvas));
router.put("/update", handle(canvas.updateCanvas));
router.get("/load/:id", handle(canvas.loadCanvas));
router.put("/share/:id", handle(canvas.shareCanvas));
router.put("/unshare/:id", handle(canvas.unshareCanvas));
router.delete("/delete/:id", handle(canvas.deleteCanvas));
router.get("/list", handle(canvas.getUserCanvases));

module.exports = router;
