import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import supabase from "../../supabse_db/supabase_client";
import {
  signupForEvent,
  cancelSignup,
} from "../../supabse_db/announcement/announcement";
import { useAnnouncementsForRole } from "../../hooks/useAnnouncementsForRole";
import "../../styles/BarangayOfficial.css";

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const OfficialAnnouncements = () => {
  // Use the centralized announcement hook for role-based data
  const {
    announcements,
    announcementImages,
    participantCounts,
    loading,
    refresh,
  } = useAnnouncementsForRole("officials");

  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupMessage, setSignupMessage] = useState(null);
  const [signupAction, setSignupAction] = useState("signup");
  const [userSignups, setUserSignups] = useState({});
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const searchTerms = Array.from(
    new Set(searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean)),
  );

  const highlightText = (value) => {
    const text = String(value ?? "");
    if (!searchTerms.length || !text) return text;

    const pattern = new RegExp(
      `(${searchTerms.map((term) => escapeRegExp(term)).join("|")})`,
      "gi",
    );

    return text.split(pattern).map((part, index) => {
      const isMatch = searchTerms.includes(part.toLowerCase());
      if (!isMatch) return part;
      return (
        <mark
          key={`${part}-${index}`}
          style={{
            backgroundColor: "#fde68a",
            color: "#1f2937",
            padding: "0 2px",
            borderRadius: "2px",
          }}
        >
          {part}
        </mark>
      );
    });
  };

  const getAnnouncementTitle = (announcement) => {
    const title =
      announcement?.title ||
      announcement?.subject ||
      announcement?.name ||
      "Untitled Announcement";
    return String(title).trim() || "Untitled Announcement";
  };

  const getAnnouncementDescription = (announcement) => {
    const description =
      announcement?.content ||
      announcement?.description ||
      announcement?.body ||
      "";
    return String(description).trim() || "No description provided.";
  };

  useEffect(() => {
    const loadUserSignups = async () => {
      const { data: userData } = await supabase.auth.getUser();

      // Load user signups for events
      const eventAnns = announcements.filter(
        (a) => a.category && String(a.category).toLowerCase() === "event",
      );
      if (eventAnns.length > 0 && userData?.user) {
        try {
          const annIds = eventAnns.map((a) => a.id);
          const { data: signupRows, error: signupError } = await supabase
            .from("event_participants")
            .select("announcement_id")
            .in("announcement_id", annIds)
            .eq("user_uid", userData.user.id);
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
  }, [announcements]);

  useEffect(() => {
    if (showSignupModal || showDetailsModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showSignupModal, showDetailsModal]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
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
    if (cat === "event")
      return { label: "Event", color: "#8b5cf6", bg: "#f5f3ff", icon: "📅" };
    if (cat === "alert")
      return { label: "Alert", color: "#ef4444", bg: "#fef2f2", icon: "🚨" };
    return { label: "General", color: "#10b981", bg: "#f0fdf4", icon: "📢" };
  };

  const getPriorityConfig = (priority) => {
    const p = (priority || "").toLowerCase();
    if (p === "high") return { label: "HIGH", color: "#dc2626", bg: "#fef2f2" };
    if (p === "urgent")
      return { label: "URGENT", color: "#9f1239", bg: "#fff1f2" };
    if (p === "medium")
      return { label: "MED", color: "#d97706", bg: "#fffbeb" };
    return null;
  };

  const filterOptions = [
    { key: "all", label: "All" },
    { key: "event", label: "Events" },
    { key: "general", label: "General" },
    { key: "alert", label: "Alerts" },
  ];

  const filteredAnnouncements = announcements.filter((ann) => {
    const cat = (ann.category || "general").toLowerCase();
    const matchesFilter = activeFilter === "all" || cat === activeFilter;
    const searchableColumns = [
      getAnnouncementTitle(ann),
      getAnnouncementDescription(ann),
      ann.author || "Barangay",
      formatDateShort(ann.created_at),
      formatDate(ann.event_start),
    ]
      .join(" ")
      .toLowerCase();
    const matchesSearch =
      searchTerms.length === 0 ||
      searchTerms.every((term) => searchableColumns.includes(term));
    return matchesFilter && matchesSearch;
  });

  const eventCount = announcements.filter(
    (a) => (a.category || "").toLowerCase() === "event",
  ).length;
  const signedUpCount = Object.keys(userSignups).length;

  const isSelectedAnnouncementEvent =
    selectedAnnouncement &&
    (selectedAnnouncement.category || "").toLowerCase() === "event";

  if (loading) {
    return (
      <div className="ann-page-root">
        <div className="ann-loading-state">
          <div className="ann-loading-spinner" />
          <span>Loading announcements...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ann-page-root">
      {/* ── Page Header ── */}
      <div className="ann-page-header">
        <div className="ann-page-header-left">
          <h1 className="ann-page-title">Announcements</h1>
          <p className="ann-page-subtitle">
            Stay updated with official barangay announcements
          </p>
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

      {/* ── Search & Filter Bar ── */}
      <div className="ann-toolbar">
        <div className="ann-search-wrap">
          <svg
            className="ann-search-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="16"
            height="16"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
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

      {/* ── Count Label ── */}
      <div className="ann-count-label">
        Showing {filteredAnnouncements.length} of {announcements.length}{" "}
        announcements
      </div>

      {/* ── Cards Grid ── */}
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
            const participantCount =
              (participantCounts && participantCounts[ann.id]) || 0;
            const hasImage = !!announcementImages[ann.id];
            const isEventFull =
              isEvent &&
              ann.max_participants &&
              participantCount >= ann.max_participants;
            const fillPct = ann.max_participants
              ? Math.min(
                  100,
                  Math.round((participantCount / ann.max_participants) * 100),
                )
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
                    <div
                      className="ann-card-img-placeholder"
                      style={{ background: catConfig.bg }}
                    >
                      <span className="ann-card-img-emoji">
                        {catConfig.icon}
                      </span>
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
                      style={{
                        color: priorityConfig.color,
                        background: priorityConfig.bg,
                      }}
                    >
                      {priorityConfig.label}
                    </span>
                  )}
                </div>

                {/* Card Body */}
                <div className="ann-card-body">
                  <div className="ann-card-meta">
                    <span className="ann-card-author">
                      {highlightText(ann.author || "Barangay")}
                    </span>
                    <span className="ann-card-dot">·</span>
                    <span className="ann-card-date">
                      {highlightText(formatDateShort(ann.created_at))}
                    </span>
                  </div>

                  <h3 className="ann-card-title">
                    {highlightText(getAnnouncementTitle(ann))}
                  </h3>
                  <p className="ann-card-desc">
                    {highlightText(getAnnouncementDescription(ann))}
                  </p>

                  {/* Event details */}
                  {isEvent && ann.event_start && (
                    <div className="ann-card-event-row">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        width="13"
                        height="13"
                      >
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <path d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                      <span>
                        {highlightText(
                          new Date(ann.event_start).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          ),
                        )}
                      </span>
                    </div>
                  )}

                  {/* Participant bar */}
                  {isEvent && ann.max_participants && (
                    <div className="ann-card-participants">
                      <div className="ann-card-participants-label">
                        <span>
                          {participantCount} / {ann.max_participants} joined
                        </span>
                        <span>{fillPct}%</span>
                      </div>
                      <div className="ann-card-bar-track">
                        <div
                          className="ann-card-bar-fill"
                          style={{
                            width: `${fillPct}%`,
                            background:
                              fillPct >= 90
                                ? "#ef4444"
                                : fillPct >= 60
                                  ? "#f59e0b"
                                  : "#10b981",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Footer actions */}
                  <div className="ann-card-footer">
                    <button
                      className="ann-card-btn-outline"
                      onClick={() => {
                        setSelectedAnnouncement(ann);
                        setShowDetailsModal(true);
                      }}
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
                      <span
                        className="ann-card-posted"
                        style={{ marginLeft: "auto" }}
                      >
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

      {/* ── SIGNUP MODAL ── */}
      {showSignupModal &&
        selectedAnnouncement &&
        createPortal(
          <div
            className="ann-modal-overlay"
            onClick={() => setShowSignupModal(false)}
          >
            <div className="ann-modal-box" onClick={(e) => e.stopPropagation()}>
              <div className="ann-modal-icon">
                {signupAction === "signup" ? "🎉" : "⚠️"}
              </div>
              <h3 className="ann-modal-title">
                {signupAction === "signup"
                  ? "Confirm Sign Up"
                  : "Cancel Registration"}
              </h3>
              <p className="ann-modal-msg">
                Are you sure you want to{" "}
                {signupAction === "signup"
                  ? "sign up for"
                  : "cancel your signup for"}{" "}
                <strong>{selectedAnnouncement.title}</strong>?
              </p>
              {signupMessage && (
                <div
                  className={`ann-modal-feedback ${signupMessage.success ? "success" : "error"}`}
                >
                  {signupMessage.message}
                </div>
              )}
              <div className="ann-modal-actions">
                <button
                  className="ann-modal-btn-cancel"
                  onClick={() => setShowSignupModal(false)}
                  disabled={signupLoading}
                >
                  Dismiss
                </button>
                <button
                  className={`ann-modal-btn-confirm${signupAction === "cancel" ? " danger" : ""}`}
                  disabled={signupLoading}
                  onClick={async () => {
                    setSignupLoading(true);
                    setSignupMessage(null);
                    try {
                      if (signupAction === "signup") {
                        const res = await signupForEvent(
                          selectedAnnouncement.id,
                        );
                        if (res && res.success) {
                          // Update state immediately
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
                          // Update state immediately
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
                      setSignupMessage({
                        success: false,
                        message: "Operation failed",
                      });
                    } finally {
                      setSignupLoading(false);
                    }
                  }}
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
          </div>,
          document.body,
        )}

      {/* ── EVENT DETAILS MODAL ── */}
      {showDetailsModal &&
        selectedAnnouncement &&
        createPortal(
          <div
            className="ann-modal-overlay"
            onClick={() => setShowDetailsModal(false)}
          >
            <div
              className="ann-modal-box ann-modal-details"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="ann-details-modal-header">
                {announcementImages[selectedAnnouncement.id] ? (
                  <img
                    src={announcementImages[selectedAnnouncement.id]}
                    alt={selectedAnnouncement.title}
                    className="ann-details-modal-img"
                  />
                ) : (
                  <div
                    className="ann-details-modal-img-placeholder"
                    style={{
                      background: getCategoryConfig(
                        selectedAnnouncement.category,
                      ).bg,
                    }}
                  >
                    <span className="ann-details-modal-img-emoji">
                      {getCategoryConfig(selectedAnnouncement.category).icon}
                    </span>
                  </div>
                )}
                <div className="ann-details-modal-header-text">
                  <span
                    className="ann-details-modal-cat"
                    style={{
                      background: getCategoryConfig(
                        selectedAnnouncement.category,
                      ).color,
                    }}
                  >
                    {getCategoryConfig(selectedAnnouncement.category).label}
                  </span>
                  <h3 className="ann-details-modal-title">
                    {selectedAnnouncement.title}
                  </h3>
                  <p className="ann-details-modal-meta">
                    By {selectedAnnouncement.author || "Barangay"} ·{" "}
                    {formatDate(selectedAnnouncement.created_at)}
                  </p>
                </div>
                <button
                  className="ann-details-modal-close"
                  onClick={() => setShowDetailsModal(false)}
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
              </div>

              {/* Modal Scroll Body */}
              <div className="ann-details-modal-body">
                {/* Description */}
                <div className="ann-details-section">
                  <div className="ann-details-section-label">Description</div>
                  <p className="ann-details-section-text">
                    {selectedAnnouncement.content}
                  </p>
                </div>

                {/* Schedule */}
                {selectedAnnouncement.event_start && (
                  <div className="ann-details-section">
                    <div className="ann-details-section-label">
                      Event Schedule
                    </div>
                    <div className="ann-details-schedule-grid">
                      <div className="ann-details-schedule-item">
                        <span className="ann-details-schedule-key">Start</span>
                        <span className="ann-details-schedule-val">
                          {new Date(
                            selectedAnnouncement.event_start,
                          ).toLocaleString()}
                        </span>
                      </div>
                      {selectedAnnouncement.event_end && (
                        <div className="ann-details-schedule-item">
                          <span className="ann-details-schedule-key">End</span>
                          <span className="ann-details-schedule-val">
                            {new Date(
                              selectedAnnouncement.event_end,
                            ).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Participants */}
                {selectedAnnouncement.max_participants && (
                  <div className="ann-details-section">
                    <div className="ann-details-section-label">Slots</div>
                    <div className="ann-details-slots">
                      <div className="ann-details-slots-numbers">
                        <span className="ann-details-slots-filled">
                          {(participantCounts &&
                            participantCounts[selectedAnnouncement.id]) ||
                            0}
                        </span>
                        <span className="ann-details-slots-sep"> / </span>
                        <span className="ann-details-slots-total">
                          {selectedAnnouncement.max_participants}
                        </span>
                        <span className="ann-details-slots-label">
                          {" "}
                          slots filled
                        </span>
                      </div>
                      <div
                        className="ann-card-bar-track"
                        style={{ marginTop: 8 }}
                      >
                        <div
                          className="ann-card-bar-fill"
                          style={{
                            width: `${Math.min(100, Math.round(((participantCounts?.[selectedAnnouncement.id] || 0) / selectedAnnouncement.max_participants) * 100))}%`,
                            background: "#10b981",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Requirements */}
                {(selectedAnnouncement.age_group ||
                  selectedAnnouncement.voter_status ||
                  selectedAnnouncement.occupation ||
                  selectedAnnouncement.religion ||
                  selectedAnnouncement.civil_status ||
                  selectedAnnouncement.sex) && (
                  <div className="ann-details-section">
                    <div className="ann-details-section-label">
                      Requirements
                    </div>
                    <div className="ann-details-reqs">
                      {[
                        {
                          key: "Age Group",
                          val: selectedAnnouncement.age_group,
                        },
                        {
                          key: "Voter Status",
                          val: selectedAnnouncement.voter_status,
                        },
                        {
                          key: "Occupation",
                          val: selectedAnnouncement.occupation,
                        },
                        { key: "Religion", val: selectedAnnouncement.religion },
                        {
                          key: "Civil Status",
                          val: selectedAnnouncement.civil_status,
                        },
                        {
                          key: "Sex",
                          val:
                            selectedAnnouncement.sex === "M"
                              ? "Male"
                              : selectedAnnouncement.sex === "F"
                                ? "Female"
                                : selectedAnnouncement.sex,
                        },
                      ]
                        .filter(
                          (r) =>
                            r.val &&
                            (Array.isArray(r.val) ? r.val.length > 0 : true),
                        )
                        .map((req) => (
                          <div key={req.key} className="ann-details-req-row">
                            <span className="ann-details-req-key">
                              {req.key}
                            </span>
                            <span className="ann-details-req-val">
                              {Array.isArray(req.val)
                                ? req.val.join(", ")
                                : req.val}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="ann-details-modal-footer">
                <button
                  className="ann-modal-btn-cancel"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </button>
                {isSelectedAnnouncementEvent &&
                  (userSignups && userSignups[selectedAnnouncement.id] ? (
                    <button
                      className="ann-modal-btn-confirm danger"
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
                      className="ann-modal-btn-confirm"
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
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default OfficialAnnouncements;
