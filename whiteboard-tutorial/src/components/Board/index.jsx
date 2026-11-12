import { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import rough from "roughjs";
import getStroke from "perfect-freehand";
import boardContext from "../../store/board-context";
import toolboxContext from "../../store/toolbox-context";
import { TOOL_ACTION_TYPES, TOOL_ITEMS } from "../../constants";
import { getSvgPathFromStroke } from "../../utils/element";
import classes from "./index.module.css";

export default function Board() {
  const canvasRef = useRef();
  const textAreaRef = useRef();
  const [viewport, setViewport] = useState(() => [window.innerWidth, window.innerHeight]);
  const {
    elements, toolActionType, boardMouseDownHandler, boardMouseMoveHandler,
    boardMouseUpHandler, textAreaBlurHandler, undo, redo, locked, syncError,
  } = useContext(boardContext);
  const { toolboxState } = useContext(toolboxContext);
  const writing = toolActionType === TOOL_ACTION_TYPES.WRITING;
  const text = writing && elements.at(-1);

  useEffect(() => {
    const resize = () => setViewport([window.innerWidth, window.innerHeight]);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    const handleKey = (event) => {
      if (writing || !(event.ctrlKey || event.metaKey) || /INPUT|TEXTAREA/.test(event.target.tagName)) return;
      if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [writing, undo, redo]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    const renderer = rough.canvas(canvas);
    for (const element of elements) {
      if (element.type === TOOL_ITEMS.BRUSH) {
        context.fillStyle = element.stroke;
        context.fill(new Path2D(getSvgPathFromStroke(getStroke(element.points))));
      } else if (element.type === TOOL_ITEMS.TEXT) {
        context.textBaseline = "top";
        context.font = element.size + "px Caveat";
        context.fillStyle = element.stroke;
        context.fillText(element.text, element.x1, element.y1);
      } else {
        renderer.draw(element.roughEle);
      }
    }
  }, [elements, viewport]);

  useLayoutEffect(() => {
    if (writing) textAreaRef.current?.focus();
  }, [writing]);

  return (
    <>
      {syncError && <p role="alert" className={classes.syncError}>{syncError}</p>}
      {text && (
        <textarea ref={textAreaRef} aria-label="Canvas text" maxLength={2000}
          className={classes.textElementBox}
          style={{ top: text.y1, left: text.x1, fontSize: text.size + "px", color: text.stroke }}
          onBlur={event => textAreaBlurHandler(event.target.value)}
        />
      )}
      <canvas ref={canvasRef} id="canvas" aria-label="Drawing canvas"
        width={viewport[0]} height={viewport[1]} style={{ touchAction: "none" }}
        onPointerDown={event => {
          if (locked || event.button !== 0 || !event.isPrimary ||
              toolActionType !== TOOL_ACTION_TYPES.NONE) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          boardMouseDownHandler(event, toolboxState);
        }}
        onPointerMove={event => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) boardMouseMoveHandler(event);
        }}
        onLostPointerCapture={boardMouseUpHandler}
      />
    </>
  );
}
