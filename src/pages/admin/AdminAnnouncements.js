import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Trash2, Calendar, X, Eye, Users, Clock, Tag, AlertCircle } from "lucide-react";
import "../../styles/BarangayAdmin.css";
import {
  getAnnouncements,
  postAnnouncement,
  deleteAnnouncement,
  getAnnouncementParticipants,
} from "../../supabse_db/announcement/announcement";
import {
  uploadAnnouncementImage,
  fetchAnnouncementImages,
} from "../../supabse_db/uploadImages";

export default function AdminAnnouncements() {
  const [showModal, setShowModal] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementImages, setAnnouncementImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [posting, setPosting] = useState(false);
  const [formData, setFormData] = useState({
    category: "general",
    priority: "normal",
    title: "",
    content: "",
    imageFile: null,
    event_start: "",
    event_end: "",
    audience: "residents",
    max_participants: "",
  });
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const modalRef = useRef(null);
  const fileInputRef = useRef(null);

  console.log("AdminAnnouncements render, showModal=", showModal);

  // Fetch announcements on mount
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getAnnouncements();
        console.log("Announcements fetched:", result);
        if (result.success && Array.isArray(result.data)) {
          setAnnouncements(result.data);
          // Fetch images for each announcement
          const imageMap = {};
          for (const announcement of result.data) {
            const imageResult = await fetchAnnouncementImages(announcement.id);
            if (imageResult.success && imageResult.images.length > 0) {
              imageMap[announcement.id] = imageResult.images[0].url;
            }
          }
          setAnnouncementImages(imageMap);
        } else {
          console.error("Failed to fetch announcements:", result.message);
          setError(result.message);
        }
      } catch (err) {
        console.error("Error fetching announcements:", err);
        setError("Error fetching announcements");
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setShowModal(false);
    };
    window.addEventListener("keydown", onKey);

    // lock body scroll when modal is open
    if (showModal) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [showModal]);

  const openModal = () => {
    console.log("Opening modal...");
    setShowModal(true);
  };

  const closeModal = () => {
    console.log("Closing modal...");
    setShowModal(false);
  };

  const openAnnDetails = (ann) => setSelectedAnnouncement(ann);
  const closeAnnDetails = () => setSelectedAnnouncement(null);

  // Load participants whenever an event announcement is selected
  useEffect(() => {
    if (!selectedAnnouncement || selectedAnnouncement.category !== "event") {
      setParticipants([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setParticipantsLoading(true);
      try {
        const result = await getAnnouncementParticipants(selectedAnnouncement.id, selectedAnnouncement.audience);
        if (!cancelled) setParticipants(result.success ? result.data : []);
      } catch {
        if (!cancelled) setParticipants([]);
      } finally {
        if (!cancelled) setParticipantsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedAnnouncement]);

  // Escape key + scroll lock for details modal
  useEffect(() => {
    if (!selectedAnnouncement) return;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") closeAnnDetails(); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAnnouncement]);

  const handleDeleteAnnouncement = async (id) => {
    if (window.confirm("Are you sure you want to delete this announcement?")) {
      try {
        const result = await deleteAnnouncement(id);
        if (result.success) {
          console.log("Announcement deleted successfully");
          setAnnouncements(announcements.filter((ann) => ann.id !== id));
        } else {
          alert("Error deleting announcement: " + result.message);
        }
      } catch (err) {
        console.error("Error deleting announcement:", err);
        alert("Error deleting announcement");
      }
    }
  };

  const handlePostAnnouncement = async () => {
    if (!formData.title.trim()) {
      alert("Please enter a title");
      return;
    }
    if (!formData.content.trim()) {
      alert("Please enter content");
      return;
    }

    const isEventCategory = formData.category === "event";
    if (isEventCategory && !formData.event_start) {
      alert("Please select an event start date and time");
      return;
    }

    if (isEventCategory && !formData.event_end) {
      alert("Please select an event end date and time");
      return;
    }

    if (
      isEventCategory &&
      formData.event_start &&
      formData.event_end &&
      new Date(formData.event_end) < new Date(formData.event_start)
    ) {
      alert("Event end must be after event start");
      return;
    }

    if (
      isEventCategory &&
      formData.max_participants &&
      Number(formData.max_participants) <= 0
    ) {
      alert("Max participants must be greater than 0");
      return;
    }

    const eventData = isEventCategory
      ? {
          event_start: formData.event_start || null,
          event_end: formData.event_end || null,
          audience: formData.audience || null,
          max_participants: formData.max_participants
            ? Number(formData.max_participants)
            : null,
        }
      : {
          event_start: null,
          event_end: null,
          audience: null,
          max_participants: null,
        };

    try {
      setPosting(true);
      console.log("Posting announcement:", formData);
      console.log(
        "Category value being sent:",
        formData.category,
        "Type:",
        typeof formData.category,
      );
      console.log(
        "Priority value being sent:",
        formData.priority,
        "Type:",
        typeof formData.priority,
      );
      const result = await postAnnouncement(
        formData.category,
        formData.priority,
        formData.title,
        formData.content,
        eventData,
      );

      if (result.success) {
        console.log("Announcement posted successfully:", result.data);

        // Upload image if provided
        if (formData.imageFile) {
          const announcementID = result.data?.id;
          if (announcementID) {
            const uploadResult = await uploadAnnouncementImage(
              formData.imageFile,
              announcementID,
            );
            if (uploadResult.success) {
              console.log(
                "Announcement image uploaded successfully:",
                uploadResult,
              );
            } else {
              console.error(
                "Error uploading announcement image:",
                uploadResult.error,
              );
              alert(
                "Announcement created but image upload failed: " +
                  uploadResult.error,
              );
            }
          } else {
            console.warn("No announcement ID returned from server");
          }
        }

        // Reset form
        setFormData({
          category: "general",
          priority: "normal",
          title: "",
          content: "",
          imageFile: null,
          event_start: "",
          event_end: "",
          audience: "residents",
          max_participants: "",
        });
        closeModal();
        // Refresh announcements list
        const refreshResult = await getAnnouncements();
        if (refreshResult.success && Array.isArray(refreshResult.data)) {
          setAnnouncements(refreshResult.data);
          // Fetch images for new announcements
          const imageMap = { ...announcementImages };
          for (const announcement of refreshResult.data) {
            if (!imageMap[announcement.id]) {
              const imageResult = await fetchAnnouncementImages(
                announcement.id,
              );
              if (imageResult.success && imageResult.images.length > 0) {
                imageMap[announcement.id] = imageResult.images[0].url;
              }
            }
          }
          setAnnouncementImages(imageMap);
        }
      } else {
        alert("Error posting announcement: " + result.message);
      }
    } catch (err) {
      console.error("Error posting announcement:", err);
      alert("Error posting announcement");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="admin-page announcements-wrap">
      {/* subtitle & action button moved below shared header */}
      <div style={{ marginBottom: "18px" }}>
        <p className="muted">Create and monitor official barangay updates</p>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "18px",
        }}
      >
        <button className="btn-new-ann" onClick={openModal}>
          + New Announcement
        </button>
      </div>

      {loading && (
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <div className="loading-wrap">
            <div className="loading-spinner" aria-hidden="true"></div>
            <div className="loading-text">Loading announcements...</div>
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "1rem",
            marginBottom: "1.5rem",
            backgroundColor: "#fee2e2",
            borderRadius: "0.5rem",
            color: "#991b1b",
          }}
        >
          Error: {error}
        </div>
      )}

      <div className="announcements-list">
        {announcements && announcements.length > 0
          ? announcements.map((it) => (
              <div key={it.id} className={`announcement-card`}>
                <div className="announcement-left">
                  <img
                    src={
                      announcementImages[it.id] ||
                      "https://via.placeholder.com/160x100?text=Announcement"
                    }
                    alt={it.title}
                    onError={(e) => {
                      e.target.src =
                        "https://via.placeholder.com/160x100?text=Announcement";
                    }}
                  />
                </div>

                <div className="announcement-right">
                  <div className="announcement-right-top">
                    <div className="ann-icon">
                      <Calendar size={18} />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        flex: 1,
                      }}
                    >
                      <div className="ann-title">{it.title}</div>
                      {it.priority && (
                        <div
                          className={`priority-pill priority-${it.priority.toLowerCase()}`}
                        >
                          {it.priority.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="ann-actions">
                      <button
                        className="ann-view-btn"
                        title="View Details"
                        onClick={() => openAnnDetails(it)}
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        className="ann-trash"
                        title="Delete"
                        onClick={() => handleDeleteAnnouncement(it.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="ann-meta">
                    Posted by Barangay •{" "}
                    {new Date(it.created_at).toLocaleDateString()}
                  </div>
                  <div className="ann-desc">{it.content}</div>
                  <div className="ann-foot">
                    <div className="ann-tag">
                      {it.category?.toUpperCase() || "ANNOUNCEMENT"}
                    </div>
                  </div>
                </div>
              </div>
            ))
          : !loading && (
              <div
                style={{ padding: "2rem", textAlign: "center", color: "#999" }}
              >
                <p>No announcements yet. Create one to get started!</p>
              </div>
            )}
      </div>

      {/* Announcement Details Modal */}
      {selectedAnnouncement &&
        createPortal(
          <div
            className="ann-details-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeAnnDetails();
            }}
          >
            <div className="ann-details-shell">
              {/* Header */}
              <div className="ann-details-header">
                <div className="ann-details-header-left">
                  <div className="ann-details-badges">
                    <span
                      className={`ann-details-category-badge cat-${
                        selectedAnnouncement.category?.toLowerCase() ||
                        "general"
                      }`}
                    >
                      {selectedAnnouncement.category?.toUpperCase() ||
                        "GENERAL"}
                    </span>
                    <span
                      className={`priority-pill priority-${
                        selectedAnnouncement.priority?.toLowerCase() ||
                        "normal"
                      }`}
                    >
                      {selectedAnnouncement.priority?.toUpperCase() ||
                        "NORMAL"}
                    </span>
                  </div>
                  <h2 className="ann-details-title">
                    {selectedAnnouncement.title}
                  </h2>
                  <p className="ann-details-meta">
                    Posted{" "}
                    {new Date(
                      selectedAnnouncement.created_at,
                    ).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <button
                  className="ann-details-close"
                  onClick={closeAnnDetails}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="ann-details-content">
                {/* Full content */}
                <div className="ann-details-section">
                  <div className="ann-details-section-header">
                    <Tag size={15} />
                    Content
                  </div>
                  <p className="ann-details-content-text">
                    {selectedAnnouncement.content}
                  </p>
                </div>

                {/* Event-only sections */}
                {selectedAnnouncement.category === "event" && (
                  <>
                    {/* Event details */}
                    <div className="ann-details-section">
                      <div className="ann-details-section-header">
                        <Clock size={15} />
                        Event Details
                      </div>
                      <div className="ann-details-info-grid">
                        <div className="ann-details-info-row">
                          <span className="ann-details-info-label">
                            Event Start
                          </span>
                          <span className="ann-details-info-value">
                            {selectedAnnouncement.event_start
                              ? new Date(
                                  selectedAnnouncement.event_start,
                                ).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "—"}
                          </span>
                        </div>
                        <div className="ann-details-info-row">
                          <span className="ann-details-info-label">
                            Event End
                          </span>
                          <span className="ann-details-info-value">
                            {selectedAnnouncement.event_end
                              ? new Date(
                                  selectedAnnouncement.event_end,
                                ).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "—"}
                          </span>
                        </div>
                        <div className="ann-details-info-row">
                          <span className="ann-details-info-label">
                            Audience
                          </span>
                          <span
                            className="ann-details-info-value"
                            style={{ textTransform: "capitalize" }}
                          >
                            {selectedAnnouncement.audience || "—"}
                          </span>
                        </div>
                        <div className="ann-details-info-row">
                          <span className="ann-details-info-label">
                            Max Participants
                          </span>
                          <span className="ann-details-info-value">
                            {selectedAnnouncement.max_participants ??
                              "Unlimited"}
                          </span>
                        </div>
                      </div>

                      {/* Fill bar */}
                      {selectedAnnouncement.max_participants && (
                        <div className="ann-details-fill-wrap">
                          <div className="ann-details-fill-label">
                            <span>
                              <Users size={13} /> Participants signed up
                            </span>
                            <span>
                              {participantsLoading
                                ? "..."
                                : participants.length}{" "}
                              /{" "}
                              {selectedAnnouncement.max_participants}
                            </span>
                          </div>
                          <div className="ann-details-fill-bar">
                            <div
                              className="ann-details-fill-inner"
                              style={{
                                width: participantsLoading
                                  ? "0%"
                                  : `${Math.min(
                                      100,
                                      (participants.length /
                                        selectedAnnouncement.max_participants) *
                                        100,
                                    )}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Participants list */}
                    <div className="ann-details-section">
                      <div className="ann-details-section-header">
                        <Users size={15} />
                        Participants
                        {!participantsLoading && (
                          <span className="ann-details-count-chip">
                            {participants.length}
                          </span>
                        )}
                      </div>

                      {participantsLoading ? (
                        <div className="ann-details-loading">
                          <div
                            className="loading-spinner"
                            aria-hidden="true"
                          />
                          Loading participants...
                        </div>
                      ) : participants.length === 0 ? (
                        <div className="ann-details-empty">
                          <AlertCircle size={18} />
                          No participants have signed up yet.
                        </div>
                      ) : (
                        <div className="ann-details-table-wrap">
                          <table className="ann-details-table">
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Full Name</th>
                                <th>Email</th>
                                <th>
                                  {selectedAnnouncement.audience?.toLowerCase() === "officials"
                                    ? "Role"
                                    : "Contact Number"}
                                </th>
                                <th>Signed Up At</th>
                              </tr>
                            </thead>
                            <tbody>
                              {participants.map((p, idx) => (
                                <tr key={p.participantId}>
                                  <td className="muted">{idx + 1}</td>
                                  <td>{p.fullName}</td>
                                  <td>{p.email}</td>
                                  <td style={{ textTransform: "capitalize" }}>
                                    {selectedAnnouncement.audience?.toLowerCase() === "officials"
                                      ? p.role
                                      : p.contactNumber}
                                  </td>
                                  <td className="muted">
                                    {new Date(
                                      p.signedUpAt,
                                    ).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Modal - TEST VERSION */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "600px",
              width: "90%",
              maxHeight: "90vh",
              overflow: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              zIndex: 10000,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h4 style={{ margin: 0, fontSize: "20px", color: "#065f46" }}>
                Create Announcement
              </h4>
              <button
                onClick={closeModal}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#999",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              {/* Category and Priority */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontWeight: "500",
                      fontSize: "14px",
                    }}
                  >
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      const nextCategory = e.target.value;
                      setFormData({
                        ...formData,
                        category: nextCategory,
                        ...(nextCategory !== "event"
                          ? {
                              event_start: "",
                              event_end: "",
                              audience: "residents",
                              max_participants: "",
                            }
                          : {}),
                      });
                    }}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      fontFamily: "inherit",
                    }}
                  >
                    <option value="general">General</option>
                    <option value="event">Event</option>
                    <option value="alert">Alert</option>
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontWeight: "500",
                      fontSize: "14px",
                    }}
                  >
                    Priority Level
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      fontFamily: "inherit",
                    }}
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontWeight: "500",
                    fontSize: "14px",
                  }}
                >
                  Title
                </label>
                <input
                  type="text"
                  placeholder="E.g., Monthly Clean-up Drive"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Content */}
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontWeight: "500",
                    fontSize: "14px",
                  }}
                >
                  Content
                </label>
                <textarea
                  rows={4}
                  placeholder="Details about the announcement..."
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                    resize: "vertical",
                  }}
                />
              </div>

              {formData.category === "event" && (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "16px",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "6px",
                          fontWeight: "500",
                          fontSize: "14px",
                        }}
                      >
                        Event Start
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.event_start}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            event_start: e.target.value,
                          })
                        }
                        style={{
                          width: "100%",
                          padding: "10px",
                          border: "1px solid #ddd",
                          borderRadius: "6px",
                          fontFamily: "inherit",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "6px",
                          fontWeight: "500",
                          fontSize: "14px",
                        }}
                      >
                        Event End
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.event_end}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            event_end: e.target.value,
                          })
                        }
                        style={{
                          width: "100%",
                          padding: "10px",
                          border: "1px solid #ddd",
                          borderRadius: "6px",
                          fontFamily: "inherit",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "16px",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "6px",
                          fontWeight: "500",
                          fontSize: "14px",
                        }}
                      >
                        Audience
                      </label>
                      <select
                        value={formData.audience}
                        onChange={(e) =>
                          setFormData({ ...formData, audience: e.target.value })
                        }
                        style={{
                          width: "100%",
                          padding: "10px",
                          border: "1px solid #ddd",
                          borderRadius: "6px",
                          fontFamily: "inherit",
                        }}
                      >
                        <option value="residents">Residents</option>
                        <option value="officials">Officials</option>
                      </select>
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "6px",
                          fontWeight: "500",
                          fontSize: "14px",
                        }}
                      >
                        Max Participants
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="E.g., 50"
                        value={formData.max_participants}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            max_participants: e.target.value,
                          })
                        }
                        style={{
                          width: "100%",
                          padding: "10px",
                          border: "1px solid #ddd",
                          borderRadius: "6px",
                          fontFamily: "inherit",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Image Upload */}
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontWeight: "500",
                    fontSize: "14px",
                  }}
                >
                  Picture (Optional)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: "2px dashed #ddd",
                    borderRadius: "6px",
                    padding: "24px",
                    textAlign: "center",
                    cursor: "pointer",
                    backgroundColor: "#f9fafb",
                    transition: "all 0.2s",
                  }}
                >
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      marginBottom: "4px",
                    }}
                  >
                    Click to upload image
                  </div>
                  <div style={{ fontSize: "12px", color: "#999" }}>
                    PNG, JPG up to 10MB
                  </div>
                  {formData.imageFile && (
                    <div
                      style={{
                        marginTop: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        color: "#16a34a",
                        fontSize: "13px",
                      }}
                    >
                      <span>✓ {formData.imageFile.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData({ ...formData, imageFile: null });
                        }}
                        style={{
                          background: "#fee2e2",
                          color: "#991b1b",
                          border: "none",
                          borderRadius: "4px",
                          padding: "4px 8px",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: "500",
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setFormData({
                        ...formData,
                        imageFile: e.target.files[0],
                      });
                    }
                  }}
                  style={{ display: "none" }}
                />
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
                marginTop: "24px",
                paddingTop: "16px",
                borderTop: "1px solid #eee",
              }}
            >
              <button
                onClick={closeModal}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#fff",
                  color: "#333",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "500",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handlePostAnnouncement}
                disabled={posting}
                style={{
                  padding: "10px 20px",
                  backgroundColor: posting ? "#ccc" : "#16a34a",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: posting ? "not-allowed" : "pointer",
                  fontWeight: "500",
                }}
              >
                {posting ? "Posting..." : "Post Announcement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
