import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { Outlet } from "react-router-dom";
import "../styles/Layout.css";

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
const Layout = ({
  menuItems = [],
  userName = "Barangay Official",
  userPosition = "",
  userRole = null,
  onLogout,
  userLoading = false,
}) => {
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleOpenLogoutModal = () => {
    setShowLogoutModal(true);
  };

  const handleCloseLogoutModal = () => {
    setShowLogoutModal(false);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    if (onLogout) {
      await onLogout();
    }
  };

  useEffect(() => {
    if (showLogoutModal) {
      document.body.classList.add("modal-active");
    } else {
      document.body.classList.remove("modal-active");
    }

    return () => {
      document.body.classList.remove("modal-active");
    };
  }, [showLogoutModal]);

  return (
    <div className="app-layout">
      {/* Left Sidebar - navigation menu; receives menu configuration */}
      <Sidebar menuItems={menuItems} />

      {/* Main wrapper - contains header and content area */}
      <div className="main-wrapper">
        {/* Top Header - page title and user account dropdown */}
        <Header
          menuItems={menuItems}
          userName={userName}
          userPosition={userPosition}
          userRole={userRole}
          userLoading={userLoading}
          onLogout={handleOpenLogoutModal}
        />

        {/* Main Content Area - renders nested routes via Outlet */}
        <main className="main-content">
          <Outlet />
        </main>

        {showLogoutModal && (
          <div className="portal-logout-modal-overlay" onClick={handleCloseLogoutModal}>
            <div
              className="portal-logout-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="portal-logout-modal-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth="2"
                  width="32"
                  height="32"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </div>
              <h3 className="portal-logout-modal-title">Logout</h3>
              <p className="portal-logout-modal-message">
                Are you sure you want to logout?
              </p>
              <div className="portal-logout-modal-actions">
                <button
                  className="portal-logout-modal-no"
                  onClick={handleCloseLogoutModal}
                >
                  No, Stay
                </button>
                <button
                  className="portal-logout-modal-yes"
                  onClick={handleConfirmLogout}
                >
                  Yes, Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Layout;
