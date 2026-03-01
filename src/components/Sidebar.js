import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
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
const Sidebar = ({ activeMenu = 'dashboard', menuItems = [] }) => {
  // State to track if sidebar is open on mobile devices
  const [isOpen, setIsOpen] = useState(true);



  return (
    <>
      {/* Mobile Menu Toggle Button - only visible on small screens */}
      <button className={`mobile-menu-toggle ${isOpen ? 'hidden' : ''}`} onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <Menu size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar Container - main navigation panel */}
      <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        {/* Logo Section - branding and app name */}
        <div className="sidebar-logo">
          {/* Logo image */}
          <img src="/brgyease.png" alt="BarangayEase Logo" className="logo-image" />
          {/* App name and tagline */}
          <div className="logo-text">
            <h2>BarangayEase</h2>
          </div>
          {/* Close button for mobile sidebar */}
          <button className="sidebar-close-btn" onClick={() => setIsOpen(false)}>
            <X size={24} />
          </button>
        </div>

        {/* Navigation Menu - items injected from `menuItems` prop */}
        <nav className="sidebar-nav">
          <div className="nav-section">
            <h3 className="nav-section-title">MENU</h3>
            <ul className="nav-items">
              {menuItems.map((it) => (
                <li key={it.path}>
                  <NavLink
                    to={it.path}
                    end={!!it.end}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  >
                    {it.icon ? <span className="nav-icon">{it.icon}</span> : null}
                    <span>{it.label}</span>
                  </NavLink>
                </li>
              ))}
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
