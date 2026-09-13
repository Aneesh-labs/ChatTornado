import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./Components/ProtectedRoute";

import Login from "./Pages/Login";

import DashboardLayout from "./Pages/Dashboard/DashboardLayout";

import Home from "./Pages/Dashboard/Home";
import Messages from "./Pages/Dashboard/Messages";
import Profile from "./Pages/Dashboard/Profile";
import Settings from "./Pages/Dashboard/Settings";
import Insights from "./Pages/Dashboard/Insights";

export default function App() {
  return (
    <Routes>
      {/* PUBLIC ROUTE */}
      <Route path="/" element={<Login />} />

      {/* PROTECTED DASHBOARD */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="home" element={<Home />} />
        <Route path="messages" element={<Messages />} />
        <Route path="insights" element={<Insights />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
