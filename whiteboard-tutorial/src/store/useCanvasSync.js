import { useEffect, useRef, useState } from "react";
import { BOARD_ACTIONS, TOOL_ACTION_TYPES, TOOL_ITEMS } from "../constants";
import { getToken, loadCanvas, saveCanvas } from "../utils/api";
import { createElement } from "../utils/element";
import { connectCanvas } from "../utils/socket";

function drawable(element) {
  if (element.type === TOOL_ITEMS.BRUSH || element.type === TOOL_ITEMS.TEXT) return element;
  return createElement(element.id, element.x1, element.y1, element.x2, element.y2, element);
}

export default function useCanvasSync(id, state, dispatch) {
  const [refresh, setRefresh] = useState(1);
  const [loadedRefresh, setLoadedRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const revision = useRef(null);
  const savedEdit = useRef(0);
  const lifetime = useRef(null);
  const idle = state.toolActionType === TOOL_ACTION_TYPES.NONE;
  const refreshNeeded = refresh !== loadedRefresh;

  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    const token = getToken();
    if (!id || !token) return () => controller.abort();
    const socket = connectCanvas(id, token);
    const reload = () => setRefresh(value => value + 1);
    socket.on("connect", reload);
    socket.on("canvasChanged", (nextRevision) => {
      if (nextRevision > revision.current) reload();
    });
    socket.on("disconnect", (reason) => {
      if (reason === "io server disconnect") reload();
    });
    socket.connect();
    return () => {
      controller.abort();
      socket.disconnect();
    };
  }, [id]);

  useEffect(() => {
    if (!id || !idle || busy || error) return;
    const signal = lifetime.current.signal;
    if (state.edit !== savedEdit.current && revision.current !== null) {
      const edit = state.edit;
      setBusy(true);
      saveCanvas(id, revision.current, state.elements, signal).then(({ data }) => {
        if (signal.aborted) return;
        revision.current = data.revision;
        savedEdit.current = edit;
      }).catch((failure) => {
        if (signal.aborted) return;
        setError(failure.response?.status === 409
          ? "Someone saved a newer version. Your changes are still here. Export them before reloading."
          : "This drawing could not be saved. Export it before reloading.");
      }).finally(() => { if (!signal.aborted) setBusy(false); });
      return;
    }
    if (!refreshNeeded) return;
    setBusy(true);
    loadCanvas(id, signal).then(({ data }) => {
      if (signal.aborted) return;
      if (revision.current !== data.revision) {
        revision.current = data.revision;
        dispatch({ type: BOARD_ACTIONS.SET_INITIAL_ELEMENTS, payload: {
          elements: data.elements.map(drawable),
        } });
      }
      setLoadedRefresh(refresh);
    }).catch((failure) => {
      if (signal.aborted) return;
      setError([401, 404].includes(failure.response?.status)
        ? "This canvas is unavailable. Check your account or ask the owner to share it."
        : "This canvas could not be loaded.");
    }).finally(() => { if (!signal.aborted) setBusy(false); });
  }, [id, idle, busy, error, refresh, refreshNeeded, state.edit, state.elements, dispatch]);

  return {
    locked: Boolean(id && (error || busy || refreshNeeded || state.edit !== savedEdit.current)),
    error,
  };
}
