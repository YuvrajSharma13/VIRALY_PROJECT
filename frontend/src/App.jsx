import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import LayoutShell from "./components/LayoutShell";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import History from "./pages/History";
import Templates from "./pages/Templates";
import Analytics from "./pages/Analytics";
import Calendar from "./pages/Calendar";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Entry Point Login Portal */}
        <Route path="/" element={<Login />} />
        
        {/* The Master Shell: Holds the sidebar and animates pages inside it */}
        <Route element={<LayoutShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/history" element={<History />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/analytics" element={<Analytics />} />
        </Route>

        {/* Global Fallback Protection */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}