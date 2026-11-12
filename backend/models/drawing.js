const color = (value) => typeof value === "string" && /^#[\da-f]{6}$/i.test(value);
const coordinate = (value) => Number.isFinite(value) && Math.abs(value) <= 100000;
const shapes = new Set(["LINE", "RECTANGLE", "CIRCLE", "ARROW", "TEXT"]);

function normalizeElements(elements) {
  if (!Array.isArray(elements) || elements.length > 3000) return null;
  const result = [];
  for (const item of elements) {
    if (!item || !Number.isSafeInteger(item.id) || item.id < 0 || !color(item.stroke)) return null;
    const { id, type, stroke, fill, x1, y1, x2, y2, size, text, points } = item;
    if (type === "BRUSH") {
      if (!Array.isArray(points) || !points.length || points.length > 10000 ||
          !points.every(p => p && coordinate(p.x) && coordinate(p.y))) return null;
      result.push({ id, type, stroke, points: points.map(({ x, y }) => ({ x, y })) });
      continue;
    }
    if (!shapes.has(type) || ![x1, y1, x2, y2].every(coordinate) ||
        (typeof size !== "number" && typeof size !== "string") || !Number.isFinite(Number(size)) || Number(size) < 1 || Number(size) > 100 ||
        (fill != null && !color(fill)) ||
        (type === "TEXT" && (typeof text !== "string" || text.length > 2000))) return null;
    result.push({ id, type, stroke, x1, y1, x2, y2, size: Number(size),
      ...(fill != null && { fill }), ...(type === "TEXT" && { text }) });
  }
  return result;
}

exports.normalizeElements = normalizeElements;
