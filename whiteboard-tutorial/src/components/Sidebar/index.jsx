import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import "./index.min.css";
import { Link, useNavigate } from "react-router-dom";
import boardContext from "../../store/board-context";
import { getToken } from "../../utils/api";

const api = axios.create({ baseURL: "/api/canvas", timeout: 20000 });
api.interceptors.request.use(config => {
  config.headers.Authorization = "Bearer " + getToken();
  return config;
});

export default function Sidebar() {
  const [expanded, setExpanded] = useState(false);
  const [canvases, setCanvases] = useState([]);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const { canvasId } = useContext(boardContext);
  const navigate = useNavigate();
  const token = getToken();
  const active = canvases.find(canvas => canvas._id === canvasId);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    api.get("/list", { signal: controller.signal }).then(({ data }) => {
      setCanvases(data);
    }).catch(error => {
      if (!controller.signal.aborted) setMessage(error.response?.data?.error || "Could not load your canvases.");
    });
    return () => controller.abort();
  }, [token]);

  async function createCanvas() {
    try {
      const { data } = await api.post("/create");
      navigate("/" + data.canvasId);
    } catch (error) {
      setMessage(error.response?.data?.error || "Could not create a canvas.");
    }
  }

  async function deleteCanvas(id) {
    if (!window.confirm("Permanently delete this canvas?")) return;
    try {
      await api.delete("/delete/" + id);
      if (id === canvasId) navigate("/");
      else setCanvases(items => items.filter(canvas => canvas._id !== id));
    } catch (error) {
      setMessage(error.response?.data?.error || "Could not delete this canvas.");
    }
  }

  async function shareCanvas(event) {
    event.preventDefault();
    try {
      const { data } = await api.put("/share/" + canvasId, { email });
      setMessage(data.message);
      setEmail("");
    } catch (error) {
      setMessage(error.response?.data?.error || "Could not share this canvas.");
    }
  }

  return (
    <aside className={expanded ? "sidebar sidebar-expanded" : "sidebar"} aria-label="Your canvases">
      <button className="sidebar-toggle" aria-expanded={expanded} aria-controls="saved-canvases"
        onClick={() => setExpanded(open => !open)}>{expanded ? "Close boards" : "Boards"}</button>
      <div className="sidebar-content" id="saved-canvases">
      <button className="create-button" onClick={createCanvas} disabled={!token}>
        + Create New Canvas
      </button>
      <ul className="canvas-list">
        {canvases.map(canvas => (
          <li key={canvas._id} className={canvas._id === canvasId ? "canvas-item selected" : "canvas-item"}>
            <Link className="canvas-name" to={"/" + canvas._id}>{canvas._id}</Link>
            {canvas.isOwner && <button className="delete-button" onClick={() => deleteCanvas(canvas._id)}>Delete</button>}
          </li>
        ))}
      </ul>
      {active?.isOwner && (
        <form className="share-container" onSubmit={shareCanvas}>
          <input type="email" aria-label="Collaborator email" placeholder="Enter the email"
            value={email} onChange={event => setEmail(event.target.value)} required />
          <button className="share-button">Share</button>
        </form>
      )}
      {message && <p role="status">{message}</p>}
      {token ? (
        <button className="auth-button logout-button" onClick={() => {
          localStorage.removeItem("whiteboard_user_token");
          navigate("/");
          setCanvases([]);
        }}>Logout</button>
      ) : <Link className="auth-button login-button" to="/login">Login</Link>}
      </div>
    </aside>
  );
}
