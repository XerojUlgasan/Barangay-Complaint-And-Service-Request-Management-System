import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react";

// TODO: Sanitize user inputs for security

import {
  checkHouseholdMember,
  checkUser,
  loginByEmail,
  logout,
  registerByEmail,
} from "./supabse_db/auth/auth";
import Homepage from "./pages/Homepage";
import { LayoutDashboard, FileText, Megaphone, Users } from 'lucide-react';
import OfficialDashboard from "./pages/official/OfficialDashboard";
import OfficialRequests from "./pages/official/OfficialRequests";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import AdminRequests from "./pages/admin/AdminRequests";
import AdminUsers from "./pages/admin/AdminUsers";
import Layout from "./components/Layout";

// Simple inline page for demo user (no external file)
function UserPage() {
  // small placeholder for User page
  return <div>User page (demo)</div>;
}

// Simple inline page for admin (no external file)
function AdminPage() {
  // small placeholder for Admin page
  return <div>Barangay Admin page (demo)</div>;
}

// Note: demo login was removed in favor of blank LoginSignUp page

/**
 * App Root Component
 * 
 * This is the main application component that handles:
 * - Application routing for all pages
 * - User session state management
 * - Layout wrapping for consistent navigation
 * 
 * Routes:
 * - "/" : Dashboard page (BarangayOfficial component)
 * - "/requests" : Requests management page
 * 
 * TODO: Add authentication middleware
 * - Check user session before rendering protected routes
 * - Redirect to login if not authenticated
 * 
 * TODO: Add route for request details
 * - Path: "/requests/:id"
 * - Component: RequestDetail
 */
function App() {
  // State to hold current logged-in user's name
  // TODO: Replace with actual user data from Supabase auth session
  const [userName] = useState("Barangay Official");

  /**
   * Handle logout action
   * 
   * This function:
   * 1. Calls the logout function from Supabase auth
   * 2. Clears user session on backend
   * 3. Redirects to home page after successful logout
   * 
   * Error handling: Logs errors if logout fails
   * 
   * TODO: Add error toast notification for failed logout attempts
   */
  const handleLogout = async () => {
    try {
      // Call Supabase logout function
      await logout();
      // Redirect to home page after logout
      window.location.href = "/";
    } catch (error) {
      // Log any logout errors
      console.error("Logout error:", error);
      // TODO: Show error notification to user
    }
  };

  return (
    <Router>
      {/* Routes - define app pages and navigation */}
      <Routes>
        {/* HOME ROUTE - public homepage (blank placeholder). hide header/sidebar */}
        <Route path="/" element={<Homepage />} />

        {/* LOGIN handled as modal on Homepage - no separate route */}

        {/* USER ROUTE - demo user landing */}
        <Route path="/user" element={<UserPage />} />

        {/* OFFICIAL ROUTES - use shared Layout with official menu */}
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

        {/* ADMIN ROUTES - use same Layout but different menu config */}
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
          <Route path="requests" element={<AdminRequests />} />
          <Route path="users" element={<AdminUsers />} />
        </Route>

        {/* TODO: Add more routes as needed */}
        {/* Example routes to implement:
            - /requests/:id (Request detail/edit page)
            - /profile (User profile settings)
            - /analytics (Advanced analytics dashboard)
            - /settings (Application settings)
        */}
      </Routes>
    </Router>
  );
}

export default App;


