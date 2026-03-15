import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

// TODO: Sanitize user inputs for security

import { logout } from "./supabse_db/auth/auth";
import { AuthProvider, useAuth } from "./context/AuthContext";

// --- Shared Layout (Official/Admin) ---
import Layout from "./components/Layout";
import { LayoutDashboard, FileText, Megaphone, Users } from "lucide-react";

// --- Public / User-facing pages ---
import Homepage from "./raw/Homepage";
import Login from "./raw/Login";
import UserLanding from "./raw/Userlanding";
import SubmitRequest from "./raw/SubmitRequest";
import MyRequest from "./raw/Myrequest";
import MyComplaints from "./raw/Mycomplaints";
import Announcements from "./raw/Announcements";

// --- Official pages ---
import OfficialDashboard from "./pages/official/OfficialDashboard";
import OfficialRequests from "./pages/official/OfficialRequests";
import OfficialComplaints from "./pages/official/OfficialComplaints";

// --- Admin pages ---
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import AdminRequests from "./pages/admin/AdminRequests";
import AdminUsers from "./pages/admin/AdminUsers";

//test
import Home from "./pages/home";
import household_supabase from "./supabse_db/household_supabase_client";

// Demo placeholder
function UserPage() {
  return <div>User page (demo)</div>;
}

// Routes component that uses auth context
function AppRoutes() {
  const { userName, userRole, userLoading } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <Routes>
      {/* PUBLIC ROUTES */}
      <Route path="/" element={<Homepage />} />
      <Route path="/homepage" element={<Homepage />} />
      <Route path="/login" element={<Login />} />

      {/* USER ROUTES - Requires authentication */}
      <Route path="/dashboard" element={<UserLanding />} />
      <Route path="/requests" element={<MyRequest />} />
      <Route path="/complaints" element={<MyComplaints />} />
      <Route path="/announcements" element={<Announcements />} />
      <Route path="/submit" element={<SubmitRequest />} />
      <Route path="/submit/certificate" element={<SubmitRequest />} />
      <Route path="/submit/complaint" element={<SubmitRequest />} />
      <Route path="/user" element={<UserPage />} />
      <Route path="/testingan" element={<Home />} />

      {/* OFFICIAL PORTAL ROUTES */}
      <Route
        path="/BarangayOfficial"
        element={
          <Layout
            menuItems={[
              {
                path: "/BarangayOfficial",
                label: "Dashboard",
                icon: <LayoutDashboard size={18} />,
                end: true,
              },
              {
                path: "/BarangayOfficial/requests",
                label: "Requests",
                icon: <FileText size={18} />,
              },
              {
                path: "/BarangayOfficial/complaints",
                label: "Complaints",
                icon: <Megaphone size={18} />,
              },
            ]}
            userName={userName}
            userRole={userRole}
            userLoading={userLoading}
            onLogout={handleLogout}
          />
        }
      >
        <Route index element={<OfficialDashboard />} />
        <Route path="requests" element={<OfficialRequests />} />
        <Route path="complaints" element={<OfficialComplaints />} />
      </Route>

      {/* ADMIN PORTAL ROUTES */}
      <Route
        path="/BarangayAdmin"
        element={
          <Layout
            menuItems={[
              {
                path: "/BarangayAdmin",
                label: "Dashboard",
                icon: <LayoutDashboard size={18} />,
                end: true,
              },
              {
                path: "/BarangayAdmin/announcements",
                label: "Announcements",
                icon: <Megaphone size={18} />,
              },
              {
                path: "/BarangayAdmin/requests",
                label: "Requests",
                icon: <FileText size={18} />,
              },
              {
                path: "/BarangayAdmin/users",
                label: "Users",
                icon: <Users size={18} />,
              },
            ]}
            userName={userName}
            userRole={userRole}
            userLoading={userLoading}
            onLogout={handleLogout}
          />
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="announcements" element={<AdminAnnouncements />} />
        <Route path="requests" element={<AdminRequests />} />
        <Route path="users" element={<AdminUsers />} />
      </Route>

      {/* FALLBACK - Old Admin Portal */}
      <Route
        path="/BarangayAdmin-old"
        element={
          <Layout
            menuItems={[
              {
                path: "/BarangayAdmin",
                label: "Dashboard",
                icon: <LayoutDashboard size={18} />,
                end: true,
              },
              {
                path: "/BarangayAdmin/announcements",
                label: "Announcements",
                icon: <Megaphone size={18} />,
              },
              {
                path: "/BarangayAdmin/requests",
                label: "Requests",
                icon: <FileText size={18} />,
              },
              {
                path: "/BarangayAdmin/users",
                label: "Users",
                icon: <Users size={18} />,
              },
            ]}
            userName={userName}
            userLoading={userLoading}
            onLogout={handleLogout}
          />
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="announcements" element={<AdminAnnouncements />} />
        <Route path="requests" element={<AdminRequests />} />
        <Route path="users" element={<AdminUsers />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
