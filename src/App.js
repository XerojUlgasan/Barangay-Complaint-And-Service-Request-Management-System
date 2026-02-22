import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';

// TODO: Sanitize user inputs for security

import {
  checkHouseholdMember,
  checkUser,
  loginByEmail,
  logout,
  registerByEmail,
  checkUserRole,
} from "./supabse_db/auth/auth";
import { getOfficialProfile } from './supabse_db/profile/profile';
import supabase from './supabse_db/supabase_client';

// --- Shared Layout (Official/Admin) ---
import Layout from "./components/Layout";
import { LayoutDashboard, FileText, Megaphone, Users } from 'lucide-react';

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

// --- Admin pages ---
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import AdminRequests from "./pages/admin/AdminRequests";
import AdminUsers from "./pages/admin/AdminUsers";


//test
import Home from "./pages/home";

// Demo placeholder
function UserPage() {
  return <div>User page (demo)</div>;
}

function App() {
  const [userName, setUserName] = useState("Barangay Official");
  const [userRole, setUserRole] = useState(null); // 'superadmin', 'official', or null
  const [userLoading, setUserLoading] = useState(true);

  // Load logged-in user's display name once on app start
  useEffect(() => {
    let mounted = true;

    const loadUserName = async () => {
      try {
        if (mounted) setUserLoading(true);

        // Get current user
        const userResp = await supabase.auth.getUser();
        const user = userResp.data?.user;

        if (!user) {
          if (mounted) {
            setUserName('Barangay User');
            setUserRole(null);
          }
          return;
        }

        // Check if user is superadmin
        const { data: superadminData } = await supabase
          .from('superadmin_tbl')
          .select('id')
          .eq('auth_uid', user.id);

        if (superadminData && superadminData.length > 0) {
          if (mounted) setUserRole('superadmin');
          // Get superadmin name from profile if available
          const profileRes = await getOfficialProfile();
          if (profileRes && profileRes.success && profileRes.data) {
            const p = profileRes.data;
            const full = [p.firstname, p.middlename, p.lastname].filter(Boolean).join(' ');
            if (full && mounted) {
              setUserName(full);
              return;
            }
          }
          const fallback = user.user_metadata?.full_name || user.email || user.id;
          if (mounted) setUserName(fallback || 'Barangay Admin');
          return;
        }

        // Check if user is official
        const { data: officialData } = await supabase
          .from('official_tbl')
          .select('id')
          .eq('auth_uid', user.id);

        if (officialData && officialData.length > 0) {
          if (mounted) setUserRole('official');
        }

        // Get official profile
        const profileRes = await getOfficialProfile();
        if (profileRes && profileRes.success && profileRes.data) {
          const p = profileRes.data;
          const full = [p.firstname, p.middlename, p.lastname].filter(Boolean).join(' ');
          if (full && mounted) {
            setUserName(full);
            return;
          }
        }

        // Fallback to auth user info
        const fallback = user.user_metadata?.full_name || user.email || user.id;
        if (mounted) setUserName(fallback || 'Barangay User');
      } catch (err) {
        console.error('Error loading user name for header:', err);
      } finally {
        if (mounted) setUserLoading(false);
      }
    };

    // Initial load
    loadUserName();

    // Subscribe to auth state changes so header updates immediately on login/logout
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // When auth changes, reload username
      loadUserName();
    });

    return () => {
      mounted = false;
      // cleanup subscription
      if (data && data.subscription && typeof data.subscription.unsubscribe === 'function') {
        data.subscription.unsubscribe();
      }
    };
  }, []);

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
        <Route path="/requests"      element={<MyRequest />} />
        <Route path="/complaints"    element={<MyComplaints />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/submit"        element={<SubmitRequest />} />
        <Route path="/user"          element={<UserPage />} />
        <Route path="/testingan"     element={<Home />} />
        <Route path="/submit/certificate" element={<SubmitRequest />} />
        <Route path="/submit/complaint"   element={<SubmitRequest />} />

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
              userRole={userRole}
              userLoading={userLoading}
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

        {/* FALLBACK */}
        <Route
          path="/BarangayAdmin-old"
          element={
            <Layout
              menuItems={[
                { path: '/BarangayAdmin', label: 'Dashboard', icon: <LayoutDashboard size={18} />, end: true },
                { path: '/BarangayAdmin/announcements', label: 'Announcements', icon: <Megaphone size={18} /> },
                { path: '/BarangayAdmin/requests', label: 'Requests', icon: <FileText size={18} /> },
                { path: '/BarangayAdmin/users', label: 'Users', icon: <Users size={18} /> },
              ]}
              userName={userName}
              userLoading={userLoading}
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