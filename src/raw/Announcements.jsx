import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../supabse_db/supabase_client";
import { getAnnouncements, signupForEvent } from "../supabse_db/announcement/announcement";
import { logout } from "../supabse_db/auth/auth";
import { fetchAnnouncementImages } from "../supabse_db/uploadImages";
import {
  formatResidentFullName,
  getResidentByAuthUid,
} from "../supabse_db/resident/resident";
import "./userlanding.css";

const Announcements = () => {
  const navigate = useNavigate();

  const [userName, setUserName] = useState("");
  const [announcements, setAnnouncements] = useState([]);
  const [announcementImages, setAnnouncementImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupMessage, setSignupMessage] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: userData } = await supabase.auth.getUser();

      if (userData?.user) {
        const residentResult = await getResidentByAuthUid(userData.user.id);
        if (residentResult.success && residentResult.data) {
          setUserName(formatResidentFullName(residentResult.data));
        }
      }

      const result = await getAnnouncements();
      if (result.success) {
        setAnnouncements(result.data);
        const imageMap = {};
        const imagePromises = result.data.map(async (ann) => {
          const imageResult = await fetchAnnouncementImages(ann.id);
          if (imageResult.success && imageResult.images.length > 0) {
            imageMap[ann.id] = imageResult.images[0].url;
          }
        });
        await Promise.all(imagePromises);
        setAnnouncementImages(imageMap);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const handleLogoutConfirm = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const closeSidebar = () => setSidebarOpen(false);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getPriorityClass = (priority) => {
    if (!priority) return "";
    if (priority.toLowerCase() === "high") return "ann-priority high";
    if (priority.toLowerCase() === "medium") return "ann-priority medium";
    return "ann-priority normal";
  };

  const getCategoryIcon = (category) => {
    if (!category) return null;
    if (category.toLowerCase() === "event")
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          width="15"
          height="15"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        width="15"
        height="15"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    );
  };

  return (
    <div className="user-landing-page">
      <div className="layout">
        {/* LOGOUT MODAL */}
        {showLogoutModal && (
          <div
            className="logout-modal-overlay"
            onClick={() => setShowLogoutModal(false)}
          >
            <div className="logout-modal" onClick={(e) => e.stopPropagation()}>
              <div className="logout-modal-icon">
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
              <h3 className="logout-modal-title">Logout</h3>
              <p className="logout-modal-message">
                Are you sure you want to logout?
              </p>
              <div className="logout-modal-actions">
                <button
                  className="logout-modal-no"
                  onClick={() => setShowLogoutModal(false)}
                >
                  No, Stay
                </button>
                <button
                  className="logout-modal-yes"
                  onClick={handleLogoutConfirm}
                >
                  Yes, Logout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MOBILE SIDEBAR OVERLAY */}
        <div
          className={`sidebar-overlay${sidebarOpen ? " visible" : ""}`}
          onClick={closeSidebar}
        />

        {/* SIDEBAR */}
        <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
          <button
            className="sidebar-close"
            onClick={closeSidebar}
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
              <svg viewBox="0 0 24 24" className="shield-logo">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <h2>BARANGAYLINK</h2>
              <p>Resident Services Registry</p>
            </div>
          </div>

          <div className="menu">
            <h4>GENERAL</h4>
            <a href="/dashboard" onClick={closeSidebar}>
              <svg viewBox="0 0 24 24">
                <path d="M3 12l9-9 9 9" />
                <path d="M9 21V9h6v12" />
              </svg>
              Dashboard
            </a>

            <h4>SERVICES</h4>
            <a href="/requests" onClick={closeSidebar}>
              <svg viewBox="0 0 24 24">
                <path d="M4 4h16v16H4z" />
                <path d="M8 2v4M16 2v4M4 10h16" />
              </svg>
              My Requests
            </a>
            <a href="/complaints" onClick={closeSidebar}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              My Complaints
            </a>
            <a href="/announcements" className="active" onClick={closeSidebar}>
              <svg viewBox="0 0 24 24">
                <path d="M3 11l18-5v10l-18-5v4" />
              </svg>
              Announcements
            </a>
          </div>
        </aside>

        {/* MAIN */}
        <main className="main">
          {/* TOPBAR */}
          <div className="topbar">
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                width="20"
                height="20"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <h3>Announcements</h3>
            <div className="user">
              <div className="user-text">
                <strong>{userName || "Loading..."}</strong>
                <span>Resident</span>
              </div>
              <button
                onClick={() => setShowLogoutModal(true)}
                className="back-button"
                title="Logout"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </div>

          {/* CONTENT */}
          <div className="ann-content">
            <h1 className="ann-page-title">Announcements</h1>
            <p className="ann-page-sub">
              Stay updated with official barangay announcements
            </p>

            {loading ? (
              <p style={{ color: "#888" }}>Loading announcements...</p>
            ) : announcements.length === 0 ? (
              <p style={{ color: "#888" }}>No announcements yet.</p>
            ) : (
              <div className="ann-grid">
                {announcements.map((ann) => (
                  <div className="ann-card" key={ann.id}>
                    {/* IMAGE — full width top, tall */}
                    <div className="ann-image">
                      {announcementImages[ann.id] ? (
                        <img src={announcementImages[ann.id]} alt={ann.title} />
                      ) : (
                        <div className="ann-image-placeholder">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            width="40"
                            height="40"
                          >
                            <rect x="3" y="3" width="18" height="18" rx="3" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* BODY */}
                    <div className="ann-body">
                      {/* Meta row: icon + category pill + priority badge */}
                      <div className="ann-meta-top">
                        <div className="ann-meta-left">
                          <span className="ann-category-icon">
                            {getCategoryIcon(ann.category)}
                          </span>
                          {ann.category && (
                            <span className="ann-category">{ann.category}</span>
                          )}
                        </div>
                        {ann.priority &&
                          ann.priority.toLowerCase() !== "normal" &&
                          ann.priority.toLowerCase() !== "low" && (
                            <span className={getPriorityClass(ann.priority)}>
                              {ann.priority.toUpperCase()}
                            </span>
                          )}
                      </div>

                      <h3 className="ann-title">{ann.title}</h3>
                      <p className="ann-description">{ann.content}</p>

                      <div className="ann-footer">
                        <span className="ann-author">
                          {ann.author || "Admin"}
                        </span>
                        <span className="ann-date">
                          {formatDate(ann.created_at)}
                        </span>
                        {ann.category && ann.category.toLowerCase() === "event" && (
                          <button
                            className="ann-signup-btn"
                            onClick={() => {
                              setSelectedAnnouncement(ann);
                              setSignupMessage(null);
                              setShowSignupModal(true);
                            }}
                          >
                            Sign Up
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* SIGNUP CONFIRMATION MODAL */}
        {showSignupModal && selectedAnnouncement && (
          <div
            className="logout-modal-overlay"
            onClick={() => setShowSignupModal(false)}
          >
            <div
              className="logout-modal"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 480 }}
            >
              <h3 className="logout-modal-title">Confirm Signup</h3>
              <p>
                Are you sure you want to sign up for <b>{selectedAnnouncement.title}</b>?
              </p>
              {signupMessage && (
                <p style={{ color: signupMessage.success ? "green" : "red" }}>
                  {signupMessage.message}
                </p>
              )}
              <div className="logout-modal-actions">
                <button
                  className="logout-modal-no"
                  onClick={() => setShowSignupModal(false)}
                  disabled={signupLoading}
                >
                  Cancel
                </button>
                <button
                  className="logout-modal-yes"
                  onClick={async () => {
                    setSignupLoading(true);
                    setSignupMessage(null);
                    try {
                      const res = await signupForEvent(selectedAnnouncement.id);
                      setSignupMessage(res);
                      if (res && res.success) {
                        // close modal after short delay
                        setTimeout(() => {
                          setShowSignupModal(false);
                        }, 1000);
                      }
                    } catch (err) {
                      console.error("Signup error:", err);
                      setSignupMessage({ success: false, message: "Signup failed" });
                    } finally {
                      setSignupLoading(false);
                    }
                  }}
                  disabled={signupLoading}
                >
                  {signupLoading ? "Signing up..." : "Yes, Sign Up"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Announcements;
