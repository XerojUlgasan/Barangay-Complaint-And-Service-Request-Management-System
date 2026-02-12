import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { Outlet } from 'react-router-dom';
import '../styles/Layout.css';

/**
 * Layout Component
 * 
 * This is the main wrapper component that provides the overall page structure.
 * It combines:
 * - Sidebar (left navigation)
 * - Header (top navigation bar with user info)
 * - Main content area (rendered via children prop)
 * 
 * This layout is consistent across all pages (Dashboard, Requests, etc.)
 * 
 * Props:
 * @param {JSX.Element} children - Page content to display in main area
 * @param {string} activeMenu - Current active menu item for sidebar highlighting
 * @param {string} userName - Name of logged-in user to display in header
 * @param {function} onLogout - Callback for logout action from header
 */
const Layout = ({ menuItems = [], userName = 'Barangay Official', onLogout }) => {
  return (
    <div className="app-layout">
      {/* Left Sidebar - navigation menu; receives menu configuration */}
      <Sidebar menuItems={menuItems} />

      {/* Main wrapper - contains header and content area */}
      <div className="main-wrapper">
        {/* Top Header - page title and user account dropdown */}
        <Header menuItems={menuItems} userName={userName} onLogout={onLogout} />

        {/* Main Content Area - renders nested routes via Outlet */}
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
