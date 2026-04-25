import React from "react";

const ResidentSidebar = ({ isOpen, onClose, activePage }) => {
  return (
    <>
      {/* MOBILE SIDEBAR OVERLAY */}
      <div
        className={`sidebar-overlay${isOpen ? " visible" : ""}`}
        onClick={onClose}
      />

      {/* SIDEBAR */}
      <aside className={`sidebar${isOpen ? " open" : ""}`}>
        <button
          className="sidebar-close"
          onClick={onClose}
          aria-label="Close menu"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="18"
            height="18"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div className="logo-section">
          <div className="logo-icon">
            <img src="/brgyease.png" alt="BarangayEase Logo" />
          </div>
          <div>
            <h2>BarangayEase</h2>
            <p>Resident Services</p>
          </div>
        </div>
        <div className="menu">
          <h4>GENERAL</h4>
          <a
            href="/dashboard"
            className={activePage === "dashboard" ? "active" : ""}
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
            Dashboard
          </a>

          <h4>SERVICES</h4>
          <a
            href="/requests"
            className={activePage === "requests" ? "active" : ""}
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24">
              <path d="M5 2h14a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
              <line x1="9" y1="7" x2="15" y2="7" />
              <line x1="9" y1="11" x2="15" y2="11" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            My Requests
          </a>
          <a
            href="/complaints"
            className={activePage === "complaints" ? "active" : ""}
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
              <line x1="12" y1="8" x2="12" y2="14" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
            My Complaints
          </a>
          <a
            href="/my-settlements"
            className={activePage === "settlements" ? "active" : ""}
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <path d="M8 14h8" />
              <path d="M8 18h5" />
            </svg>
            Settlements
          </a>
          <a
            href="/announcements"
            className={activePage === "announcements" ? "active" : ""}
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
              <line x1="5" y1="9" x2="19" y2="9" />
              <line x1="5" y1="15" x2="19" y2="15" />
            </svg>
            Announcements
          </a>
        </div>
      </aside>
    </>
  );
};

export default ResidentSidebar;
