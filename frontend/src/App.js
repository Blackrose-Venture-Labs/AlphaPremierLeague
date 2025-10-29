import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Leaderboard from "./pages/Leaderboard";
import ModelDetails from "./pages/ModelDetails";
import { ModelsProvider } from "./context/ModelsContext";
import { WebSocketProvider } from "./context/WebSocketContext";
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  return (
    <div className="App">
      <ErrorBoundary>
        <WebSocketProvider>
          <ModelsProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/models" element={<Dashboard />} />
                <Route path="/models/:modelId" element={<ModelDetails />} />
              </Routes>
            </BrowserRouter>
          </ModelsProvider>
        </WebSocketProvider>
      </ErrorBoundary>
    </div>
  );
}

export default App;
