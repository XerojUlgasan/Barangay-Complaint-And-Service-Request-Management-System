import React, { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import {
  getAssignedComplaints,
  updateComplaintStatus,
} from "../../supabse_db/official/official";
import RequestDetail from "../../components/RequestDetail";
import "../../styles/BarangayAdmin.css";
import "../../styles/RequestDetail.css";

const STATUS_COLORS = {
  Pending: "#fbbf24",
  "In Progress": "#3b82f6",
  Completed: "#10b981",
  Rejected: "#ef4444",
  "For Compliance": "#8b5cf6",
  "Non Compliant": "#ec4899",
  "For Validation": "#06b6d4",
};

const STATUS_LABELS = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  rejected: "Rejected",
  for_compliance: "For Compliance",
  non_compliant: "Non Compliant",
  for_validation: "For Validation",
};

const normalizeStatus = (status) => {
  if (!status) return "Pending";
  const normalized = typeof status === "string" ? status.toLowerCase() : status;
  return STATUS_LABELS[normalized] || status;
};

const getStatusColor = (statusLabel) => STATUS_COLORS[statusLabel] || "#9ca3af";

export default function OfficialComplaints() {
  const [selectedComplaintStatus, setSelectedComplaintStatus] =
    useState("All Status");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [complaintDropdownOpen, setComplaintDropdownOpen] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(true);
  const [errorComplaints, setErrorComplaints] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const transformComplaintData = (dbComplaint) => ({
    ...dbComplaint,
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
  });

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        setLoadingComplaints(true);
        setErrorComplaints(null);
        const result = await getAssignedComplaints();

        if (result.success && Array.isArray(result.data)) {
          const transformedComplaints = result.data.map((complaint) =>
            transformComplaintData(complaint),
          );
          setComplaints(transformedComplaints);
        } else {
          setErrorComplaints(result.message || "Failed to fetch complaints");
          setComplaints([]);
        }
      } catch (err) {
        setErrorComplaints("Error fetching complaints: " + err.message);
        setComplaints([]);
      } finally {
        setLoadingComplaints(false);
      }
    };

    fetchComplaints();
  }, []);

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

  const filteredComplaints = complaints.filter((complaint) => {
    const statusMatch =
      selectedComplaintStatus === "All Status" ||
      complaint.status === selectedComplaintStatus;

    const searchLower = searchQuery.toLowerCase();
    const searchMatch =
      complaint.title.toLowerCase().includes(searchLower) ||
      complaint.location.toLowerCase().includes(searchLower) ||
      complaint.complainant.toLowerCase().includes(searchLower) ||
      complaint.description.toLowerCase().includes(searchLower);

    const complaintDate = new Date(complaint.date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    const dateMatch =
      (!start || complaintDate >= start) && (!end || complaintDate <= end);

    return statusMatch && searchMatch && dateMatch;
  });

  const openModal = (complaint) => {
    setSelectedComplaint(complaint);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedComplaint(null), 300);
  };

  const statusOptions = [
    "All Status",
    "Pending",
    "In Progress",
    "Completed",
    "Rejected",
    "For Compliance",
    "Non Compliant",
    "For Validation",
  ];

  const handleSaveComplaint = async (updatedData) => {
    try {
      const statusMap = {
        PENDING: "pending",
        IN_PROGRESS: "in_progress",
        COMPLETED: "completed",
        REJECTED: "rejected",
        FOR_COMPLIANCE: "for_compliance",
        NON_COMPLIANT: "non_compliant",
        FOR_VALIDATION: "for_validation",
      };

      const dbStatus =
        statusMap[updatedData.status] || updatedData.status.toLowerCase();

      const result = await updateComplaintStatus(
        selectedComplaint.id,
        dbStatus,
        updatedData.remarks,
        updatedData.priority_level,
      );

      if (result.success) {
        const refreshed = await getAssignedComplaints();
        if (refreshed.success && Array.isArray(refreshed.data)) {
          setComplaints(refreshed.data.map(transformComplaintData));
        }
        closeModal();
      } else {
        console.error("Failed to update complaint:", result.message);
      }
    } catch (error) {
      console.error("Error saving complaint:", error);
    }
  };

  return (
    <div className="admin-page">
      <div
        className={`ar-page-content${isModalOpen ? " modal-open-blur" : ""}`}
      >
        <div
          className="page-actions"
          style={{ alignItems: "flex-start", marginBottom: 12 }}
        >
          <div>
            <h3>Assigned Complaints</h3>
            <p className="muted">
              Review and manage complaints assigned to you.
            </p>
          </div>
        </div>

        <div style={{ marginBottom: "2.5rem" }}>
          <div
            style={{
              marginBottom: "1.5rem",
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
              alignItems: "flex-end",
            }}
          >
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
                  className="status-dropdown"
                  style={{
                    width: "100%",
                    maxWidth: "220px",
                    maxHeight: "240px",
                    overflowY: "auto",
                    zIndex: 1000,
                  }}
                >
                  {statusOptions.map((status) => (
                    <button
                      key={status}
                      className={`status-option ${
                        selectedComplaintStatus === status ? "active" : ""
                      }`}
                      onClick={() => {
                        setSelectedComplaintStatus(status);
                        setComplaintDropdownOpen(false);
                      }}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div
            style={{
              marginBottom: "0.75rem",
              color: "#6b7280",
              fontSize: "0.875rem",
            }}
          >
            Showing {filteredComplaints.length} of {complaints.length}{" "}
            complaints
          </div>

          <div className="requests-table-card">
            <table className="requests-table">
              <thead>
                <tr>
                  <th>Complaint Type</th>
                  <th>Location</th>
                  <th style={{ textAlign: "left" }}>Complainant</th>
                  <th>Submitted</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingComplaints ? (
                  <tr>
                    <td colSpan="6">
                      <div
                        className="loading-wrap"
                        style={{ padding: "1rem 0" }}
                      >
                        <div
                          className="loading-spinner"
                          aria-hidden="true"
                        ></div>
                        <div className="loading-text">
                          Loading complaints...
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : errorComplaints ? (
                  <tr>
                    <td
                      colSpan="6"
                      style={{ color: "#ef4444", textAlign: "center" }}
                    >
                      {errorComplaints}
                    </td>
                  </tr>
                ) : filteredComplaints.length > 0 ? (
                  filteredComplaints.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="req-details">
                          <div className="req-title">{c.title}</div>
                        </div>
                      </td>
                      <td className="req-submitted">{c.location}</td>
                      <td className="req-submitted">{c.complainant}</td>
                      <td className="req-submitted">{c.date}</td>
                      <td className="req-status">
                        <span
                          className={`status ${c.status
                            .toLowerCase()
                            .replace(/[_ ]/g, "_")}`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="req-action">
                        <button
                          className="view-details-btn"
                          onClick={() => openModal(c)}
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
                      style={{ textAlign: "center", color: "#9ca3af" }}
                    >
                      No complaints found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <RequestDetail
        request={selectedComplaint}
        itemType="complaint"
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSaveComplaint}
      />
    </div>
  );
}
