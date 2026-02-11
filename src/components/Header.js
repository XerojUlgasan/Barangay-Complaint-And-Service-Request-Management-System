import React, { useState } from 'react';
import { ChevronDown, LogOut } from 'lucide-react';
import '../styles/Header.css';

/**
 * Header Component
 * 
 * This component displays the top navigation bar with:
 * - Current page title/label (e.g., "Dashboard", "Requests")
 * - User account dropdown menu
 * - Logout option from user dropdown
 * 
 * Props:
 * @param {string} userName - Name/email of the currently logged-in user
 * @param {function} onLogout - Callback function to execute when user clicks logout
 */
const Header = ({ userName = 'Barangay Official', onLogout }) => {
  // State to track if account dropdown menu is open
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  /**
   * Handle logout button click
   * 
   * This function:
   * 1. Closes the dropdown menu
   * 2. Calls the onLogout callback passed from parent component
   * 3. Parent component (App.js) should handle actual logout logic
   */
  const handleLogout = () => {
    setIsDropdownOpen(false);
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

      {/* Right side - user account menu */}
      <div className="header-right">
        <div className="account-dropdown">
          {/* Account button - displays user name and dropdown chevron */}
          <button
            className="account-button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            {/* "BARANGAY OFFICIAL" label */}
            <span className="account-label">{userName}</span>
            {/* Display user's name */}
            <span className="account-user">{userName}</span>
            {/* Chevron icon - rotates when dropdown opens */}
            <ChevronDown size={18} className="dropdown-icon" />
          </button>

          {/* Dropdown Menu - appears when account button is clicked */}
          {isDropdownOpen && (
            <div className="dropdown-menu">
              {/* Logout menu item */}
              <button className="dropdown-item logout-item" onClick={handleLogout}>
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>

        {/* Click Outside Handler - closes dropdown when user clicks outside */}
        {isDropdownOpen && (
          <div
            className="dropdown-overlay"
            onClick={() => setIsDropdownOpen(false)}
          />
        )}
      </div>
    </header>
  );
};

export default Header;
