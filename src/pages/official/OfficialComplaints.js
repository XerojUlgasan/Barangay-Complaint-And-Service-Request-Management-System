import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
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

export default function OfficialComplaints() {
  const location = useLocation();
  const [selectedComplaintStatus, setSelectedComplaintStatus] = useState("All Status");
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
          setComplaints(result.data.map(transformComplaintData));
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
    const handleEscape = (e) => { if (e.key === "Escape") closeModal(); };
    if (isModalOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isModalOpen]);

  useEffect(() => {
    // Auto-open modal if redirected from dashboard
    if (location.state?.selectedComplaintId && location.state?.openModal && complaints.length > 0) {
      const complaint = complaints.find((c) => c.id === location.state.selectedComplaintId);
      if (complaint) {
        setSelectedComplaint(complaint);
        setIsModalOpen(true);
        // Clear the location state after opening
        window.history.replaceState({}, document.title);
      }
    }
  }, [complaints, location.state]);

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
    const dateMatch = (!start || complaintDate >= start) && (!end || complaintDate <= end);
    return statusMatch && searchMatch && dateMatch;
  });

  const openModal = (complaint) => { setSelectedComplaint(complaint); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setTimeout(() => setSelectedComplaint(null), 300); };

  const statusOptions = [
    "All Status", "Pending", "In Progress", "Completed", "Rejected",
    "For Compliance", "Non Compliant", "For Validation",
  ];

  const handleSaveComplaint = async (updatedData) => {
    try {
      const statusMap = {
        PENDING: "pending", IN_PROGRESS: "in_progress", COMPLETED: "completed",
        REJECTED: "rejected", FOR_COMPLIANCE: "for_compliance",
        NON_COMPLIANT: "non_compliant", FOR_VALIDATION: "for_validation",
      };
      const dbStatus = statusMap[updatedData.status] || updatedData.status.toLowerCase();
      const result = await updateComplaintStatus(
        selectedComplaint.id, dbStatus, updatedData.remarks, updatedData.priority_level,
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
    <div className={`admin-page${isModalOpen ? " modal-open-blur" : ""}`}>
      <div className="ar-page-content">
        <div className="page-actions" style={{ alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <h3>Assigned Complaints</h3>
            <p className="muted">Review and manage complaints assigned to you.</p>
          </div>
        </div>

        <div style={{ marginBottom: "2.5rem" }}>
          {/* ── Filters ── */}
          <div className="table-filters">
            <div className="filter-search">
              <label className="filter-label">Search</label>
              <input
                type="text"
                placeholder="Search by type, location, complainant, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="filter-input"
              />
            </div>
            <div className="filter-dates">
              <div>
                <label className="filter-label">From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
                    .toISOString().split("T")[0]}
                  className="filter-date-input"
                />
              </div>
              <div>
                <label className="filter-label">To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  max={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
                    .toISOString().split("T")[0]}
                  className="filter-date-input"
                />
              </div>
              {(startDate || endDate || searchQuery) && (
                <button
                  onClick={() => { setSearchQuery(""); setStartDate(""); setEndDate(""); }}
                  className="filter-clear-btn"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* ── Status Dropdown ── */}
          <div className="status-filter-wrapper" style={{ marginBottom: "1rem" }}>
            <button
              className="status-filter-btn"
              onClick={() => setComplaintDropdownOpen(!complaintDropdownOpen)}
            >
              <span>{selectedComplaintStatus}</span>
              <ChevronDown size={16} />
            </button>
            {complaintDropdownOpen && (
              <>
                <div
                  style={{ position: "fixed", inset: 0, zIndex: 999 }}
                  onClick={() => setComplaintDropdownOpen(false)}
                />
                <div className="status-dropdown">
                  {statusOptions.map((status) => (
                    <button
                      key={status}
                      className={`status-option${selectedComplaintStatus === status ? " active" : ""}`}
                      onClick={() => { setSelectedComplaintStatus(status); setComplaintDropdownOpen(false); }}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="table-count-label">
            Showing {filteredComplaints.length} of {complaints.length} complaints
          </div>

          {/* ── Table ── */}
          <div className="requests-table-card">
            <table className="requests-table balanced-table">
              <thead>
                <tr>
                  <th>Complaint Type</th>
                  <th>Location</th>
                  <th>Complainant</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingComplaints ? (
                  <tr>
                    <td colSpan="6">
                      <div className="loading-wrap" style={{ padding: "1rem 0" }}>
                        <div className="loading-spinner" aria-hidden="true" />
                        <div className="loading-text">Loading complaints...</div>
                      </div>
                    </td>
                  </tr>
                ) : errorComplaints ? (
                  <tr>
                    <td colSpan="6" style={{ color: "#ef4444", textAlign: "center" }}>
                      {errorComplaints}
                    </td>
                  </tr>
                ) : filteredComplaints.length > 0 ? (
                  filteredComplaints.map((c) => {
                    const color = STATUS_COLORS[c.status] || "#9ca3af";
                    return (
                      <tr key={c.id}>
                        <td>
                          <span className="req-title">{c.title}</span>
                        </td>
                        <td>
                          <span className="req-submitted">{c.location}</span>
                        </td>
                        <td>
                          <span className="req-submitted">{c.complainant}</span>
                        </td>
                        <td>
                          <span className="req-submitted">{c.date}</span>
                        </td>
                        <td>
                          <span
                            className="req-status-badge"
                            style={{ backgroundColor: color }}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td>
                          <button className="view-details-btn" onClick={() => openModal(c)}>
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="table-empty-cell">
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