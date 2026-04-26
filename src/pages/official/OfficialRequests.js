import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import RequestDetail from "../../components/RequestDetail";
import {
  getAssignedRequests,
  updateRequestStatus,
} from "../../supabse_db/official/official";
import { claimRequest, unclaimRequest } from "../../supabse_db/request/request";
import supabase from "../../supabse_db/supabase_client";
import "../../styles/BarangayAdmin.css";
import "../../styles/RequestDetail.css";

const STATUS_COLORS = {
  Pending: "#fbbf24",
  "In Progress": "#3b82f6",
  Completed: "#10b981",
  Rejected: "#ef4444",
  "Resident Complied": "#14b8a6",
  "For Compliance": "#8b5cf6",
  "Non Compliant": "#ec4899",
  "For Validation": "#06b6d4",
};

const STATUS_LABELS = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  rejected: "Rejected",
  resident_complied: "Resident Complied",
  for_compliance: "For Compliance",
  non_compliant: "Non Compliant",
  for_validation: "For Validation",
};

const normalizeStatus = (status) => {
  if (!status) return "Pending";
  const normalized = typeof status === "string" ? status.toLowerCase() : status;
  return STATUS_LABELS[normalized] || status;
};

const toStatusCode = (status) => {
  if (!status) return "PENDING";
  return String(status).toUpperCase().replace(/ /g, "_");
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default function OfficialRequests() {
  const location = useLocation();
  const [selectedRequestStatus, setSelectedRequestStatus] =
    useState("All Status");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requestDropdownOpen, setRequestDropdownOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [errorRequests, setErrorRequests] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [claimFilter, setClaimFilter] = useState("all");

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

  const getCurrentUser = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      setCurrentUserId(userData.user.id);
    }
  };

  const fetchAssignedRequests = async () => {
    try {
      setLoadingRequests(true);
      setErrorRequests(null);
      const result = await getAssignedRequests();
      if (result.success && Array.isArray(result.data)) {
        const formattedRequests = result.data.map((req) => {
          const rawStatus = req.request_status || req.status || "pending";
          return {
            ...req,
            id: req.id,
            title: req.subject || "Untitled Request",
            type: req.certificate_type || "Request",
            status: toStatusCode(rawStatus),
            statusDisplay: normalizeStatus(rawStatus),
            submittedBy: req.requester_name || "Unknown",
            date: req.created_at
              ? new Date(req.created_at).toISOString().split("T")[0]
              : "N/A",
            submissionDate: req.created_at
              ? new Date(req.created_at).toLocaleDateString()
              : "N/A",
            lastUpdate: req.updated_at
              ? new Date(req.updated_at).toISOString().split("T")[0]
              : req.created_at
                ? new Date(req.created_at).toISOString().split("T")[0]
                : "N/A",
            description: req.description || "No description provided",
            internalNotes: req.remarks || "",
            assigned_official_id: req.assigned_official_id || null,
            assigned_official_name: req.assigned_official_name || null,
          };
        });
        setRequests(formattedRequests);
      } else {
        setErrorRequests(result.message || "Failed to fetch requests");
        setRequests([]);
      }
    } catch (error) {
      setErrorRequests("Error fetching requests: " + error.message);
      setRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchAssignedRequests();
    getCurrentUser();
  }, []);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") handleCloseModal();
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

  useEffect(() => {
    // Auto-open modal if redirected from dashboard
    if (
      location.state?.selectedRequestId &&
      location.state?.openModal &&
      requests.length > 0
    ) {
      const request = requests.find(
        (r) => r.id === location.state.selectedRequestId,
      );
      if (request) {
        openModal(request);
        // Clear the location state after opening
        window.history.replaceState({}, document.title);
      }
    }
  }, [requests, location.state]);

  const filterOptions = [
    "All Status",
    "Pending",
    "In Progress",
    "Completed",
    "Rejected",
    "Resident Complied",
    "For Compliance",
    "Non Compliant",
    "For Validation",
  ];

  const filteredRequests = requests.filter((request) => {
    const statusMatch =
      selectedRequestStatus === "All Status" ||
      request.statusDisplay === selectedRequestStatus;
    const searchableColumns = [
      request.id,
      request.title,
      request.type,
      request.submittedBy,
      request.date,
      request.statusDisplay,
      request.description,
      request.internalNotes,
    ]
      .join(" ")
      .toLowerCase();
    const searchMatch =
      searchTerms.length === 0 ||
      searchTerms.every((term) => searchableColumns.includes(term));
    const requestDate = new Date(request.date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    const dateMatch =
      (!start || requestDate >= start) && (!end || requestDate <= end);
    
    let claimMatch = true;
    if (claimFilter === "mine") {
      claimMatch = request.assigned_official_id === currentUserId;
    } else if (claimFilter === "others") {
      claimMatch = request.assigned_official_id && request.assigned_official_id !== currentUserId;
    } else if (claimFilter === "unclaimed") {
      claimMatch = !request.assigned_official_id;
    }
    
    return statusMatch && searchMatch && dateMatch && claimMatch;
  });

  const openModal = (request) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
  };

  const handleSaveRequest = async (updatedData) => {
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
      const result = await updateRequestStatus(
        updatedData.requestId,
        dbStatus,
        updatedData.internalNotes,
      );
      if (result.success) {
        await fetchAssignedRequests();
        handleCloseModal();
      } else {
        console.error("Failed to update request:", result.message);
      }
    } catch (error) {
      console.error("Error saving request update:", error);
    }
  };

  const handleClaimRequest = async (requestId) => {
    const result = await claimRequest(requestId);
    if (result.success) {
      await fetchAssignedRequests();
      handleCloseModal();
    }
  };

  const handleUnclaimRequest = async (requestId) => {
    const result = await unclaimRequest(requestId);
    if (result.success) {
      await fetchAssignedRequests();
      handleCloseModal();
    }
  };

  return (
    <div className={`admin-page${isModalOpen ? " modal-open-blur" : ""}`}>
      <div className="ar-page-content">
        <div
          className="page-actions"
          style={{ alignItems: "flex-start", marginBottom: 12 }}
        >
          <div>
            <h3>Assigned Requests</h3>
            <p className="muted">Review and manage requests assigned to you.</p>
          </div>
        </div>

        <div style={{ marginBottom: "2.5rem" }}>
          {/* ── Filters ── */}
          <div className="table-filters">
            <div className="filter-search">
              <label className="filter-label">Search</label>
              <input
                type="text"
                placeholder="Search by subject, type, requester, or description..."
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
                  max={
                    new Date(
                      new Date().getTime() -
                        new Date().getTimezoneOffset() * 60000,
                    )
                      .toISOString()
                      .split("T")[0]
                  }
                  className="filter-date-input"
                />
              </div>
              <div>
                <label className="filter-label">To</label>
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
                  className="filter-date-input"
                />
              </div>
              {(startDate || endDate || searchQuery) && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="filter-clear-btn"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* ── Claim Filter Buttons ── */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
            <button
              onClick={() => setClaimFilter("all")}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                backgroundColor: claimFilter === "all" ? "#3b82f6" : "#fff",
                color: claimFilter === "all" ? "#fff" : "#374151",
                fontWeight: "500",
                cursor: "pointer",
              }}
            >
              All
            </button>
            <button
              onClick={() => setClaimFilter("mine")}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                backgroundColor: claimFilter === "mine" ? "#10b981" : "#fff",
                color: claimFilter === "mine" ? "#fff" : "#374151",
                fontWeight: "500",
                cursor: "pointer",
              }}
            >
              My Claims
            </button>
            <button
              onClick={() => setClaimFilter("others")}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                backgroundColor: claimFilter === "others" ? "#f59e0b" : "#fff",
                color: claimFilter === "others" ? "#fff" : "#374151",
                fontWeight: "500",
                cursor: "pointer",
              }}
            >
              Claimed by Others
            </button>
            <button
              onClick={() => setClaimFilter("unclaimed")}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                backgroundColor: claimFilter === "unclaimed" ? "#ef4444" : "#fff",
                color: claimFilter === "unclaimed" ? "#fff" : "#374151",
                fontWeight: "500",
                cursor: "pointer",
              }}
            >
              Unclaimed
            </button>
          </div>

          {/* ── Status Dropdown ── */}
          <div
            className="status-filter-wrapper"
            style={{ marginBottom: "1rem" }}
          >
            <button
              className="status-filter-btn"
              onClick={() => setRequestDropdownOpen(!requestDropdownOpen)}
            >
              <span>{selectedRequestStatus}</span>
              <ChevronDown size={16} />
            </button>
            {requestDropdownOpen && (
              <>
                <div
                  style={{ position: "fixed", inset: 0, zIndex: 999 }}
                  onClick={() => setRequestDropdownOpen(false)}
                />
                <div className="status-dropdown">
                  {filterOptions.map((status) => (
                    <button
                      key={status}
                      className={`status-option${selectedRequestStatus === status ? " active" : ""}`}
                      onClick={() => {
                        setSelectedRequestStatus(status);
                        setRequestDropdownOpen(false);
                      }}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="table-count-label">
            Showing {filteredRequests.length} of {requests.length} requests
          </div>

          {/* ── Table ── */}
          <div className="requests-table-card">
            <table className="requests-table balanced-table">
              <thead>
                <tr>
                  <th>Request Subject</th>
                  <th>Type</th>
                  <th>Requester</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingRequests ? (
                  <tr>
                    <td colSpan="6">
                      <div
                        className="loading-wrap"
                        style={{ padding: "1rem 0" }}
                      >
                        <div className="loading-spinner" aria-hidden="true" />
                        <div className="loading-text">Loading requests...</div>
                      </div>
                    </td>
                  </tr>
                ) : errorRequests ? (
                  <tr>
                    <td
                      colSpan="6"
                      style={{ color: "#ef4444", textAlign: "center" }}
                    >
                      {errorRequests}
                    </td>
                  </tr>
                ) : filteredRequests.length > 0 ? (
                  filteredRequests.map((r) => {
                    const color = STATUS_COLORS[r.statusDisplay] || "#9ca3af";
                    return (
                      <tr key={r.id}>
                        <td>
                          <span className="req-title">
                            {highlightText(r.title)}
                          </span>
                        </td>
                        <td>
                          <span className="req-type-chip">
                            {highlightText(r.type)}
                          </span>
                        </td>
                        <td>
                          <span className="req-submitted">
                            {highlightText(r.submittedBy)}
                          </span>
                        </td>
                        <td>
                          <span className="req-submitted">
                            {highlightText(r.date)}
                          </span>
                        </td>
                        <td>
                          <span
                            className="req-status-badge"
                            style={{ backgroundColor: color }}
                          >
                            {highlightText(r.statusDisplay)}
                          </span>
                        </td>
                        <td>
                          <button
                            className="view-details-btn"
                            onClick={() => openModal(r)}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="table-empty-cell">
                      No requests found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <RequestDetail
        request={selectedRequest}
        itemType="request"
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveRequest}
        onClaim={handleClaimRequest}
        onUnclaim={handleUnclaimRequest}
        currentUserId={currentUserId}
      />
    </div>
  );
}
