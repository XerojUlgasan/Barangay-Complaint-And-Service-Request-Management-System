import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { signupForEvent, cancelSignup } from "../../supabse_db/announcement/announcement";
import { logout } from "../../supabse_db/auth/auth";
import supabase from "../../supabse_db/supabase_client";
import { useAuth } from "../../context/AuthContext";
import { useAnnouncementsForRole } from "../../hooks/useAnnouncementsForRole";
import ResidentSidebar from "../../components/ResidentSidebar";
import ResidentSettings from "../../components/ResidentSettings";
import ResidentProfile from "../../components/ResidentProfile";
import "../../styles/UserPages.css";
import "../../styles/BarangayOfficial.css";

const Announcements = () => {
  const navigate = useNavigate();
  const { authUser, userLoading, userName } = useAuth();

  // Use the centralized announcement hook for role-based data
  const {
    announcements,
    announcementImages,
    participantCounts,
    loading,
    refresh,
  } = useAnnouncementsForRole("residents");

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupMessage, setSignupMessage] = useState(null);
  const [signupAction, setSignupAction] = useState("signup");
  const [userSignups, setUserSignups] = useState({});
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [userProfile, setUserProfile] = useState(null);

  // Load user signups for events
  useEffect(() => {
    if (userLoading || !authUser) return;

    const loadUserSignups = async () => {
      const eventAnns = announcements.filter(
        (a) => a.category && String(a.category).toLowerCase() === "event"
      );

      if (eventAnns.length > 0) {
        try {
          const annIds = eventAnns.map((a) => a.id);
          const { data: signupRows, error: signupError } = await supabase
            .from("event_participants")
            .select("announcement_id")
            .in("announcement_id", annIds)
            .eq("user_uid", authUser.id);

          if (!signupError && Array.isArray(signupRows)) {
            const signups = {};
            signupRows.forEach((r) => {
              signups[r.announcement_id] = true;
            });
            setUserSignups(signups);
          }
        } catch (err) {
          console.error("Error loading user signups:", err);
        }
      }
    };

    loadUserSignups();
  }, [authUser, userLoading, announcements]);

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

  const formatDateShort = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getCategoryConfig = (category) => {
    const cat = (category || "").toLowerCase();
    if (cat === "event") return { label: "Event", color: "#8b5cf6", bg: "#f5f3ff", icon: "📅" };
    if (cat === "alert") return { label: "Alert", color: "#ef4444", bg: "#fef2f2", icon: "🚨" };
    return { label: "General", color: "#10b981", bg: "#f0fdf4", icon: "📢" };
  };

  const getPriorityConfig = (priority) => {
    const p = (priority || "").toLowerCase();
    if (p === "high") return { label: "HIGH", color: "#dc2626", bg: "#fef2f2" };
    if (p === "urgent") return { label: "URGENT", color: "#9f1239", bg: "#fff1f2" };
    if (p === "medium") return { label: "MED", color: "#d97706", bg: "#fffbeb" };
    return null;
  };

  const formatDateTimeReadable = (value) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const mapSexToUi = (value) => {
    if (value === "M" || value === "Male") return "Male";
    if (value === "F" || value === "Female") return "Female";
    return "";
  };

  const toArray = (value) => (Array.isArray(value) ? value : []);

  const getEventStatus = (announcement) => {
    if (!announcement?.event_start) return "No Schedule";
    const now = new Date();
    const start = new Date(announcement.event_start);
    const end = announcement.event_end ? new Date(announcement.event_end) : null;

    if (now < start) return "Upcoming";
    if (end && now > end) return "Completed";
    return "Ongoing";
  };

  const getEventDuration = (announcement) => {
    if (!announcement?.event_start || !announcement?.event_end) return "Open-ended";
    const start = new Date(announcement.event_start);
    const end = new Date(announcement.event_end);
    const ms = end - start;
    if (Number.isNaN(ms) || ms <= 0) return "—";

    const hours = Math.floor(ms / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} day${days > 1 ? "s" : ""}`;
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  };

  const getTargetingChips = (announcement) => {
    const chips = [];
    const ageMin = announcement?.min_age;
    const ageMax = announcement?.max_age;
    const stayMin = announcement?.minimum_year_of_stay;
    const stayMax = announcement?.maximum_year_of_stay;

    if (toArray(announcement?.purok).length > 0) {
      chips.push(`Purok: ${toArray(announcement.purok).join(", ")}`);
    }

    if (announcement?.sex) {
      chips.push(`Sex: ${mapSexToUi(announcement.sex) || announcement.sex}`);
    }

    if (ageMin !== null && ageMin !== undefined && ageMin !== "") {
      chips.push(`Min Age: ${ageMin}`);
    }
    if (ageMax !== null && ageMax !== undefined && ageMax !== "") {
      chips.push(`Max Age: ${ageMax}`);
    }

    if (toArray(announcement?.voter_status).length > 0) {
      chips.push(`Voter Status: ${toArray(announcement.voter_status).map((v) => v.toString().replace(/[_-]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())).join(", ")}`);
    }

    if (toArray(announcement?.occupation).length > 0) {
      chips.push(`Occupation: ${toArray(announcement.occupation).join(", ")}`);
    }

    if (toArray(announcement?.religion).length > 0) {
      chips.push(`Religion: ${toArray(announcement.religion).join(", ")}`);
    }

    if (toArray(announcement?.civil_status).length > 0) {
      chips.push(`Civil Status: ${toArray(announcement.civil_status).map((status) => status.toString().replace(/[_-]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())).join(", ")}`);
    }

    if (stayMin !== null && stayMin !== undefined && stayMin !== "") {
      chips.push(`Minimum Years of Stay: ${stayMin}`);
    }
    if (stayMax !== null && stayMax !== undefined && stayMax !== "") {
      chips.push(`Maximum Years of Stay: ${stayMax}`);
    }

    return chips;
  };

  const filterOptions = [
    { key: "all", label: "All" },
    { key: "event", label: "Events" },
    { key: "general", label: "General" },
    { key: "alert", label: "Alerts" },
  ];

  const getAnnouncementTitle = (announcement) => {
    const title =
      announcement?.title ||
      announcement?.subject ||
      announcement?.name ||
      "";

    if (String(title).trim()) return String(title).trim();

    const category = String(announcement?.category || "").toLowerCase();
    return category === "event" ? "Untitled Event" : "Untitled Announcement";
  };

  const getAnnouncementDescription = (announcement) => {
    const description =
      announcement?.content ||
      announcement?.description ||
      announcement?.body ||
      "";

    return String(description).trim() || "No description provided.";
  };

  const filteredAnnouncements = announcements.filter((ann) => {
    const cat = (ann.category || "general").toLowerCase();
    const matchesFilter = activeFilter === "all" || cat === activeFilter;
    const resolvedTitle = getAnnouncementTitle(ann).toLowerCase();
    const resolvedDescription = getAnnouncementDescription(ann).toLowerCase();
    const normalizedSearch = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      resolvedTitle.includes(normalizedSearch) ||
      resolvedDescription.includes(normalizedSearch);
    return matchesFilter && matchesSearch;
  });

  const eventCount = announcements.filter(a => (a.category || "").toLowerCase() === "event").length;
  const signedUpCount = Object.keys(userSignups).length;

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

        {/* SIDEBAR COMPONENT */}
        <ResidentSidebar
          isOpen={sidebarOpen}
          onClose={closeSidebar}
          activePage="announcements"
        />

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
              <ResidentProfile />
              <ResidentSettings />
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
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {/* Page Header */}
            <div className="ann-page-header">
              <div className="ann-page-header-left">
                <h1 className="ann-page-title">Announcements</h1>
                <p className="ann-page-subtitle">Stay updated with official barangay announcements</p>
              </div>
              <div className="ann-summary-chips">
                <div className="ann-summary-chip">
                  <span className="ann-summary-chip-num">{announcements.length}</span>
                  <span className="ann-summary-chip-label">Total</span>
                </div>
                <div className="ann-summary-chip accent-purple">
                  <span className="ann-summary-chip-num">{eventCount}</span>
                  <span className="ann-summary-chip-label">Events</span>
                </div>
                <div className="ann-summary-chip accent-green">
                  <span className="ann-summary-chip-num">{signedUpCount}</span>
                  <span className="ann-summary-chip-label">Joined</span>
                </div>
              </div>
            </div>

            {/* Toolbar */}
            <div className="ann-toolbar">
              <div className="ann-search-wrap">
                <svg className="ann-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  className="ann-search-input"
                  type="text"
                  placeholder="Search announcements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="ann-filter-pills">
                {filterOptions.map((f) => (
                  <button
                    key={f.key}
                    className={`ann-filter-pill${activeFilter === f.key ? " active" : ""}`}
                    onClick={() => setActiveFilter(f.key)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Count Label */}
            <div className="ann-count-label">
              Showing {filteredAnnouncements.length} of {announcements.length} announcements
            </div>

            {/* Cards Grid */}
            {filteredAnnouncements.length === 0 ? (
              <div className="ann-empty-state">
                <div className="ann-empty-icon">📭</div>
                <p className="ann-empty-text">No announcements found</p>
                <p className="ann-empty-sub">Try adjusting your search or filter</p>
              </div>
            ) : (
              <div className="ann-cards-grid">
                {filteredAnnouncements.map((ann, idx) => {
                  const catConfig = getCategoryConfig(ann.category);
                  const priorityConfig = getPriorityConfig(ann.priority);
                  const isEvent = (ann.category || "").toLowerCase() === "event";
                  const isSignedUp = userSignups && userSignups[ann.id];
                  const participantCount = (participantCounts && participantCounts[ann.id]) || 0;
                  const hasImage = !!announcementImages[ann.id];
                  const isEventFull = isEvent && ann.max_participants && participantCount >= ann.max_participants;
                  const fillPct = ann.max_participants
                    ? Math.min(100, Math.round((participantCount / ann.max_participants) * 100))
                    : 0;

                  return (
                    <div
                      className="ann-card-new"
                      key={ann.id}
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                      {/* Image / Placeholder */}
                      <div className="ann-card-img-wrap">
                        {hasImage ? (
                          <img
                            src={announcementImages[ann.id]}
                            alt={getAnnouncementTitle(ann)}
                            className="ann-card-img"
                          />
                        ) : (
                          <div className="ann-card-img-placeholder" style={{ background: catConfig.bg }}>
                            <span className="ann-card-img-emoji">{catConfig.icon}</span>
                          </div>
                        )}

                        {/* Category badge overlaid on image */}
                        <span
                          className="ann-card-cat-badge"
                          style={{ background: catConfig.color }}
                        >
                          {catConfig.label}
                        </span>

                        {/* Priority badge */}
                        {priorityConfig && (
                          <span
                            className="ann-card-priority-badge"
                            style={{ color: priorityConfig.color, background: priorityConfig.bg }}
                          >
                            {priorityConfig.label}
                          </span>
                        )}
                      </div>

                      {/* Card Body */}
                      <div className="ann-card-body">
                        <div className="ann-card-meta">
                          <span className="ann-card-author">
                            {ann.author || "Barangay"}
                          </span>
                          <span className="ann-card-dot">·</span>
                          <span className="ann-card-date">{formatDateShort(ann.created_at)}</span>
                        </div>

                        <h3 className="ann-card-title">
                          {getAnnouncementTitle(ann)}
                        </h3>
                        <p className="ann-card-desc">
                          {getAnnouncementDescription(ann)}
                        </p>

                        {/* Event details */}
                        {isEvent && ann.event_start && (
                          <div className="ann-card-event-row">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                              <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                            </svg>
                            <span>{new Date(ann.event_start).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                          </div>
                        )}

                        {/* Participant bar */}
                        {isEvent && ann.max_participants && (
                          <div className="ann-card-participants">
                            <div className="ann-card-participants-label">
                              <span>{participantCount} / {ann.max_participants} joined</span>
                              <span>{fillPct}%</span>
                            </div>
                            <div className="ann-card-bar-track">
                              <div
                                className="ann-card-bar-fill"
                                style={{
                                  width: `${fillPct}%`,
                                  background: fillPct >= 90 ? "#ef4444" : fillPct >= 60 ? "#f59e0b" : "#10b981",
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Footer actions */}
                        <div className="ann-card-footer">
                          <button
                            className="ann-card-btn-outline"
                            onClick={() => { setSelectedAnnouncement(ann); setShowDetailsModal(true); }}
                          >
                            View Details
                          </button>
                          {isEvent ? (
                            isSignedUp ? (
                              <button
                                className="ann-card-btn-cancel"
                                onClick={() => {
                                  setSelectedAnnouncement(ann);
                                  setSignupMessage(null);
                                  setSignupAction("cancel");
                                  setShowSignupModal(true);
                                }}
                              >
                                ✓ Signed Up
                              </button>
                            ) : isEventFull ? (
                              <button
                                className="ann-card-btn-primary"
                                disabled
                                title="Event is at maximum capacity"
                                style={{ opacity: 0.5, cursor: "not-allowed" }}
                              >
                                Event Full
                              </button>
                            ) : (
                              <button
                                className="ann-card-btn-primary"
                                onClick={() => {
                                  setSelectedAnnouncement(ann);
                                  setSignupMessage(null);
                                  setSignupAction("signup");
                                  setShowSignupModal(true);
                                }}
                              >
                                Sign Up
                              </button>
                            )
                          ) : (
                            <span className="ann-card-posted" style={{ marginLeft: "auto" }}>
                              Posted {formatDate(ann.created_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
              <h3 className="logout-modal-title">
                Confirm {signupAction === "signup" ? "Sign Up" : "Cancellation"}
              </h3>
              <p>
                Are you sure you want to{" "}
                {signupAction === "signup"
                  ? "sign up for"
                  : "cancel your signup for"}{" "}
                <b>{getAnnouncementTitle(selectedAnnouncement)}</b>?
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
                      if (signupAction === "signup") {
                        const res = await signupForEvent(
                          selectedAnnouncement.id,
                        );
                        if (res && res.success) {
                          setUserSignups((s) => ({
                            ...s,
                            [selectedAnnouncement.id]: true,
                          }));
                          // Refresh announcement data to get updated participant counts
                          await refresh();
                          // Close modal immediately
                          setShowSignupModal(false);
                        } else {
                          // Show error message if signup failed
                          setSignupMessage(res);
                        }
                      } else {
                        const res = await cancelSignup(selectedAnnouncement.id);
                        if (res && res.success) {
                          setUserSignups((s) => {
                            const n = { ...s };
                            delete n[selectedAnnouncement.id];
                            return n;
                          });
                          // Refresh announcement data to get updated participant counts
                          await refresh();
                          // Close modal immediately
                          setShowSignupModal(false);
                        } else {
                          // Show error message if cancel failed
                          setSignupMessage(res);
                        }
                      }
                    } catch (err) {
                      console.error("Signup action error:", err);
                      setSignupMessage({
                        success: false,
                        message: "Operation failed",
                      });
                    } finally {
                      setSignupLoading(false);
                    }
                  }}
                  disabled={signupLoading}
                >
                  {signupLoading
                    ? signupAction === "signup"
                      ? "Signing up..."
                      : "Cancelling..."
                    : signupAction === "signup"
                      ? "Yes, Sign Up"
                      : "Yes, Cancel"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EVENT DETAILS MODAL */}
        {showDetailsModal && selectedAnnouncement && (
          <div
            className="logout-modal-overlay resident-ann-details-overlay"
            onClick={() => setShowDetailsModal(false)}
          >
            <div
              className="history-modal resident-ann-details-shell"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="history-modal-header resident-ann-details-header">
                <div className="resident-ann-details-header-left">
                  <div className="resident-ann-details-badges">
                    <span className="resident-ann-chip resident-ann-chip-category">
                      {selectedAnnouncement.category?.toUpperCase() ||
                        "ANNOUNCEMENT"}
                    </span>
                    <span className="resident-ann-chip resident-ann-chip-priority">
                      {(
                        selectedAnnouncement.priority || "normal"
                      ).toUpperCase()}
                    </span>
                  </div>
                  <h3 className="history-modal-title resident-ann-details-title">
                    {getAnnouncementTitle(selectedAnnouncement)}
                  </h3>
                  <p className="history-modal-sub resident-ann-details-sub">
                    Posted{" "}
                    {formatDateTimeReadable(selectedAnnouncement.created_at)}
                  </p>
                </div>
                <button
                  className="history-modal-close"
                  onClick={() => setShowDetailsModal(false)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    width="20"
                    height="20"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="history-modal-body resident-ann-details-body">
                <div className="resident-ann-section">
                  <div className="resident-ann-section-title">Description</div>
                  <p className="resident-ann-desc">
                    {getAnnouncementDescription(selectedAnnouncement)}
                  </p>
                </div>

                {selectedAnnouncement.category?.toLowerCase() === "event" && (
                  <div className="resident-ann-section">
                    <div className="resident-ann-section-title">
                      Event Schedule
                    </div>
                    <div className="resident-ann-info-grid">
                      <div className="resident-ann-info-item">
                        <span>Start</span>
                        <strong>
                          {formatDateTimeReadable(
                            selectedAnnouncement.event_start,
                          )}
                        </strong>
                      </div>
                      <div className="resident-ann-info-item">
                        <span>End</span>
                        <strong>
                          {formatDateTimeReadable(
                            selectedAnnouncement.event_end,
                          )}
                        </strong>
                      </div>
                      <div className="resident-ann-info-item">
                        <span>Duration</span>
                        <strong>
                          {getEventDuration(selectedAnnouncement)}
                        </strong>
                      </div>
                      <div className="resident-ann-info-item">
                        <span>Participants</span>
                        <strong>
                          {(participantCounts &&
                            participantCounts[selectedAnnouncement.id]) ||
                            0}
                          {selectedAnnouncement.max_participants
                            ? ` / ${selectedAnnouncement.max_participants}`
                            : " / Unlimited"}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                <div className="resident-ann-section">
                  <div className="resident-ann-section-title">Requirements</div>
                  {getTargetingChips(selectedAnnouncement).length > 0 ? (
                    <div className="resident-ann-chip-wrap">
                      {getTargetingChips(selectedAnnouncement).map((chip) => (
                        <span key={chip} className="resident-ann-filter-chip">
                          {chip}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="resident-ann-empty">
                      No specific requirements. Open to the selected audience.
                    </div>
                  )}
                </div>

                <div className="resident-ann-actions">
                  {selectedAnnouncement.category?.toLowerCase() === "event" && (
                    userSignups && userSignups[selectedAnnouncement.id] ? (
                      <button
                        className="ann-signup-btn cancel"
                        style={{ flex: 1, padding: "12px" }}
                        onClick={() => {
                          setShowDetailsModal(false);
                          setSignupMessage(null);
                          setSignupAction("cancel");
                          setShowSignupModal(true);
                        }}
                      >
                        Cancel Signup
                      </button>
                    ) : (
                      <button
                        className="ann-signup-btn"
                        style={{ flex: 1, padding: "12px" }}
                        onClick={() => {
                          setShowDetailsModal(false);
                          setSignupMessage(null);
                          setSignupAction("signup");
                          setShowSignupModal(true);
                        }}
                      >
                        Sign Up for Event
                      </button>
                    )
                  )}
                  <button
                    className="logout-modal-no"
                    style={{ flex: 1, padding: "12px" }}
                    onClick={() => setShowDetailsModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Announcements;
