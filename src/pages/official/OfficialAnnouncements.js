import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../supabse_db/supabase_client";
import { getAnnouncements, signupForEvent, cancelSignup } from "../../supabse_db/announcement/announcement";
import { fetchAnnouncementImages } from "../../supabse_db/uploadImages";
import { formatResidentFullName, getResidentByAuthUid } from "../../supabse_db/resident/resident";
import "../../styles/BarangayOfficial.css";

const OfficialAnnouncements = () => {
  const navigate = useNavigate();

  const [userName, setUserName] = useState("");
  const [announcements, setAnnouncements] = useState([]);
  const [announcementImages, setAnnouncementImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [showSignupModal, setShowSignupModal] = useState(false);
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

        // fetch participant counts for event announcements that have max_participants
        const eventAnns = result.data.filter(
          (a) => a.category && String(a.category).toLowerCase() === "event"
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
                if (!error) counts[a.id] = typeof count === "number" ? count : 0;
                else counts[a.id] = 0;
              } catch (err) {
                counts[a.id] = 0;
              }
            })
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
        <p style={{ color: "#888", padding: "0 2rem" }}>Loading announcements...</p>
      ) : announcements.length === 0 ? (
        <p style={{ color: "#888", padding: "0 2rem" }}>No announcements yet.</p>
      ) : (
        <div className="ann-grid-official">
          {announcements.map((ann) => (
            <div className="ann-card-official" key={ann.id}>
              {/* IMAGE */}
              <div className="ann-image-official">
                {announcementImages[ann.id] ? (
                  <img src={announcementImages[ann.id]} alt={ann.title} />
                ) : (
                  <div className="ann-image-placeholder-official">
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
              <div className="ann-body-official">
                {/* Meta row: icon + category pill + priority badge */}
                <div className="ann-meta-top-official">
                  <div className="ann-meta-left-official">
                    <span className="ann-category-icon-official">
                      {getCategoryIcon(ann.category)}
                    </span>
                    {ann.category && (
                      <span className="ann-category-official">{ann.category}</span>
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

                <h3 className="ann-title-official">{ann.title}</h3>
                <p className="ann-description-official">{ann.content}</p>

                <div className="ann-footer-official">
                  <span className="ann-author-official">
                    {ann.author || "Admin"}
                  </span>
                  <span className="ann-date-official">
                    {formatDate(ann.created_at)}
                  </span>
                  {ann.category && ann.category.toLowerCase() === "event" && (
                    <>
                      {typeof ann.max_participants !== "undefined" && ann.max_participants !== null && (
                        <span className="ann-slots-official">
                          {((participantCounts && participantCounts[ann.id]) || 0) + " / " + ann.max_participants}
                        </span>
                      )}

                      {userSignups && userSignups[ann.id] ? (
                        <button
                          className="ann-signup-btn-official cancel"
                          onClick={() => {
                            setSelectedAnnouncement(ann);
                            setSignupMessage(null);
                            setSignupAction("cancel");
                            setShowSignupModal(true);
                          }}
                        >
                          Cancel Signup
                        </button>
                      ) : (
                        <button
                          className="ann-signup-btn-official"
                          onClick={() => {
                            setSelectedAnnouncement(ann);
                            setSignupMessage(null);
                            setSignupAction("signup");
                            setShowSignupModal(true);
                          }}
                        >
                          Sign Up
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
            <h3 className="modal-title-official">Confirm Signup</h3>
            <p className="modal-message-official">
              Are you sure you want to sign up for <b>{selectedAnnouncement.title}</b>?
            </p>
            {signupMessage && (
              <p style={{ color: signupMessage.success ? "green" : "red", marginTop: "12px" }}>
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
                        // update local state: mark as signed up and increment count
                        setUserSignups((s) => ({ ...s, [selectedAnnouncement.id]: true }));
                        setParticipantCounts((c) => ({ ...c, [selectedAnnouncement.id]: (c[selectedAnnouncement.id] || 0) + 1 }));
                        // close modal after short delay
                        setTimeout(() => {
                          setShowSignupModal(false);
                        }, 1000);
                      }
                    } else {
                      const res = await cancelSignup(selectedAnnouncement.id);
                      setSignupMessage(res);
                      if (res && res.success) {
                        // update local state: remove signup and decrement count
                        setUserSignups((s) => {
                          const n = { ...s };
                          delete n[selectedAnnouncement.id];
                          return n;
                        });
                        setParticipantCounts((c) => ({ ...c, [selectedAnnouncement.id]: Math.max(0, (c[selectedAnnouncement.id] || 1) - 1) }));
                        setTimeout(() => {
                          setShowSignupModal(false);
                        }, 400);
                      }
                    }
                  } catch (err) {
                    console.error("Signup action error:", err);
                    setSignupMessage({ success: false, message: "Operation failed" });
                  } finally {
                    setSignupLoading(false);
                  }
                }}
                disabled={signupLoading}
              >
                {signupLoading ? (signupAction === "signup" ? "Signing up..." : "Cancelling...") : signupAction === "signup" ? "Yes, Sign Up" : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficialAnnouncements;
