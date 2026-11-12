import React from "react";
import { BrowserRouter, Route, Routes, useParams } from "react-router-dom";
import Board from "./components/Board";
import Toolbar from "./components/Toolbar";
import Toolbox from "./components/Toolbox";
import Sidebar from "./components/Sidebar";
import BoardProvider from "./store/BoardProvider";
import ToolboxProvider from "./store/ToolboxProvider";
import Login from "./components/Login";
import Register from "./components/Register";

function HomePage() {
  const { id } = useParams();
  return (
    <BoardProvider key={id || "scratch"} canvasId={id}>
      <ToolboxProvider>
        <main className="app-container">
          <Toolbar />
          <Board />
          <Toolbox />
          <Sidebar />
        </main>
      </ToolboxProvider>
    </BoardProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/:id" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}
