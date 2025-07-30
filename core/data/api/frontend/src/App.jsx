import "./App.css"
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SetsList from "./components/SetsList.js";
import AliasesList from "./components/AliasesList.js";
import RDRList from "./components/RDRList.js";
import RDRDetails from "./components/RDRDetails.js";
import RootInstructions from "./components/RootInstructions.js";

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
        <Route path="/sets" element={<SetsList backendUrl={BACKEND_API_URL}/>}/>
        <Route path="/aliases" element={<AliasesList backendUrl={BACKEND_API_URL}/>}/>
        <Route path="/rdrsets/:param" element={<RDRList backendUrl={BACKEND_API_URL} base="rdrsets"/>}/>
        <Route path="/machines/:param" element={<RDRList backendUrl={BACKEND_API_URL} base="machines"/>}/>
        <Route path="/rcms/:param" element={<RDRList backendUrl={BACKEND_API_URL} base="rcms"/>}/>
        <Route path="/rdrs/:param" element={<RDRDetails backendUrl={BACKEND_API_URL}/>}/>
      </Routes>
    </Router>
  );
}
