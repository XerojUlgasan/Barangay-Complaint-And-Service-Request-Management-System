import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import "../../styles/BarangayAdmin.css";
import "../../styles/RequestDetail.css";
import {
  getRequests,
  getRequestHistory,
  assignAllUnassignedRequests,
  transferRequestAssignment,
} from "../../supabse_db/request/request";
import { getActiveOfficialsForAssignment } from "../../supabse_db/official/official";

const STATUS_COLORS = {
  Pending: "#fbbf24",
  "In Progress": "#3b82f6",
  Completed: "#10b981",
  Rejected: "#ef4444",
  "For Compliance": "#8b5cf6",
  "Non Compliant": "#ec4899",
  "For Validation": "#06b6d4",
};

const STATUS_TEXT_COLORS = {
  Pending: "#92400e",
  "In Progress": "#1e3a8a",
  Completed: "#065f46",
  Rejected: "#7f1d1d",
  "For Compliance": "#4c1d95",
  "Non Compliant": "#831843",
  "For Validation": "#0f766e",
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

const STATUS_COLOR_MAP = {
  PENDING: "#F59E0B",
  IN_PROGRESS: "#0EA5E9",
  COMPLETED: "#10B981",
  REJECTED: "#EF4444",
  FOR_COMPLIANCE: "#8B5CF6",
  NON_COMPLIANT: "#EC4899",
  FOR_VALIDATION: "#06B6D4",
};

const normalizeStatus = (status) => {
  if (!status) return "Pending";
  const normalized = typeof status === "string" ? status.toLowerCase() : status;
  return STATUS_LABELS[normalized] || status;
};

const getStatusColor = (statusLabel) => STATUS_COLORS[statusLabel] || "#9ca3af";
const getStatusTextColor = (statusLabel) =>
  STATUS_TEXT_COLORS[statusLabel] || "#1f2937";

export default function AdminRequests() {
  const location = useLocation();
  const [selectedRequestStatus, setSelectedRequestStatus] =
    useState("All Status");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requestDropdownOpen, setRequestDropdownOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [errorRequests, setErrorRequests] = useState(null);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [assigningRequests, setAssigningRequests] = useState(false);
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

  // Auto-open modal if navigated with selectedItemId
  useEffect(() => {
    if (location.state?.selectedItemId && requests.length > 0) {
      const item = requests.find((r) => r.id === location.state.selectedItemId);
      if (item) {
        openModal(item);
      }
    }
  }, [location.state, requests]);

  const transformRequestData = (dbRequest) => {
    return {
      id: dbRequest.id,
      title: dbRequest.subject || "Untitled Request",
      subtitle: dbRequest.certificate_type || "Service Request",
      status: normalizeStatus(dbRequest.request_status || dbRequest.status),
      submittedBy: dbRequest.requester_name || "Unknown",
      date: dbRequest.created_at
        ? new Date(dbRequest.created_at).toISOString().split("T")[0]
        : "N/A",
      lastUpdate: dbRequest.updated_at
        ? new Date(dbRequest.updated_at).toISOString().split("T")[0]
        : dbRequest.created_at
          ? new Date(dbRequest.created_at).toISOString().split("T")[0]
          : "N/A",
      assignedOfficialUid: dbRequest.assigned_official_id || "",
      assignedOfficial: dbRequest.assigned_official_name || "",
      description: dbRequest.description || "No description provided",
      response: dbRequest.remarks || "No response yet",
    };
  };

  const fetchRequests = async () => {
    try {
      setLoadingRequests(true);
      setErrorRequests(null);
      console.log("AdminRequests: Starting fetch...");
      const result = await getRequests();
      console.log("AdminRequests: getRequests result:", result);

      if (result.success && Array.isArray(result.data)) {
        console.log("AdminRequests: Raw data from DB:", result.data);
        const transformedRequests = result.data.map((req) =>
          transformRequestData(req),
        );
        console.log("AdminRequests: Transformed data:", transformedRequests);
        setRequests(transformedRequests);
      } else {
        console.error(
          "AdminRequests: Failed to fetch requests:",
          result.message,
        );
        setErrorRequests(result.message || "Failed to fetch requests");
        setRequests([]);
      }
    } catch (err) {
      console.error("AdminRequests: Catch error:", err);
      setErrorRequests("Error fetching requests: " + err.message);
      setRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Filter requests based on status, search query, and date range
  const filteredRequests = requests.filter((req) => {
    // Status filter
    const statusMatch =
      selectedRequestStatus === "All Status" ||
      req.status === selectedRequestStatus;

    // Search filter
    const searchLower = searchQuery.toLowerCase();
    const searchMatch =
      req.title.toLowerCase().includes(searchLower) ||
      req.subtitle.toLowerCase().includes(searchLower) ||
      req.submittedBy.toLowerCase().includes(searchLower) ||
      req.description.toLowerCase().includes(searchLower);

    // Date filter
    const reqDate = new Date(req.date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    const dateMatch = (!start || reqDate >= start) && (!end || reqDate <= end);

    return statusMatch && searchMatch && dateMatch;
  });

  const unassignedRequests = requests.filter((request) => {
    const assignedOfficial = (request.assignedOfficial || "").trim();
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

  // blur handled via inline className on page-content wrapper

  const openModal = (request) => {
    setSelectedRequest(request);
    setOfficialSearch("");
    setShowOfficialOptions(false);
    setSelectedOfficialUid("");
    setIsModalOpen(true);
    fetchHistory(request.id);
    fetchActiveOfficials();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setHistory([]);
    setOfficialSearch("");
    setShowOfficialOptions(false);
    setSelectedOfficialUid("");
    setTimeout(() => setSelectedRequest(null), 300);
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

  const fetchHistory = async (requestId) => {
    if (!requestId) return;
    setHistoryLoading(true);
    try {
      const result = await getRequestHistory(requestId);
      if (result.success) {
        setHistory(result.data || []);
      } else {
        console.error("AdminRequests: history fetch failed", result.message);
        setHistory([]);
      }
    } catch (err) {
      console.error("AdminRequests: error fetching history", err);
      setHistory([]);
    }
    setHistoryLoading(false);
  };

  const handleAssignAllUnassigned = async () => {
    if (assigningRequests) return;

    setAssigningRequests(true);
    setAssignPopup({ open: false, title: "", message: "" });

    try {
      const result = await assignAllUnassignedRequests();

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
            message: result.message || "Unable to assign unassigned requests.",
          });
        }
        await fetchRequests();
        return;
      }

      setAssignPopup({
        open: true,
        title: "Assignment Complete",
        message: `Assigned ${result.assignedCount || 0} request(s).${result.skippedCount ? ` Skipped ${result.skippedCount} request(s).` : ""}`,
      });
      await fetchRequests();
    } finally {
      setAssigningRequests(false);
    }
  };

  const filteredOfficials = activeOfficials.filter((official) => {
    if (official.uid === selectedRequest?.assignedOfficialUid) {
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

  const handleTransferRequest = async () => {
    if (
      !selectedRequest?.id ||
      !selectedOfficialUid ||
      transferringAssignment
    ) {
      return;
    }

    setTransferringAssignment(true);

    try {
      const result = await transferRequestAssignment(
        selectedRequest.id,
        selectedOfficialUid,
      );

      if (!result.success) {
        setAssignPopup({
          open: true,
          title: "Transfer Failed",
          message: result.message || "Unable to transfer request assignment.",
        });
        return;
      }

      const assignedOfficialName = result.assignedOfficialName || "Assigned";

      setSelectedRequest((prev) =>
        prev
          ? {
              ...prev,
              assignedOfficialUid: selectedOfficialUid,
              assignedOfficial: assignedOfficialName,
              lastUpdate: new Date().toISOString().split("T")[0],
            }
          : prev,
      );

      setRequests((prev) =>
        prev.map((request) =>
          request.id === selectedRequest.id
            ? {
                ...request,
                assignedOfficialUid: selectedOfficialUid,
                assignedOfficial: assignedOfficialName,
                lastUpdate: new Date().toISOString().split("T")[0],
              }
            : request,
        ),
      );

      await fetchHistory(selectedRequest.id);

      setAssignPopup({
        open: true,
        title: "Assignment Transferred",
        message: `Request #${selectedRequest.id} is now assigned to ${assignedOfficialName}.`,
      });
    } finally {
      setTransferringAssignment(false);
    }
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
            <h3>System-wide Requests</h3>
            <p className="muted">
              Monitor all service requests across the barangay.
            </p>
          </div>
        </div>

        {/* REQUESTS SECTION */}
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
                placeholder="Search by title, type, requester, or description..."
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

          {/* Status Filter */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div className="status-filter-wrapper" style={{ marginBottom: 0 }}>
              <button
                className="status-filter-btn"
                onClick={() => setRequestDropdownOpen(!requestDropdownOpen)}
              >
                {selectedRequestStatus}
                <ChevronDown size={18} style={{ marginLeft: "0.5rem" }} />
              </button>
              {requestDropdownOpen && (
                <>
                  <div
                    style={{ position: "fixed", inset: 0, zIndex: 999 }}
                    onClick={() => setRequestDropdownOpen(false)}
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
                          setSelectedRequestStatus(option);
                          setRequestDropdownOpen(false);
                        }}
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={handleAssignAllUnassigned}
              disabled={assigningRequests || loadingRequests}
              style={{
                padding: "0.625rem 1rem",
                borderRadius: "0.5rem",
                border: "1px solid #cbd5e1",
                background: assigningRequests ? "#e2e8f0" : "#0f172a",
                color: assigningRequests ? "#475569" : "#f8fafc",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor:
                  assigningRequests || loadingRequests
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {assigningRequests
                ? "Assigning..."
                : "Assign All Unassigned Request"}
            </button>
          </div>

          {errorRequests && (
            <div
              style={{
                padding: "1rem",
                marginBottom: "1rem",
                backgroundColor: "#fee2e2",
                borderRadius: "0.5rem",
                color: "#991b1b",
              }}
            >
              Error: {errorRequests}
            </div>
          )}

          {loadingRequests && (
            <div style={{ padding: "1rem", marginBottom: "1rem" }}>
              <div className="loading-wrap">
                <div className="loading-spinner" aria-hidden="true"></div>
                <div className="loading-text">Loading requests...</div>
              </div>
            </div>
          )}

          <div
            style={{
              marginBottom: "1.25rem",
              padding: "1rem",
              border: "1px solid #f3c969",
              borderRadius: "0.75rem",
              background: "#fffbeb",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "1rem",
                alignItems: "center",
                marginBottom: "0.75rem",
                flexWrap: "wrap",
              }}
            >
              <div>
                <h4 style={{ margin: 0, color: "#92400e" }}>
                  Unassigned Requests
                </h4>
                <p style={{ margin: "0.25rem 0 0", color: "#b45309" }}>
                  Requests that still need an official assignment.
                </p>
              </div>
              <span
                style={{
                  padding: "0.35rem 0.75rem",
                  borderRadius: "999px",
                  background: "#fef3c7",
                  color: "#92400e",
                  fontWeight: 700,
                  fontSize: "0.875rem",
                }}
              >
                {unassignedRequests.length}
              </span>
            </div>

            {unassignedRequests.length > 0 ? (
              <div className="requests-table-card" style={{ marginBottom: 0 }}>
                <table className="requests-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Request Details</th>
                      <th>Status</th>
                      <th>Submitted By</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unassignedRequests.map((request) => (
                      <tr key={request.id}>
                        <td>
                          <span className="req-id-chip">{request.id}</span>
                        </td>
                        <td className="req-details">
                          <div className="req-title">{request.title}</div>
                          <div className="req-subtitle">{request.subtitle}</div>
                        </td>
                        <td className="req-status">
                          <span
                            className="ar-status-badge"
                            style={{
                              backgroundColor: getStatusColor(request.status),
                              color: getStatusTextColor(request.status),
                              borderColor: "rgba(0,0,0,0.10)",
                            }}
                          >
                            {request.status}
                          </span>
                        </td>
                        <td className="req-submitted">{request.submittedBy}</td>
                        <td className="req-action">
                          <button
                            className="btn-save ar-table-action-btn"
                            onClick={() => openModal(request)}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ margin: 0, color: "#92400e" }}>
                No unassigned requests at the moment.
              </p>
            )}
          </div>

          <div
            style={{
              marginBottom: "1rem",
              fontSize: "0.875rem",
              color: "#6b7280",
            }}
          >
            Showing {filteredRequests.length} of {requests.length} requests
          </div>

          <div className="requests-table-card">
            <table className="requests-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Request Details</th>
                  <th>Status</th>
                  <th>Submitted By</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length > 0 ? (
                  filteredRequests.map((request) => (
                    <tr key={request.id}>
                      <td>
                        <span className="req-id-chip">{request.id}</span>
                      </td>
                      <td className="req-details">
                        <div className="req-title">{request.title}</div>
                        <div className="req-subtitle">{request.subtitle}</div>
                      </td>
                      <td className="req-status">
                        <span
                          className="ar-status-badge"
                          style={{
                            backgroundColor: getStatusColor(request.status),
                            color: getStatusTextColor(request.status),
                            borderColor: "rgba(0,0,0,0.10)",
                          }}
                        >
                          {request.status}
                        </span>
                      </td>
                      <td className="req-submitted">{request.submittedBy}</td>
                      <td className="req-action">
                        <button
                          className="btn-save ar-table-action-btn"
                          onClick={() => openModal(request)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="5"
                      style={{
                        padding: "2rem",
                        textAlign: "center",
                        color: "#6b7280",
                      }}
                    >
                      No requests found matching your filters.
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
            onClick={() =>
              setAssignPopup({ open: false, title: "", message: "" })
            }
          >
            <div
              className="ar-modal"
              style={{ maxWidth: "460px", width: "92vw" }}
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
        selectedRequest &&
        createPortal(
          <div className="ar-modal modal-dialog request-detail-dialog">
            {/* Header */}
            <div className="ar-modal-header">
              <div className="ar-modal-header-top">
                <h3 className="ar-modal-title">{selectedRequest.title}</h3>
                <button className="ar-modal-close" onClick={closeModal}>
                  <X size={18} />
                </button>
              </div>
              <div className="ar-modal-badges">
                <span
                  className="ar-status-badge-modal"
                  style={{
                    backgroundColor: getStatusColor(selectedRequest.status),
                    color: getStatusTextColor(selectedRequest.status),
                    borderColor: "rgba(0,0,0,0.10)",
                  }}
                >
                  {selectedRequest.status.toUpperCase()}
                </span>
                <span className="ar-admin-tag">System Admin View</span>
              </div>
            </div>

            {/* Body */}
            <div className="ar-modal-body">
              <div className="ar-metadata-grid">
                <div className="ar-metadata-item">
                  <label className="ar-metadata-label">Citizen</label>
                  <p className="ar-metadata-value">
                    {selectedRequest.submittedBy}
                  </p>
                </div>
                <div className="ar-metadata-item">
                  <label className="ar-metadata-label">Submitted</label>
                  <p className="ar-metadata-value">{selectedRequest.date}</p>
                </div>
                <div className="ar-metadata-item">
                  <label className="ar-metadata-label">Last Update</label>
                  <p className="ar-metadata-value">
                    {selectedRequest.lastUpdate}
                  </p>
                </div>
                <div className="ar-metadata-item">
                  <label className="ar-metadata-label">Assigned Official</label>
                  <p className="ar-metadata-value ar-official-value">
                    {selectedRequest.assignedOfficial || "Unassigned"}
                  </p>
                </div>
              </div>

              <div className="ar-section">
                <h4 className="ar-section-title">Request Description</h4>
                <div className="ar-description-box">
                  {selectedRequest.description}
                </div>
              </div>

              <div className="ar-section">
                <h4 className="ar-section-title">Official Response / Notes</h4>
                <div className="ar-response-box">
                  {selectedRequest.response}
                </div>
              </div>

              <div className="ar-section">
                <h4 className="ar-section-title">Transfer Assignment</h4>
                <div
                  style={{
                    display: "grid",
                    gap: "0.75rem",
                    position: "relative",
                  }}
                >
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
                        top: "calc(100% - 0.2rem)",
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

                  <button
                    className="btn-save"
                    onClick={handleTransferRequest}
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

              {/* History — reuses RequestDetail.css timeline classes */}
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
                      const rawStatus = (h.request_status || "")
                        .toUpperCase()
                        .replace(/ /g, "_");
                      const statusLabel = h.request_status
                        ? h.request_status.replace(/_/g, " ").toUpperCase()
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
          document.body,
        )}
    </div>
  );
}
