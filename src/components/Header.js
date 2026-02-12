import React from 'react';
import { LogOut } from 'lucide-react';
import '../styles/Header.css';

/**
 * Header Component
 * 
 * This component displays the top navigation bar with:
 * - Current page title/label (e.g., "Dashboard", "Requests")
 * - User account display
 * - Logout button with icon
 * 
 * Props:
 * @param {string} userName - Name/email of the currently logged-in user
 * @param {function} onLogout - Callback function to execute when user clicks logout
 */
const Header = ({ userName = 'Barangay Official', onLogout }) => {
  /**
   * Handle logout button click
   * 
   * Calls the onLogout callback passed from parent component.
   * Parent component (App.js) should handle actual logout logic.
   */
  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <header className="header">
      {/* Left side - page title */}
      <div className="header-left">
        <h1 className="page-title">Dashboard</h1>
      </div>

      {/* Right side - user account and logout */}
      <div className="header-right">
        {/* Account display */}
        <div className="account-info">
          <span className="account-label">BARANGAY OFFICIAL</span>
          <span className="account-user">{userName}</span>
        </div>

        {/* Logout button with icon */}
        <button className="logout-icon-btn" onClick={handleLogout} title="Logout">
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
};

export default Header;
