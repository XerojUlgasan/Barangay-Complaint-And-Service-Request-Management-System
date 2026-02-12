import React, { useState } from 'react';
import { LayoutDashboard, FileText, Menu, X } from 'lucide-react';
import '../styles/Sidebar.css';

/**
 * Sidebar Component
 * 
 * This component renders the left-side navigation sidebar for the application.
 * 
 * Features:
 * - Logo and branding display
 * - Navigation menu with multiple sections (GENERAL, SERVICES)
 * - Active route indication with highlighting
 * - Mobile responsive hamburger menu
 * - Logout functionality
 * 
 * Props:
 * @param {string} activeMenu - Currently active menu item to highlight (e.g., 'dashboard', 'requests')
 */
const Sidebar = ({ activeMenu = 'dashboard' }) => {
  // State to track if sidebar is open on mobile devices
  const [isOpen, setIsOpen] = useState(true);



  return (
    <>
      {/* Mobile Menu Toggle Button - only visible on small screens */}
      <button className="mobile-menu-toggle" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar Container - main navigation panel */}
      <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        {/* Logo Section - branding and app name */}
        <div className="sidebar-logo">
          {/* Circular logo icon with first letter */}
          <div className="logo-icon">O</div>
          {/* App name and tagline */}
          <div className="logo-text">
            <h2>BARANGAYLINK</h2>
            <p>Resident Services Registry</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-nav">
          {/* GENERAL Section - main dashboard features */}
          <div className="nav-section">
            <h3 className="nav-section-title">GENERAL</h3>
            <ul className="nav-items">
              <li>
                <a
                  href="/"
                  className={`nav-item ${activeMenu === 'dashboard' ? 'active' : ''}`}
                >
                  <LayoutDashboard size={20} />
                  <span>Dashboard</span>
                </a>
              </li>
            </ul>
          </div>

          {/* SERVICES Section - citizen service features */}
          <div className="nav-section">
            <h3 className="nav-section-title">SERVICES</h3>
            <ul className="nav-items">
              <li>
                <a
                  href="/requests"
                  className={`nav-item ${activeMenu === 'requests' ? 'active' : ''}`}
                >
                  <FileText size={20} />
                  <span>Requests</span>
                </a>
              </li>
            </ul>
          </div>
        </nav>


      </aside>

      {/* Sidebar Overlay for Mobile - click to close */}
      {isOpen && <div className="sidebar-overlay" onClick={() => setIsOpen(false)} />}
    </>
  );
};

export default Sidebar;
