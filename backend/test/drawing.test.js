const assert = require("node:assert/strict");
const { test } = require("node:test");
const { normalizeElements } = require("../models/drawing");

test("retains supported drawing data and strips renderer internals", () => {
  const line = { id: 0, type: "LINE", x1: 1, y1: 2, x2: 3, y2: 4, stroke: "#abcdef", size: 4 };
  const brush = { id: 1, type: "BRUSH", stroke: "#123456", points: [{ x: 2, y: 3 }] };
  assert.deepEqual(normalizeElements([
    { ...line, size: "4", roughEle: {} }, { ...brush, path: {} },
  ]), [line, brush]);
});

test("rejects malformed and oversized drawings", () => {
  const brush = { id: 1, type: "BRUSH", stroke: "#123456", points: [{ x: 2, y: 3 }] };
  for (const elements of [null, [null], [{ ...brush, points: [] }], [{ ...brush, stroke: [] }],
    [{ ...brush, points: [{ x: "2", y: 3 }] }], Array(3001).fill(brush)]) {
    assert.equal(normalizeElements(elements), null);
  }
});
