import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../supabse_db/supabase_client";
import {
  getAnnouncements,
  signupForEvent,
  cancelSignup,
} from "../../supabse_db/announcement/announcement";
import { fetchAnnouncementImages } from "../../supabse_db/uploadImages";
import {
  formatResidentFullName,
  getResidentByAuthUid,
} from "../../supabse_db/resident/resident";
import "../../styles/BarangayOfficial.css";

const OfficialAnnouncements = () => {
  const navigate = useNavigate();

  const [userName, setUserName] = useState("");
  const [announcements, setAnnouncements] = useState([]);
  const [announcementImages, setAnnouncementImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupMessage, setSignupMessage] = useState(null);
  const [signupAction, setSignupAction] = useState("signup");
  const [userSignups, setUserSignups] = useState({});
  const [participantCounts, setParticipantCounts] = useState({});

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
        const filteredAnnouncements = result.data.filter(
          (ann) =>
            ann.audience && String(ann.audience).toLowerCase() === "officials",
        );
        setAnnouncements(filteredAnnouncements);
        const imageMap = {};
        const imagePromises = result.data.map(async (ann) => {
          // Only process images for filtered announcements
          if (!filteredAnnouncements.find((fa) => fa.id === ann.id)) return;
          const imageResult = await fetchAnnouncementImages(ann.id);
          if (imageResult.success && imageResult.images.length > 0) {
            imageMap[ann.id] = imageResult.images[0].url;
          }
        });
        await Promise.all(imagePromises);
        setAnnouncementImages(imageMap);

        // fetch participant counts for event announcements that have max_participants
        const eventAnns = filteredAnnouncements.filter(
          (a) => a.category && String(a.category).toLowerCase() === "event",
        );
        if (eventAnns.length > 0) {
          const counts = {};
          await Promise.all(
            eventAnns.map(async (a) => {
              try {
                const { count, error } = await supabase
                  .from("event_participants")
                  .select("*", { count: "exact", head: true })
                  .eq("announcement_id", a.id);
                if (!error)
                  counts[a.id] = typeof count === "number" ? count : 0;
                else counts[a.id] = 0;
              } catch (err) {
                counts[a.id] = 0;
              }
            }),
          );
          setParticipantCounts(counts);
          // if logged in, fetch which events this official signed up for
          if (userData && userData.user) {
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
              // ignore
            }
          }
        }
      }

      setLoading(false);
    };

    fetchData();
  }, []);

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
    <div className="barangay-official-container">
      <div className="dashboard-header">
        <h1>Announcements</h1>
        <p>Stay updated with official barangay announcements</p>
      </div>

      {loading ? (
        <p style={{ color: "#888", padding: "0 2rem" }}>
          Loading announcements...
        </p>
      ) : announcements.length === 0 ? (
        <p style={{ color: "#888", padding: "0 2rem" }}>
          No announcements yet.
        </p>
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

                  {ann.category && ann.category.toLowerCase() === "event" && (
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

                      <button
                        className="ann-signup-btn"
                        onClick={() => {
                          setSelectedAnnouncement(ann);
                          setShowDetailsModal(true);
                        }}
                      >
                        View Details
                      </button>

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

      {/* SIGNUP CONFIRMATION MODAL */}
      {showSignupModal && selectedAnnouncement && (
        <div
          className="modal-overlay-official"
          onClick={() => setShowSignupModal(false)}
        >
          <div
            className="modal-content-official"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="modal-title-official">
              Confirm {signupAction === "signup" ? "Signup" : "Cancellation"}
            </h3>
            <p className="modal-message-official">
              Are you sure you want to{" "}
              {signupAction === "signup"
                ? "sign up for"
                : "cancel your signup for"}{" "}
              <b>{selectedAnnouncement.title}</b>?
            </p>
            {signupMessage && (
              <p
                style={{
                  color: signupMessage.success ? "green" : "red",
                  marginTop: "12px",
                }}
              >
                {signupMessage.message}
              </p>
            )}
            <div className="modal-actions-official">
              <button
                className="modal-btn-official cancel"
                onClick={() => setShowSignupModal(false)}
                disabled={signupLoading}
              >
                Cancel
              </button>
              <button
                className="modal-btn-official confirm"
                onClick={async () => {
                  setSignupLoading(true);
                  setSignupMessage(null);
                  try {
                    if (signupAction === "signup") {
                      const res = await signupForEvent(selectedAnnouncement.id);
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
          className="modal-overlay-official"
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            className="modal-content-official"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 520, maxHeight: "80vh", overflow: "auto" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "16px",
              }}
            >
              <div>
                <h3 className="modal-title-official">
                  {selectedAnnouncement.title}
                </h3>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#6b7280",
                    margin: "4px 0 0",
                  }}
                >
                  Event Details & Requirements
                </p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  color: "#9ca3af",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
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
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "#6b7280",
                    marginBottom: "6px",
                  }}
                >
                  Description
                </div>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#374151",
                    lineHeight: "1.6",
                    margin: 0,
                  }}
                >
                  {selectedAnnouncement.content}
                </p>
              </div>

              {selectedAnnouncement.event_start && (
                <div>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#6b7280",
                      marginBottom: "6px",
                    }}
                  >
                    Event Schedule
                  </div>
                  <div style={{ fontSize: "14px", color: "#374151" }}>
                    <div>
                      <strong>Start:</strong>{" "}
                      {new Date(
                        selectedAnnouncement.event_start,
                      ).toLocaleString()}
                    </div>
                    {selectedAnnouncement.event_end && (
                      <div>
                        <strong>End:</strong>{" "}
                        {new Date(
                          selectedAnnouncement.event_end,
                        ).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedAnnouncement.max_participants && (
                <div>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#6b7280",
                      marginBottom: "6px",
                    }}
                  >
                    Participants
                  </div>
                  <div style={{ fontSize: "14px", color: "#374151" }}>
                    {(participantCounts &&
                      participantCounts[selectedAnnouncement.id]) ||
                      0}{" "}
                    / {selectedAnnouncement.max_participants} slots filled
                  </div>
                </div>
              )}

              {(selectedAnnouncement.age_group ||
                selectedAnnouncement.voter_status ||
                selectedAnnouncement.occupation ||
                selectedAnnouncement.religion ||
                selectedAnnouncement.civil_status ||
                selectedAnnouncement.sex) && (
                <div>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#6b7280",
                      marginBottom: "8px",
                    }}
                  >
                    Requirements
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      padding: "12px",
                      background: "#f9fafb",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    {selectedAnnouncement.age_group &&
                      (Array.isArray(selectedAnnouncement.age_group)
                        ? selectedAnnouncement.age_group.length > 0
                        : selectedAnnouncement.age_group) && (
                        <div style={{ fontSize: "13px", color: "#374151" }}>
                          <strong>Age Group:</strong>{" "}
                          {Array.isArray(selectedAnnouncement.age_group)
                            ? selectedAnnouncement.age_group.join(", ")
                            : selectedAnnouncement.age_group}
                        </div>
                      )}
                    {selectedAnnouncement.voter_status &&
                      (Array.isArray(selectedAnnouncement.voter_status)
                        ? selectedAnnouncement.voter_status.length > 0
                        : selectedAnnouncement.voter_status) && (
                        <div style={{ fontSize: "13px", color: "#374151" }}>
                          <strong>Voter Status:</strong>{" "}
                          {Array.isArray(selectedAnnouncement.voter_status)
                            ? selectedAnnouncement.voter_status.join(", ")
                            : selectedAnnouncement.voter_status}
                        </div>
                      )}
                    {selectedAnnouncement.occupation &&
                      (Array.isArray(selectedAnnouncement.occupation)
                        ? selectedAnnouncement.occupation.length > 0
                        : selectedAnnouncement.occupation) && (
                        <div style={{ fontSize: "13px", color: "#374151" }}>
                          <strong>Occupation:</strong>{" "}
                          {Array.isArray(selectedAnnouncement.occupation)
                            ? selectedAnnouncement.occupation.join(", ")
                            : selectedAnnouncement.occupation}
                        </div>
                      )}
                    {selectedAnnouncement.religion &&
                      (Array.isArray(selectedAnnouncement.religion)
                        ? selectedAnnouncement.religion.length > 0
                        : selectedAnnouncement.religion) && (
                        <div style={{ fontSize: "13px", color: "#374151" }}>
                          <strong>Religion:</strong>{" "}
                          {Array.isArray(selectedAnnouncement.religion)
                            ? selectedAnnouncement.religion.join(", ")
                            : selectedAnnouncement.religion}
                        </div>
                      )}
                    {selectedAnnouncement.civil_status &&
                      (Array.isArray(selectedAnnouncement.civil_status)
                        ? selectedAnnouncement.civil_status.length > 0
                        : selectedAnnouncement.civil_status) && (
                        <div style={{ fontSize: "13px", color: "#374151" }}>
                          <strong>Civil Status:</strong>{" "}
                          {Array.isArray(selectedAnnouncement.civil_status)
                            ? selectedAnnouncement.civil_status.join(", ")
                            : selectedAnnouncement.civil_status}
                        </div>
                      )}
                    {selectedAnnouncement.sex && (
                      <div style={{ fontSize: "13px", color: "#374151" }}>
                        <strong>Sex:</strong>{" "}
                        {selectedAnnouncement.sex === "M"
                          ? "Male"
                          : selectedAnnouncement.sex === "F"
                            ? "Female"
                            : selectedAnnouncement.sex}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                {userSignups && userSignups[selectedAnnouncement.id] ? (
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
                )}
                <button
                  className="modal-btn-official cancel"
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
  );
};

export default OfficialAnnouncements;
