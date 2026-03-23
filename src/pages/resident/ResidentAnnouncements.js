import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAnnouncements,
  signupForEvent,
  cancelSignup,
} from "../../supabse_db/announcement/announcement";
import { logout } from "../../supabse_db/auth/auth";
import { fetchAnnouncementImages } from "../../supabse_db/uploadImages";
import { useAuth } from "../../context/AuthContext";
import ResidentSidebar from "../../components/ResidentSidebar";
import ResidentSettings from "../../components/ResidentSettings";
import "../../styles/UserPages.css";

const Announcements = () => {
  const navigate = useNavigate();
  const { authUser, userLoading, userName } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [announcementImages, setAnnouncementImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupMessage, setSignupMessage] = useState(null);
  const [signupAction, setSignupAction] = useState("signup");
  const [userSignups, setUserSignups] = useState({});
  const [participantCounts, setParticipantCounts] = useState({});

  useEffect(() => {
    if (userLoading || !authUser) return;

    const fetchData = async () => {
      const result = await getAnnouncements();
      if (result.success) {
        const residentAnnouncements = (result.data || []).filter(
          (announcement) =>
            String(announcement.audience || "")
              .trim()
              .toLowerCase() === "residents",
        );

        setAnnouncements(residentAnnouncements);
        const imageMap = {};
        const imagePromises = residentAnnouncements.map(async (ann) => {
          const imageResult = await fetchAnnouncementImages(ann.id);
          if (imageResult.success && imageResult.images.length > 0) {
            imageMap[ann.id] = imageResult.images[0].url;
          }
        });
        await Promise.all(imagePromises);
        setAnnouncementImages(imageMap);

        // Use participant_count from vw_events_with_participant_count
        const eventAnns = residentAnnouncements.filter(
          (a) => a.category && String(a.category).toLowerCase() === "event",
        );
        const counts = {};
        eventAnns.forEach((a) => {
          counts[a.id] = Number(a.participant_count) || 0;
        });
        setParticipantCounts(counts);
      }

      setLoading(false);
    };

    fetchData();
  }, [authUser, userLoading]);

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

  const toReadableLabel = (value) => {
    if (!value) return "—";
    return String(value)
      .replace(/[_-]/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
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
      chips.push(
        `Sex: ${announcement.sex === "M" ? "Male" : announcement.sex === "F" ? "Female" : announcement.sex}`,
      );
    }

    if (ageMin !== null && ageMin !== undefined && ageMin !== "") {
      chips.push(`Min Age: ${ageMin}`);
    }
    if (ageMax !== null && ageMax !== undefined && ageMax !== "") {
      chips.push(`Max Age: ${ageMax}`);
    }

    if (toArray(announcement?.voter_status).length > 0) {
      chips.push(
        `Voter Status: ${toArray(announcement.voter_status)
          .map((v) => toReadableLabel(v))
          .join(", ")}`,
      );
    }

    if (toArray(announcement?.occupation).length > 0) {
      chips.push(`Occupation: ${toArray(announcement.occupation).join(", ")}`);
    }

    if (toArray(announcement?.religion).length > 0) {
      chips.push(`Religion: ${toArray(announcement.religion).join(", ")}`);
    }

    if (toArray(announcement?.civil_status).length > 0) {
      chips.push(
        `Civil Status: ${toArray(announcement.civil_status)
          .map((status) => toReadableLabel(status))
          .join(", ")}`,
      );
    }

    if (stayMin !== null && stayMin !== undefined && stayMin !== "") {
      chips.push(`Minimum Years of Stay: ${stayMin}`);
    }
    if (stayMax !== null && stayMax !== undefined && stayMax !== "") {
      chips.push(`Maximum Years of Stay: ${stayMax}`);
    }

    return chips;
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
                    {/* LEFT: IMAGE */}
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

                    {/* RIGHT: CONTENT */}
                    <div className="ann-body">
                      {/* TOP ROW */}
                      <div className="ann-meta-top">
                        <div className="ann-category-icon">
                          {getCategoryIcon(ann.category)}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            flex: 1,
                          }}
                        >
                          <div className="ann-title">{ann.title}</div>
                          {ann.priority &&
                            ann.priority.toLowerCase() !== "normal" &&
                            ann.priority.toLowerCase() !== "low" && (
                              <div className={getPriorityClass(ann.priority)}>
                                {ann.priority.toUpperCase()}
                              </div>
                            )}
                        </div>
                      </div>

                      {/* METADATA */}
                      <div className="ann-meta-left">
                        Posted by {ann.author || "Barangay"} •{" "}
                        {formatDate(ann.created_at)}
                      </div>

                      {/* DESCRIPTION */}
                      <div className="ann-description">{ann.content}</div>

                      {/* FOOTER */}
                      <div className="ann-footer">
                        <div className="ann-category">
                          {ann.category?.toUpperCase() || "ANNOUNCEMENT"}
                        </div>

                        <button
                          className="ann-signup-btn"
                          onClick={() => {
                            setSelectedAnnouncement(ann);
                            setShowDetailsModal(true);
                          }}
                        >
                          View Details
                        </button>

                        {ann.category &&
                          ann.category.toLowerCase() === "event" && (
                            <>
                              {typeof ann.max_participants !== "undefined" &&
                                ann.max_participants !== null && (
                                  <span className="ann-slots">
                                    {((participantCounts &&
                                      participantCounts[ann.id]) ||
                                      0) +
                                      " / " +
                                      ann.max_participants}
                                  </span>
                                )}

                              {userSignups && userSignups[ann.id] && (
                                <button
                                  className="ann-signup-btn cancel"
                                  onClick={() => {
                                    setSelectedAnnouncement(ann);
                                    setSignupMessage(null);
                                    setSignupAction("cancel");
                                    setShowSignupModal(true);
                                  }}
                                >
                                  Cancel Signup
                                </button>
                              )}
                            </>
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
              <h3 className="logout-modal-title">
                Confirm {signupAction === "signup" ? "Signup" : "Cancellation"}
              </h3>
              <p>
                Are you sure you want to{" "}
                {signupAction === "signup"
                  ? "sign up for"
                  : "cancel your signup for"}{" "}
                <b>{selectedAnnouncement.title}</b>?
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
                        setSignupMessage(res);
                        if (res && res.success) {
                          setUserSignups((s) => ({
                            ...s,
                            [selectedAnnouncement.id]: true,
                          }));
                          setParticipantCounts((c) => ({
                            ...c,
                            [selectedAnnouncement.id]:
                              (c[selectedAnnouncement.id] || 0) + 1,
                          }));
                          setTimeout(() => {
                            setShowSignupModal(false);
                          }, 1000);
                        }
                      } else {
                        const res = await cancelSignup(selectedAnnouncement.id);
                        setSignupMessage(res);
                        if (res && res.success) {
                          setUserSignups((s) => {
                            const n = { ...s };
                            delete n[selectedAnnouncement.id];
                            return n;
                          });
                          setParticipantCounts((c) => ({
                            ...c,
                            [selectedAnnouncement.id]: Math.max(
                              0,
                              (c[selectedAnnouncement.id] || 1) - 1,
                            ),
                          }));
                          setTimeout(() => {
                            setShowSignupModal(false);
                          }, 400);
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
                      {(selectedAnnouncement.priority || "normal").toUpperCase()}
                    </span>
                  </div>
                  <h3 className="history-modal-title resident-ann-details-title">
                    {selectedAnnouncement.title}
                  </h3>
                  <p className="history-modal-sub resident-ann-details-sub">
                    Posted {formatDateTimeReadable(selectedAnnouncement.created_at)}
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
                <div className="resident-ann-kpi-grid">
                  <div className="resident-ann-kpi-card">
                    <span className="resident-ann-kpi-label">Audience</span>
                    <span className="resident-ann-kpi-value" style={{ textTransform: "capitalize" }}>
                      {selectedAnnouncement.audience || "Residents"}
                    </span>
                  </div>
                  <div className="resident-ann-kpi-card">
                    <span className="resident-ann-kpi-label">SMS Notification</span>
                    <span className="resident-ann-kpi-value">
                      {selectedAnnouncement.send_sms ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <div className="resident-ann-kpi-card">
                    <span className="resident-ann-kpi-label">Event Status</span>
                    <span className="resident-ann-kpi-value">
                      {selectedAnnouncement.category?.toLowerCase() === "event"
                        ? getEventStatus(selectedAnnouncement)
                        : "N/A"}
                    </span>
                  </div>
                  <div className="resident-ann-kpi-card">
                    <span className="resident-ann-kpi-label">Target Rules</span>
                    <span className="resident-ann-kpi-value">
                      {getTargetingChips(selectedAnnouncement).length}
                    </span>
                  </div>
                </div>

                <div className="resident-ann-section">
                  <div className="resident-ann-section-title">Description</div>
                  <p className="resident-ann-desc">{selectedAnnouncement.content}</p>
                </div>

                {selectedAnnouncement.category?.toLowerCase() === "event" && (
                  <div className="resident-ann-section">
                    <div className="resident-ann-section-title">Event Schedule</div>
                    <div className="resident-ann-info-grid">
                      <div className="resident-ann-info-item">
                        <span>Start</span>
                        <strong>{formatDateTimeReadable(selectedAnnouncement.event_start)}</strong>
                      </div>
                      <div className="resident-ann-info-item">
                        <span>End</span>
                        <strong>{formatDateTimeReadable(selectedAnnouncement.event_end)}</strong>
                      </div>
                      <div className="resident-ann-info-item">
                        <span>Duration</span>
                        <strong>{getEventDuration(selectedAnnouncement)}</strong>
                      </div>
                      <div className="resident-ann-info-item">
                        <span>Participants</span>
                        <strong>
                          {(participantCounts && participantCounts[selectedAnnouncement.id]) || 0}
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
                  {selectedAnnouncement.category?.toLowerCase() === "event" &&
                    (userSignups && userSignups[selectedAnnouncement.id] ? (
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
                    ))}
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
