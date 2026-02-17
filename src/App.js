import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';

// TODO: Sanitize user inputs for security

import {
  checkHouseholdMember,
  checkUser,
  loginByEmail,
  logout,
  registerByEmail,
} from "./supabse_db/auth/auth";

// --- Shared Layout (Official/Admin) ---
import Layout from "./components/Layout";
import { LayoutDashboard, FileText, Megaphone, Users } from 'lucide-react';

// --- Public / User-facing pages ---
import Homepage from "./raw/Homepage";        // ← changed from ./pages/Homepage
import Login from "./raw/Login";
import UserLanding from "./raw/Userlanding";
import SubmitRequest from "./raw/SubmitRequest";

// --- Official pages ---
import OfficialDashboard from "./pages/official/OfficialDashboard";
import OfficialRequests from "./pages/official/OfficialRequests";

// --- Admin pages ---
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import AdminRequests from "./pages/admin/AdminRequests";
import AdminUsers from "./pages/admin/AdminUsers";

// Demo placeholder
function UserPage() {
  return <div>User page (demo)</div>;
}

function App() {
  const [userName] = useState("Barangay Official");

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <Router>
      <Routes>

        {/* PUBLIC / USER-FACING ROUTES */}
        <Route path="/"              element={<Homepage />} />
        <Route path="/homepage"      element={<Homepage />} />
        <Route path="/login"         element={<Login />} />
        <Route path="/dashboard"     element={<UserLanding />} />
        <Route path="/requests"      element={<UserLanding />} />
        <Route path="/announcements" element={<UserLanding />} />
        <Route path="/submit"        element={<SubmitRequest />} />
        <Route path="/user"          element={<UserPage />} />

        {/* OFFICIAL PORTAL ROUTES */}
        <Route
          path="/BarangayOfficial"
          element={
            <Layout
              menuItems={[
                { path: '/BarangayOfficial', label: 'Dashboard', icon: <LayoutDashboard size={18} />, end: true },
                { path: '/BarangayOfficial/requests', label: 'Requests', icon: <FileText size={18} /> },
              ]}
              userName={userName}
              onLogout={handleLogout}
            />
          }
        >
          <Route index element={<OfficialDashboard />} />
          <Route path="requests" element={<OfficialRequests />} />
        </Route>

        {/* ADMIN PORTAL ROUTES */}
        <Route
          path="/BarangayAdmin"
          element={
            <Layout
              menuItems={[
                { path: '/BarangayAdmin', label: 'Dashboard', icon: <LayoutDashboard size={18} />, end: true },
                { path: '/BarangayAdmin/announcements', label: 'Announcements', icon: <Megaphone size={18} /> },
                { path: '/BarangayAdmin/requests', label: 'Requests', icon: <FileText size={18} /> },
                { path: '/BarangayAdmin/users', label: 'Users', icon: <Users size={18} /> },
              ]}
              userName={userName}
              onLogout={handleLogout}
            />
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
          <Route path="requests"      element={<AdminRequests />} />
          <Route path="users"         element={<AdminUsers />} />
        </Route>

      </Routes>
    </Router>
  );
}

export default App;