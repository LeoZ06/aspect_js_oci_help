import "./App.css"
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import RootInstructions from "./components/RootInstructions.jsx";

const BACKEND_API_URL = "https://data-backend.bed.dev";

export default function App() {
  return (
    <Router>
      <nav style={{ padding: "1rem", borderBottom: "1px solid #ccc", fontFamily: "monospace", fontSize: "14px" }}>
        <a href="/">Instructions</a>{" | "}
        <a href="/sets">Sets</a>{" | "}
        <a href="/aliases">Aliases and IDs</a>
      </nav>

      <Routes>
        <Route path="/" element={<RootInstructions backendUrl={BACKEND_API_URL}/>}/>
      </Routes>
    </Router>
  );
}
