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
  portalAccessStatus = "idle",
  portalAccessMessage = "",
}) => {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const showPortalLock = portalAccessStatus === "locked";
  const showPortalChecking = portalAccessStatus === "checking";

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
          {showPortalChecking ? (
            <div className="portal-lock-modal-overlay portal-lock-checking">
              <div className="portal-lock-modal">
                <div className="portal-lock-modal-icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#0ea5e9"
                    strokeWidth="2"
                    width="32"
                    height="32"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                </div>
                <h3 className="portal-lock-modal-title">Checking Attendance</h3>
                <p className="portal-lock-modal-message">
                  Verifying your attendance record before opening the portal.
                </p>
              </div>
            </div>
          ) : showPortalLock ? (
            <div className="portal-lock-modal-overlay">
              <div className="portal-lock-modal">
                <div className="portal-lock-modal-icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth="2"
                    width="32"
                    height="32"
                  >
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                  </svg>
                </div>
                <h3 className="portal-lock-modal-title">Access Blocked</h3>
                <p className="portal-lock-modal-message">
                  {portalAccessMessage ||
                    "You are not allowed to use the official portal right now."}
                </p>
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </main>

        {showLogoutModal && (
          <div
            className="portal-logout-modal-overlay"
            onClick={handleCloseLogoutModal}
          >
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
