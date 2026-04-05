import React from "react";
import { LogOut } from "lucide-react";
import { useLocation } from "react-router-dom";
import "../styles/Header.css";
import OfficialSettings from "./OfficialSettings";

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
const Header = ({
  menuItems = [],
  userName = "Barangay Official",
  userPosition = "",
  userRole = null,
  onLogout,
  userLoading = false,
}) => {
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

  // Determine the role label to display
  const getRoleLabel = () => {
    if (userRole === "superadmin") {
      return "SUPER ADMINISTRATOR";
    } else if (userRole === "official") {
      return "BARANGAY OFFICIAL";
    }
    return "BARANGAY OFFICIAL"; // default fallback
  };

  const location = useLocation();
  const pathname = location.pathname || "/";

  const findMenuLabel = () => {
    if (!Array.isArray(menuItems) || menuItems.length === 0) return "Dashboard";
    const exact = menuItems.find((m) => m.path === pathname);
    if (exact) return exact.label;
    const sorted = [...menuItems].sort((a, b) => b.path.length - a.path.length);
    const prefix = sorted.find((m) => pathname.startsWith(m.path));
    return prefix ? prefix.label : "Dashboard";
  };

  const pageTitle = findMenuLabel();

  return (
    <header className="header">
      {/* Left side - page title */}
      <div className="header-left">
        <h1 className="page-title">{pageTitle}</h1>
      </div>

      {/* Right side - user account and logout */}
      <div className="header-right">
        {/* Account display */}
        <div className="account-info">
          <span className="account-label">{getRoleLabel()}</span>
          {userLoading ? (
            <span className="account-loading">Loading...</span>
          ) : (
            <span className="account-user">
              {userName}
              {userRole === "official" && userPosition ? (
                <span className="account-position"> • {userPosition}</span>
              ) : null}
            </span>
          )}
        </div>

        {/* Logout button with icon */}
        {userRole === "official" && <OfficialSettings />}
        <button className="logout-icon-btn" onClick={handleLogout} title="Logout">
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
};

export default Header;
