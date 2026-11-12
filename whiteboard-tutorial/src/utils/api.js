import axios from "axios";

export const getToken = () => localStorage.getItem("whiteboard_user_token");

export function loadCanvas(id, signal) {
  return axios.get("/api/canvas/load/" + id, {
    timeout: 20000, signal, headers: { Authorization: "Bearer " + getToken() },
  });
}

export function saveCanvas(id, revision, elements, signal) {
  return axios.put("/api/canvas/update", {
    canvasId: id, revision,
    elements: elements.map(({ roughEle, path, ...element }) => element),
  }, { timeout: 20000, signal, headers: { Authorization: "Bearer " + getToken() } });
}
