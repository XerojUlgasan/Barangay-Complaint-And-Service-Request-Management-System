import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import "../../styles/BarangayAdmin.css";
import "../../styles/RequestDetail.css";
import { getComplaints, getComplaintHistory } from "../../supabse_db/complaint/complaint";

const STATUS_COLORS = {
  Pending: "#fbbf24",
  "In Progress": "#3b82f6",
  Completed: "#10b981",
  Rejected: "#ef4444",
  Investigating: "#8b5cf6",
  Resolved: "#06b6d4",
};

const STATUS_TEXT_COLORS = {
  Pending: "#92400e",
  "In Progress": "#1e3a8a",
  Completed: "#065f46",
  Rejected: "#7f1d1d",
  Investigating: "#4c1d95",
  Resolved: "#0f766e",
};

const STATUS_LABELS = {
  pending: "Pending",
  in_progress: "In Progress",
  investigating: "Investigating",
  completed: "Completed",
  rejected: "Rejected",
  resolved: "Resolved",
};

const STATUS_COLOR_MAP = {
  PENDING: "#F59E0B",
  IN_PROGRESS: "#0EA5E9",
  INVESTIGATING: "#8B5CF6",
  COMPLETED: "#10B981",
  REJECTED: "#EF4444",
  RESOLVED: "#06B6D4",
};

const normalizeStatus = (status) => {
  if (!status) return "Pending";
  const normalized = typeof status === "string" ? status.toLowerCase() : status;
  return STATUS_LABELS[normalized] || status;
};

const getStatusColor = (statusLabel) => STATUS_COLORS[statusLabel] || "#9ca3af";
const getStatusTextColor = (statusLabel) => STATUS_TEXT_COLORS[statusLabel] || "#1f2937";

export default function AdminComplaints() {
  const location = useLocation();
  const [selectedComplaintStatus, setSelectedComplaintStatus] =
    useState("All Status");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [complaintDropdownOpen, setComplaintDropdownOpen] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(true);
  const [errorComplaints, setErrorComplaints] = useState(null);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Auto-open modal if navigated with selectedItemId
  useEffect(() => {
    if (location.state?.selectedItemId && complaints.length > 0) {
      const item = complaints.find(c => c.id === location.state.selectedItemId);
      if (item) {
        openModal(item);
      }
    }
  }, [location.state, complaints]);

  const transformComplaintData = (dbComplaint) => {
    return {
      id: dbComplaint.id,
      title: dbComplaint.complaint_type || "Untitled Complaint",
      location: dbComplaint.incident_location || "Unknown Location",
      status: normalizeStatus(dbComplaint.status),
      complainant: dbComplaint.complainant_name || "Unknown",
      date: dbComplaint.created_at
        ? new Date(dbComplaint.created_at).toISOString().split("T")[0]
        : "N/A",
      lastUpdate: dbComplaint.updated_at
        ? new Date(dbComplaint.updated_at).toISOString().split("T")[0]
        : dbComplaint.created_at
          ? new Date(dbComplaint.created_at).toISOString().split("T")[0]
          : "N/A",
      priority: dbComplaint.priority_level || "Normal",
      description: dbComplaint.description || "No description provided",
      remarks: dbComplaint.remarks || "No remarks yet",
    };
  };

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        setLoadingComplaints(true);
        setErrorComplaints(null);
        console.log("AdminComplaints: Starting fetch...");
        const result = await getComplaints();
        console.log("AdminComplaints: getComplaints result:", result);

        if (result.success && Array.isArray(result.data)) {
          console.log("AdminComplaints: Raw data from DB:", result.data);
          const transformedComplaints = result.data.map((complaint) =>
            transformComplaintData(complaint),
          );
          console.log(
            "AdminComplaints: Transformed data:",
            transformedComplaints,
          );
          setComplaints(transformedComplaints);
        } else {
          console.error(
            "AdminComplaints: Failed to fetch complaints:",
            result.message,
          );
          setErrorComplaints(result.message || "Failed to fetch complaints");
          setComplaints([]);
        }
      } catch (err) {
        console.error("AdminComplaints: Catch error:", err);
        setErrorComplaints("Error fetching complaints: " + err.message);
        setComplaints([]);
      } finally {
        setLoadingComplaints(false);
      }
    };

    fetchComplaints();
  }, []);

  // Filter complaints based on status, search query, and date range
  const filteredComplaints = complaints.filter((complaint) => {
    // Status filter
    const statusMatch =
      selectedComplaintStatus === "All Status" ||
      complaint.status === selectedComplaintStatus;

    // Search filter
    const searchLower = searchQuery.toLowerCase();
    const searchMatch =
      complaint.title.toLowerCase().includes(searchLower) ||
      complaint.location.toLowerCase().includes(searchLower) ||
      complaint.complainant.toLowerCase().includes(searchLower) ||
      complaint.description.toLowerCase().includes(searchLower);

    // Date filter
    const complaintDate = new Date(complaint.date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    const dateMatch =
      (!start || complaintDate >= start) && (!end || complaintDate <= end);

    return statusMatch && searchMatch && dateMatch;
  });

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") closeModal();
    };
    if (isModalOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isModalOpen]);

  const openModal = (complaint) => {
    setSelectedComplaint(complaint);
    setIsModalOpen(true);
    fetchHistory(complaint.id);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setHistory([]);
    setTimeout(() => setSelectedComplaint(null), 300);
  };

  const fetchHistory = async (complaintId) => {
    if (!complaintId) return;
    setHistoryLoading(true);
    try {
      const result = await getComplaintHistory(complaintId);
      if (result.success) {
        setHistory(result.data || []);
      } else {
        console.error("AdminComplaints: history fetch failed", result.message);
        setHistory([]);
      }
    } catch (err) {
      console.error("AdminComplaints: error fetching history", err);
      setHistory([]);
    }
    setHistoryLoading(false);
  };

  const statusOptions = [
    "All Status",
    "Pending",
    "Investigating",
    "In Progress",
    "Resolved",
    "Rejected",
  ];

  return (
    <div className="admin-page">
      {/* Blurrable page content wrapper */}
      <div
        className={`ar-page-content${isModalOpen ? " modal-open-blur" : ""}`}
      >
        {/* Page Header */}
        <div
          className="page-actions"
          style={{ alignItems: "flex-start", marginBottom: 12 }}
        >
          <div>
            <h3>System-wide Complaints</h3>
            <p className="muted">Monitor all complaints across the barangay.</p>
          </div>
        </div>

        {/* COMPLAINTS SECTION */}
        <div style={{ marginBottom: "2.5rem" }}>
          {/* Filters and Search */}
          <div
            style={{
              marginBottom: "1.5rem",
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
              alignItems: "flex-end",
            }}
          >
            {/* Search Bar */}
            <div style={{ flex: "1", minWidth: "200px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  marginBottom: "0.5rem",
                }}
              >
                Search
              </label>
              <input
                type="text"
                placeholder="Search by type, location, complainant, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.625rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                }}
              />
            </div>

            {/* Date Range Filters */}
            <div
              style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    marginBottom: "0.5rem",
                  }}
                >
                  From
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0]}
                  style={{
                    padding: "0.625rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.375rem",
                    fontSize: "0.875rem",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    marginBottom: "0.5rem",
                  }}
                >
                  To
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  max={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0]}
                  style={{
                    padding: "0.625rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.375rem",
                    fontSize: "0.875rem",
                  }}
                />
              </div>
              {(startDate || endDate || searchQuery) && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setStartDate("");
                    setEndDate("");
                  }}
                  style={{
                    padding: "0.625rem 1rem",
                    backgroundColor: "#f3f4f6",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.375rem",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Status Filter */}
          <div
            className="status-filter-wrapper"
            style={{ marginBottom: "1rem" }}
          >
            <button
              className="status-filter-btn"
              onClick={() => setComplaintDropdownOpen(!complaintDropdownOpen)}
            >
              {selectedComplaintStatus}
              <ChevronDown size={18} style={{ marginLeft: "0.5rem" }} />
            </button>
            {complaintDropdownOpen && (
              <>
                <div
                  style={{ position: "fixed", inset: 0, zIndex: 999 }}
                  onClick={() => setComplaintDropdownOpen(false)}
                />
                <div
                  className="status-filter-dropdown"
                  style={{ zIndex: 1000 }}
                >
                  {statusOptions.map((option) => (
                    <div
                      key={option}
                      className="status-filter-item"
                      onClick={() => {
                        setSelectedComplaintStatus(option);
                        setComplaintDropdownOpen(false);
                      }}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {errorComplaints && (
            <div
              style={{
                padding: "1rem",
                marginBottom: "1rem",
                backgroundColor: "#fee2e2",
                borderRadius: "0.5rem",
                color: "#991b1b",
              }}
            >
              Error: {errorComplaints}
            </div>
          )}

          {loadingComplaints && (
            <div style={{ padding: "1rem", marginBottom: "1rem" }}>
              <div className="loading-wrap">
                <div className="loading-spinner" aria-hidden="true"></div>
                <div className="loading-text">Loading complaints...</div>
              </div>
            </div>
          )}

          <div
            style={{
              marginBottom: "1rem",
              fontSize: "0.875rem",
              color: "#6b7280",
            }}
          >
            Showing {filteredComplaints.length} of {complaints.length}{" "}
            complaints
          </div>

          <div className="requests-table-card">
            <table className="requests-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Complaint Details</th>
                  <th>Status</th>
                  <th>Complainant</th>
                  <th>Priority</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.length > 0 ? (
                  filteredComplaints.map((complaint) => (
                    <tr key={complaint.id}>
                      <td>
                        <span className="req-id-chip">{complaint.id}</span>
                      </td>
                      <td className="req-details">
                        <div className="req-title">{complaint.title}</div>
                        <div className="req-subtitle">{complaint.location}</div>
                      </td>
                      <td className="req-status">
                        <span
                          className="ar-status-badge"
                          style={{
                            backgroundColor: getStatusColor(complaint.status),
                            color: getStatusTextColor(complaint.status),
                            borderColor: "rgba(0,0,0,0.10)",
                          }}
                        >
                          {complaint.status}
                        </span>
                      </td>
                      <td className="req-submitted">{complaint.complainant}</td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          style={{
                            padding: "0.25rem 0.75rem",
                            borderRadius: "0.25rem",
                            backgroundColor:
                              complaint.priority === "High"
                                ? "#fee2e2"
                                : complaint.priority === "Medium"
                                  ? "#fef3c7"
                                  : "#d1fae5",
                            color:
                              complaint.priority === "High"
                                ? "#991b1b"
                                : complaint.priority === "Medium"
                                  ? "#92400e"
                                  : "#065f46",
                            fontSize: "0.875rem",
                            fontWeight: "500",
                          }}
                        >
                          {complaint.priority}
                        </span>
                      </td>
                      <td className="req-action">
                        <button
                          className="btn-save ar-table-action-btn"
                          onClick={() => openModal(complaint)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="6"
                      style={{
                        padding: "2rem",
                        textAlign: "center",
                        color: "#6b7280",
                      }}
                    >
                      No complaints found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* end ar-page-content */}

      {/* Modal Overlay */}
      {isModalOpen && createPortal(
        <div className="ar-modal-overlay request-detail-overlay" onClick={closeModal} />,
        document.body
      )}

      {/* Modal */}
      {isModalOpen && selectedComplaint && createPortal(
        <div className="ar-modal modal-dialog request-detail-dialog">
          {/* Header */}
          <div className="ar-modal-header">
            <div className="ar-modal-header-top">
              <h3 className="ar-modal-title">{selectedComplaint.title}</h3>
              <button className="ar-modal-close" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>
            <div className="ar-modal-badges">
              <span
                className="ar-status-badge-modal"
                style={{
                  backgroundColor: getStatusColor(selectedComplaint.status),
                  color: getStatusTextColor(selectedComplaint.status),
                  borderColor: "rgba(0,0,0,0.10)",
                }}
              >
                {selectedComplaint.status.toUpperCase()}
              </span>
              <span className="ar-admin-tag">System Admin View</span>
            </div>
          </div>

          {/* Body */}
          <div className="ar-modal-body">
            <div className="ar-metadata-grid">
              <div className="ar-metadata-item">
                <label className="ar-metadata-label">Complainant</label>
                <p className="ar-metadata-value">
                  {selectedComplaint.complainant}
                </p>
              </div>
              <div className="ar-metadata-item">
                <label className="ar-metadata-label">Location</label>
                <p className="ar-metadata-value">
                  {selectedComplaint.location}
                </p>
              </div>
              <div className="ar-metadata-item">
                <label className="ar-metadata-label">Priority</label>
                <p className="ar-metadata-value">
                  {selectedComplaint.priority}
                </p>
              </div>
              <div className="ar-metadata-item">
                <label className="ar-metadata-label">Submitted</label>
                <p className="ar-metadata-value">{selectedComplaint.date}</p>
              </div>
              <div className="ar-metadata-item">
                <label className="ar-metadata-label">Last Update</label>
                <p className="ar-metadata-value">
                  {selectedComplaint.lastUpdate}
                </p>
              </div>
            </div>

            <div className="ar-section">
              <h4 className="ar-section-title">Complaint Description</h4>
              <div className="ar-description-box">
                {selectedComplaint.description}
              </div>
            </div>

            <div className="ar-section">
              <h4 className="ar-section-title">Official Remarks / Notes</h4>
              <div className="ar-response-box">{selectedComplaint.remarks}</div>
            </div>

            <div className="history-section">
              <div className="history-header">
                <h3>History</h3>
              </div>
              {historyLoading ? (
                <p className="history-loading">Loading history...</p>
              ) : history && history.length > 0 ? (
                <ul className="history-list">
                  {history.map((h, idx) => {
                    const date = new Date(h.updated_at || h.created_at);
                    const statusValue = h.status || h.complaint_status || h.request_status || "";
                    const rawStatus = statusValue
                      .toUpperCase()
                      .replace(/ /g, "_");
                    const statusLabel = statusValue
                      ? statusValue.replace(/_/g, " ").toUpperCase()
                      : "";
                    const dotColor = STATUS_COLOR_MAP[rawStatus] || "#6B7280";
                    return (
                      <li
                        key={idx}
                        className="history-item"
                        style={{ "--dot-color": dotColor }}
                      >
                        <div className="history-row">
                          <div className="history-row-top">
                            <span
                              className="history-status"
                              style={{ backgroundColor: dotColor }}
                            >
                              {statusLabel}
                            </span>
                            <span className="history-user">
                              {h.updater_name || "System"}
                            </span>
                          </div>
                          <span className="history-date">
                            {date.toLocaleString()}
                          </span>
                          {h.remarks && (
                            <div className="history-remarks">{h.remarks}</div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="no-history">No history available.</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="ar-modal-footer">
            <button className="ar-close-btn" onClick={closeModal}>
              Close Monitor
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
