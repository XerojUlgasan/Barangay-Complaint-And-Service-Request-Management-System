import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import "../../styles/BarangayAdmin.css";
import "../../styles/RequestDetail.css";
import {
  getComplaints,
  getComplaintHistory,
  getComplaintMediationHistory,
  assignAllUnassignedComplaints,
  transferComplaintAssignment,
} from "../../supabse_db/complaint/complaint";
import { getActiveOfficialsForAssignment } from "../../supabse_db/official/official";

const STATUS_COLORS = {
  Pending: "#fbbf24",
  "For Review": "#6366f1",
  Recorded: "#0ea5e9",
  Rejected: "#ef4444",
  Resolved: "#06b6d4",
};

const STATUS_TEXT_COLORS = {
  Pending: "#92400e",
  "For Review": "#312e81",
  Recorded: "#0c4a6e",
  Rejected: "#7f1d1d",
  Resolved: "#0f766e",
};

const STATUS_LABELS = {
  pending: "Pending",
  for_review: "For Review",
  recorded: "Recorded",
  rejected: "Rejected",
  resolved: "Resolved",
};

const STATUS_COLOR_MAP = {
  PENDING: "#F59E0B",
  FOR_REVIEW: "#6366F1",
  RECORDED: "#0EA5E9",
  REJECTED: "#EF4444",
  RESOLVED: "#06B6D4",
};

const COMPLAINT_CATEGORIES = {
  community_concern: "Community Concern",
  barangay_complaint: "Barangay Complaint",
  community_dispute: "Community Dispute",
  personal_complaint: "Personal Complaint",
};

const COMPLAINT_CATEGORY_COLORS = {
  community_concern: "#10b981",
  barangay_complaint: "#0ea5e9",
  community_dispute: "#ef4444",
  personal_complaint: "#8b5cf6",
};

const normalizeStatus = (status) => {
  if (!status) return "Pending";
  if (typeof status !== "string") return "Pending";

  const normalized = status.trim().toLowerCase().replace(/\s+/g, "_");
  return (
    STATUS_LABELS[normalized] ||
    normalized
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
};

const getStatusColor = (statusLabel) => STATUS_COLORS[statusLabel] || "#9ca3af";
const getStatusTextColor = (statusLabel) =>
  STATUS_TEXT_COLORS[statusLabel] || "#1f2937";

const normalizeComplaintCategory = (value) => {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .trim();

  return normalized || "uncategorized";
};

const getComplaintCategoryLabel = (category) =>
  COMPLAINT_CATEGORIES[normalizeComplaintCategory(category)] || "Uncategorized";

const getComplaintCategoryColor = (category) =>
  COMPLAINT_CATEGORY_COLORS[normalizeComplaintCategory(category)] || "#94a3b8";

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default function AdminComplaints() {
  const location = useLocation();
  const [selectedComplaintStatus, setSelectedComplaintStatus] =
    useState("All Status");
  const [selectedComplaintCategory, setSelectedComplaintCategory] =
    useState("all");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [complaintDropdownOpen, setComplaintDropdownOpen] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(true);
  const [errorComplaints, setErrorComplaints] = useState(null);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [mediationHistory, setMediationHistory] = useState([]);
  const [mediationHistoryLoading, setMediationHistoryLoading] = useState(false);
  const [assigningComplaints, setAssigningComplaints] = useState(false);
  const [assignPopup, setAssignPopup] = useState({
    open: false,
    title: "",
    message: "",
  });
  const [activeOfficials, setActiveOfficials] = useState([]);
  const [officialSearch, setOfficialSearch] = useState("");
  const [showOfficialOptions, setShowOfficialOptions] = useState(false);
  const [selectedOfficialUid, setSelectedOfficialUid] = useState("");
  const [loadingOfficials, setLoadingOfficials] = useState(false);
  const [transferringAssignment, setTransferringAssignment] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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

  // Auto-open modal if navigated with selectedItemId
  useEffect(() => {
    if (location.state?.selectedItemId && complaints.length > 0) {
      const item = complaints.find(
        (c) => c.id === location.state.selectedItemId,
      );
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
      category: normalizeComplaintCategory(dbComplaint.category),
      mediationAccepted: Boolean(dbComplaint.mediation_accepted),
      complainant: dbComplaint.complainant_name || "Unknown",
      assignedOfficial: dbComplaint.assigned_official_name || "",
      date: dbComplaint.created_at
        ? new Date(dbComplaint.created_at).toISOString().split("T")[0]
        : "N/A",
      lastUpdate: dbComplaint.updated_at
        ? new Date(dbComplaint.updated_at).toISOString().split("T")[0]
        : dbComplaint.created_at
          ? new Date(dbComplaint.created_at).toISOString().split("T")[0]
          : "N/A",
      assignedOfficialUid: dbComplaint.assigned_official_id || "",
      priority: dbComplaint.priority_level || "Normal",
      description: dbComplaint.description || "No description provided",
      remarks: dbComplaint.remarks || "No remarks yet",
    };
  };

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

  useEffect(() => {
    fetchComplaints();
  }, []);

  // Filter complaints based on status, search query, and date range
  const filteredComplaints = complaints.filter((complaint) => {
    // Status filter
    const statusMatch =
      selectedComplaintStatus === "All Status" ||
      complaint.status === selectedComplaintStatus;

    const categoryMatch =
      selectedComplaintCategory === "all" ||
      complaint.category === selectedComplaintCategory;

    // Search filter
    const searchableColumns = [
      complaint.id,
      complaint.title,
      complaint.location,
      getComplaintCategoryLabel(complaint.category),
      complaint.status,
      complaint.mediationAccepted ? "Accepted" : "No",
      complaint.complainant,
      complaint.assignedOfficial || "Unassigned",
      complaint.date,
      complaint.lastUpdate,
      complaint.description,
      complaint.remarks,
    ]
      .join(" ")
      .toLowerCase();

    const searchMatch =
      searchTerms.length === 0 ||
      searchTerms.every((term) => searchableColumns.includes(term));

    // Date filter
    const complaintDate = new Date(complaint.date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    const dateMatch =
      (!start || complaintDate >= start) && (!end || complaintDate <= end);

    return statusMatch && categoryMatch && searchMatch && dateMatch;
  });

  const unassignedComplaints = complaints.filter((complaint) => {
    const assignedOfficial = (complaint.assignedOfficial || "").trim();
    return !assignedOfficial || assignedOfficial.toLowerCase() === "unassigned";
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
    setOfficialSearch("");
    setShowOfficialOptions(false);
    setSelectedOfficialUid("");
    setIsModalOpen(true);
    fetchHistory(complaint.id);
    fetchMediationHistory(complaint.id);
    fetchActiveOfficials();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setHistory([]);
    setMediationHistory([]);
    setOfficialSearch("");
    setShowOfficialOptions(false);
    setSelectedOfficialUid("");
    setTimeout(() => setSelectedComplaint(null), 300);
  };

  const fetchActiveOfficials = async () => {
    setLoadingOfficials(true);
    try {
      const result = await getActiveOfficialsForAssignment();
      if (result.success && Array.isArray(result.data)) {
        setActiveOfficials(result.data);
      } else {
        setActiveOfficials([]);
        if (result.message) {
          setAssignPopup({
            open: true,
            title: "Unable to Load Officials",
            message: result.message,
          });
        }
      }
    } catch (err) {
      setActiveOfficials([]);
      setAssignPopup({
        open: true,
        title: "Unable to Load Officials",
        message: err.message || "Failed to load active officials",
      });
    } finally {
      setLoadingOfficials(false);
    }
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

  const fetchMediationHistory = async (complaintId) => {
    if (!complaintId) return;
    setMediationHistoryLoading(true);
    try {
      const result = await getComplaintMediationHistory(complaintId);
      if (result.success) {
        setMediationHistory(result.data || []);
      } else {
        console.error(
          "AdminComplaints: mediation history fetch failed",
          result.message,
        );
        setMediationHistory([]);
      }
    } catch (err) {
      console.error("AdminComplaints: error fetching mediation history", err);
      setMediationHistory([]);
    }
    setMediationHistoryLoading(false);
  };

  const handleAssignAllUnassigned = async () => {
    if (assigningComplaints) return;

    setAssigningComplaints(true);
    setAssignPopup({ open: false, title: "", message: "" });

    try {
      const result = await assignAllUnassignedComplaints();

      if (!result.success) {
        if (result.reason === "no_active_official") {
          setAssignPopup({
            open: true,
            title: "No Active Official Available",
            message:
              "No present ACTIVE barangay official is available today for assignment.",
          });
        } else {
          setAssignPopup({
            open: true,
            title: "Assignment Failed",
            message:
              result.message || "Unable to assign unassigned complaints.",
          });
        }
        await fetchComplaints();
        return;
      }

      setAssignPopup({
        open: true,
        title: "Assignment Complete",
        message: `Assigned ${result.assignedCount || 0} complaint(s).${result.skippedCount ? ` Skipped ${result.skippedCount} complaint(s).` : ""}`,
      });
      await fetchComplaints();
    } finally {
      setAssigningComplaints(false);
    }
  };

  const filteredOfficials = activeOfficials.filter((official) => {
    if (official.uid === selectedComplaint?.assignedOfficialUid) {
      return false;
    }

    const fullName = `${official.first_name || ""} ${official.last_name || ""}`
      .trim()
      .toLowerCase();
    const position = (official.position || "").toLowerCase();
    const query = officialSearch.trim().toLowerCase();

    if (!query) return true;
    return fullName.includes(query) || position.includes(query);
  });

  const getOfficialLabel = (official) =>
    `${`${official.first_name || ""} ${official.last_name || ""}`.trim()} - ${official.position || "Officer"}`;

  const handlePickOfficial = (official) => {
    setOfficialSearch(getOfficialLabel(official));
    setSelectedOfficialUid(official.uid);
    setShowOfficialOptions(false);
  };

  const handleTransferComplaint = async () => {
    if (
      !selectedComplaint?.id ||
      !selectedOfficialUid ||
      transferringAssignment
    ) {
      return;
    }

    setTransferringAssignment(true);

    try {
      const result = await transferComplaintAssignment(
        selectedComplaint.id,
        selectedOfficialUid,
      );

      if (!result.success) {
        setAssignPopup({
          open: true,
          title: "Transfer Failed",
          message: result.message || "Unable to transfer complaint assignment.",
        });
        return;
      }

      const assignedOfficialName = result.assignedOfficialName || "Assigned";

      setSelectedComplaint((prev) =>
        prev
          ? {
              ...prev,
              assignedOfficialUid: selectedOfficialUid,
              assignedOfficial: assignedOfficialName,
              lastUpdate: new Date().toISOString().split("T")[0],
            }
          : prev,
      );

      setComplaints((prev) =>
        prev.map((complaint) =>
          complaint.id === selectedComplaint.id
            ? {
                ...complaint,
                assignedOfficialUid: selectedOfficialUid,
                assignedOfficial: assignedOfficialName,
                lastUpdate: new Date().toISOString().split("T")[0],
              }
            : complaint,
        ),
      );

      await fetchHistory(selectedComplaint.id);

      setAssignPopup({
        open: true,
        title: "Assignment Transferred",
        message: `Complaint #${selectedComplaint.id} is now assigned to ${assignedOfficialName}.`,
      });
    } finally {
      setTransferringAssignment(false);
    }
  };

  const statusOptions = [
    "All Status",
    "Pending",
    "For Review",
    "Recorded",
    "Resolved",
    "Rejected",
  ];

  const categoryOptions = [
    { value: "all", label: "All Categories" },
    { value: "community_concern", label: "Community Concern" },
    { value: "barangay_complaint", label: "Barangay Complaint" },
    { value: "community_dispute", label: "Community Dispute" },
    { value: "personal_complaint", label: "Personal Complaint" },
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
                  max={
                    new Date(
                      new Date().getTime() -
                        new Date().getTimezoneOffset() * 60000,
                    )
                      .toISOString()
                      .split("T")[0]
                  }
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
                  max={
                    new Date(
                      new Date().getTime() -
                        new Date().getTimezoneOffset() * 60000,
                    )
                      .toISOString()
                      .split("T")[0]
                  }
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
            style={{
              display: "flex",
              gap: "0.75rem",
              alignItems: "flex-end",
              flexWrap: "wrap",
              marginBottom: "1rem",
            }}
          >
            <div style={{ minWidth: "220px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  marginBottom: "0.5rem",
                }}
              >
                Category
              </label>
              <select
                value={selectedComplaintCategory}
                onChange={(e) => setSelectedComplaintCategory(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.625rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                  backgroundColor: "#ffffff",
                }}
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Filter */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-start",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div
              className="status-filter-wrapper"
              style={{ marginBottom: 0, position: "relative" }}
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
                    style={{
                      zIndex: 1000,
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      marginTop: "0.25rem",
                    }}
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

          {unassignedComplaints.length > 0 ? (
            <div
              style={{
                marginBottom: "1.5rem",
                padding: "1.75rem",
                border: "2px solid #f59e0b",
                borderRadius: "0.75rem",
                background: "#fffbeb",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "1.5rem",
                  alignItems: "center",
                  marginBottom: "1.25rem",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1 }}>
                  <h4
                    style={{
                      margin: 0,
                      color: "#92400e",
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span style={{ fontSize: "1.75rem" }}>⚠️</span>
                    Unassigned Complaints
                  </h4>
                  <p
                    style={{
                      margin: "0.625rem 0 0",
                      color: "#b45309",
                      fontSize: "1rem",
                      lineHeight: "1.6",
                    }}
                  >
                    There {unassignedComplaints.length === 1 ? "is" : "are"}{" "}
                    <strong style={{ fontSize: "1.25rem" }}>
                      {unassignedComplaints.length}
                    </strong>{" "}
                    complaint{unassignedComplaints.length === 1 ? "" : "s"} that
                    still need{unassignedComplaints.length === 1 ? "s" : ""} an
                    official assignment.
                  </p>
                </div>
                <span
                  style={{
                    padding: "0.875rem 1.5rem",
                    borderRadius: "999px",
                    background: "#fef3c7",
                    color: "#92400e",
                    fontWeight: 700,
                    fontSize: "1.75rem",
                    minWidth: "70px",
                    textAlign: "center",
                  }}
                >
                  {unassignedComplaints.length}
                </span>
              </div>
              <button
                type="button"
                onClick={handleAssignAllUnassigned}
                disabled={assigningComplaints || loadingComplaints}
                style={{
                  padding: "0.875rem 1.5rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #cbd5e1",
                  background: assigningComplaints ? "#e2e8f0" : "#0f172a",
                  color: assigningComplaints ? "#475569" : "#f8fafc",
                  fontSize: "1rem",
                  fontWeight: 600,
                  cursor:
                    assigningComplaints || loadingComplaints
                      ? "not-allowed"
                      : "pointer",
                  width: "100%",
                }}
              >
                {assigningComplaints
                  ? "Assigning..."
                  : "Assign All Unassigned Complaints"}
              </button>
            </div>
          ) : (
            <div
              style={{
                marginBottom: "1.5rem",
                padding: "1.5rem",
                border: "2px solid #10b981",
                borderRadius: "0.75rem",
                background: "#ecfdf5",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#065f46",
                  fontSize: "1rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                }}
              >
                <span style={{ fontSize: "1.25rem" }}>✓</span>
                No unassigned complaints right now.
              </p>
            </div>
          )}

          <div
            style={{
              marginBottom: "1rem",
              fontSize: "0.875rem",
              color: "#6b7280",
            }}
          >
            Showing {filteredComplaints.length} of {complaints.length} complaint
            {complaints.length === 1 ? "" : "s"}
          </div>

          <div className="requests-table-card">
            <table className="requests-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Request Details</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Complainant</th>
                  <th>Assigned To</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.length > 0 ? (
                  filteredComplaints.map((complaint) => (
                    <tr key={complaint.id}>
                      <td>
                        <span className="req-id-chip">
                          {highlightText(complaint.id)}
                        </span>
                      </td>
                      <td className="req-details">
                        <div className="req-title">
                          {highlightText(complaint.title)}
                        </div>
                        <div className="req-subtitle">
                          {highlightText(complaint.location)}
                        </div>
                      </td>
                      <td>
                        <span
                          className="ar-status-badge"
                          style={{
                            backgroundColor: getComplaintCategoryColor(
                              complaint.category,
                            ),
                            color: "#ffffff",
                            borderColor: "rgba(0,0,0,0.10)",
                          }}
                        >
                          {highlightText(
                            getComplaintCategoryLabel(complaint.category),
                          )}
                        </span>
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
                          {highlightText(complaint.status)}
                        </span>
                      </td>
                      <td className="req-submitted">
                        {highlightText(complaint.complainant)}
                      </td>
                      <td className="req-submitted">
                        {highlightText(
                          complaint.assignedOfficial || "Unassigned",
                        )}
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
                      colSpan="7"
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
      {assignPopup.open &&
        createPortal(
          <div
            className="ar-modal-overlay"
            style={{ zIndex: 11000 }}
            onClick={() =>
              setAssignPopup({ open: false, title: "", message: "" })
            }
          >
            <div
              className="ar-modal"
              style={{ maxWidth: "460px", width: "92vw", zIndex: 11001 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ar-modal-header">
                <div className="ar-modal-header-top">
                  <h3 className="ar-modal-title">{assignPopup.title}</h3>
                  <button
                    className="ar-modal-close"
                    onClick={() =>
                      setAssignPopup({ open: false, title: "", message: "" })
                    }
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="ar-modal-body">
                <p style={{ margin: 0, color: "#334155" }}>
                  {assignPopup.message}
                </p>
              </div>
              <div className="ar-modal-footer">
                <button
                  className="ar-close-btn"
                  onClick={() =>
                    setAssignPopup({ open: false, title: "", message: "" })
                  }
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Modal Overlay */}
      {isModalOpen &&
        createPortal(
          <div
            className="ar-modal-overlay request-detail-overlay"
            onClick={closeModal}
          />,
          document.body,
        )}

      {/* Modal */}
      {isModalOpen &&
        selectedComplaint &&
        createPortal(
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
                <div className="ar-metadata-item">
                  <label className="ar-metadata-label">Assigned Official</label>
                  <p className="ar-metadata-value ar-official-value">
                    {selectedComplaint.assignedOfficial || "Unassigned"}
                  </p>
                </div>
                <div className="ar-metadata-item">
                  <label className="ar-metadata-label">Category</label>
                  <p className="ar-metadata-value">
                    <span
                      className="ar-status-badge"
                      style={{
                        backgroundColor: getComplaintCategoryColor(
                          selectedComplaint.category,
                        ),
                        color: "#ffffff",
                        borderColor: "rgba(0,0,0,0.10)",
                      }}
                    >
                      {getComplaintCategoryLabel(selectedComplaint.category)}
                    </span>
                  </p>
                </div>
                <div className="ar-metadata-item">
                  <label className="ar-metadata-label">Mediation</label>
                  <p className="ar-metadata-value">
                    <span
                      className="ar-status-badge"
                      style={{
                        backgroundColor: selectedComplaint.mediationAccepted
                          ? "#10b981"
                          : "#e2e8f0",
                        color: selectedComplaint.mediationAccepted
                          ? "#ffffff"
                          : "#334155",
                        borderColor: "rgba(0,0,0,0.10)",
                      }}
                    >
                      {selectedComplaint.mediationAccepted
                        ? "Accepted"
                        : "Not Accepted"}
                    </span>
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
                <div className="ar-response-box">
                  {selectedComplaint.remarks}
                </div>
              </div>

              <div className="ar-section">
                <h4 className="ar-section-title">Transfer Assignment</h4>
                <div
                  style={{
                    display: "grid",
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      placeholder="Search active official by name or position"
                      value={officialSearch}
                      onFocus={() => setShowOfficialOptions(true)}
                      onChange={(e) => {
                        setOfficialSearch(e.target.value);
                        setSelectedOfficialUid("");
                        setShowOfficialOptions(true);
                      }}
                      className="ar-input"
                      style={{
                        width: "100%",
                        border: "1px solid #cbd5e1",
                        borderRadius: "0.5rem",
                        padding: "0.625rem 0.75rem",
                      }}
                    />

                    {showOfficialOptions && !loadingOfficials && (
                      <div
                        style={{
                          position: "absolute",
                          top: "calc(100% + 0.3rem)",
                          left: 0,
                          right: 0,
                          maxHeight: "180px",
                          overflowY: "auto",
                          background: "#fff",
                          border: "1px solid #cbd5e1",
                          borderRadius: "0.5rem",
                          zIndex: 20,
                          boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
                        }}
                      >
                        {filteredOfficials.length > 0 ? (
                          filteredOfficials.map((official) => (
                            <button
                              key={official.uid}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handlePickOfficial(official)}
                              style={{
                                width: "100%",
                                textAlign: "left",
                                padding: "0.625rem 0.75rem",
                                border: "none",
                                borderBottom: "1px solid #f1f5f9",
                                background: "#fff",
                                cursor: "pointer",
                              }}
                            >
                              {getOfficialLabel(official)}
                            </button>
                          ))
                        ) : (
                          <div
                            style={{
                              padding: "0.625rem 0.75rem",
                              color: "#64748b",
                            }}
                          >
                            No matching active officials.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    className="btn-save"
                    onClick={handleTransferComplaint}
                    disabled={
                      !selectedOfficialUid ||
                      loadingOfficials ||
                      transferringAssignment
                    }
                    style={{ justifySelf: "start" }}
                  >
                    {transferringAssignment
                      ? "Transferring..."
                      : "Transfer Assignment"}
                  </button>
                </div>
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
                      const statusValue =
                        h.status ||
                        h.complaint_status ||
                        h.request_status ||
                        "";
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

              <div className="history-section">
                <div className="history-header">
                  <h3>Mediation History</h3>
                </div>
                {mediationHistoryLoading ? (
                  <p className="history-loading">
                    Loading mediation history...
                  </p>
                ) : mediationHistory && mediationHistory.length > 0 ? (
                  <ul className="history-list">
                    {mediationHistory.map((session, idx) => {
                      const startDate = session.session_start
                        ? new Date(session.session_start)
                        : session.created_at
                          ? new Date(session.created_at)
                          : null;
                      const endDate = session.session_end
                        ? new Date(session.session_end)
                        : null;
                      return (
                        <li
                          key={session.id || idx}
                          className="history-item"
                          style={{
                            "--dot-color": session.status_color || "#6B7280",
                          }}
                        >
                          <div className="history-row">
                            <div className="history-row-top">
                              <span
                                className="history-status"
                                style={{
                                  backgroundColor:
                                    session.status_color || "#6B7280",
                                }}
                              >
                                {session.status_label || "Unknown"}
                              </span>
                              <span className="history-user">
                                Mediation Session #{idx + 1}
                              </span>
                            </div>
                            <span className="history-date">
                              {startDate
                                ? startDate.toLocaleString()
                                : "No start time"}
                              {endDate ? ` - ${endDate.toLocaleString()}` : ""}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="no-history">
                    No mediation history available for this complaint.
                  </p>
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
          document.body,
        )}
    </div>
  );
}
