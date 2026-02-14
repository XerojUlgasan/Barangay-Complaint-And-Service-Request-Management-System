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
import Home from "./pages/home";
import BarangayOfficial from "./pages/BarangayOfficial";
import Requests from "./pages/Requests";
import Layout from "./components/Layout";
import { postAnnouncement } from "./supabse_db/announcement/post_announcement";
import supabase from "./supabse_db/supabase_client";

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
      {/* React Router Routes - defines all application pages */}
      <Routes>
        {/* DASHBOARD ROUTE - Main page */}
        <Route
          path="/"
          element={
            <Layout
              activeMenu="dashboard"
              userName={userName}
              onLogout={handleLogout}
            >
              <BarangayOfficial />
            </Layout>
          }
        />

        {/* REQUESTS ROUTE - View and manage citizen service requests */}
        <Route
          path="/requests"
          element={
            <Layout
              activeMenu="requests"
              userName={userName}
              onLogout={handleLogout}
            >
              <Requests />
            </Layout>
          }
        />

        <Route path="/testingan" element={<Home />} />

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
