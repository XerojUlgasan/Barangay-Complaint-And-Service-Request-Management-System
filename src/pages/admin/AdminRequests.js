import React, { useState, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";
import "../../styles/BarangayAdmin.css";
import "../../styles/RequestDetail.css";
import {
  getRequests,
  getRequestHistory,
} from "../../supabse_db/request/request";

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

export default function AdminRequests() {
  const [selectedRequestStatus, setSelectedRequestStatus] = useState("All Status");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requestDropdownOpen, setRequestDropdownOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [errorRequests, setErrorRequests] = useState(null);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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
      assignedOfficial: dbRequest.assigned_official_name || "Unassigned",
      description: dbRequest.description || "No description provided",
      response: dbRequest.remarks || "No response yet",
    };
  };

  useEffect(() => {
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
          console.error("AdminRequests: Failed to fetch requests:", result.message);
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

    fetchRequests();
  }, []);

  // Filter requests based on status
  const filteredRequests =
    selectedRequestStatus === "All Status"
      ? requests
      : requests.filter((req) => req.status === selectedRequestStatus);

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
    setIsModalOpen(true);
    fetchHistory(request.id);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setHistory([]);
    setTimeout(() => setSelectedRequest(null), 300);
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
      <div className={`ar-page-content${isModalOpen ? " modal-open-blur" : ""}`}>
      {/* Page Header */}
      <div className="page-actions" style={{ alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <h3>System-wide Requests</h3>
          <p className="muted">Monitor all service requests across the barangay.</p>
        </div>
      </div>

      {/* REQUESTS SECTION */}
      <div style={{ marginBottom: "2.5rem" }}>
        <div className="status-filter-wrapper" style={{ marginBottom: "1rem" }}>
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
              <div className="status-filter-dropdown" style={{ zIndex: 1000 }}>
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

        {errorRequests && (
          <div style={{
            padding: "1rem",
            marginBottom: "1rem",
            backgroundColor: "#fee2e2",
            borderRadius: "0.5rem",
            color: "#991b1b",
          }}>
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
              {filteredRequests.map((request) => (
                <tr key={request.id}>
                  <td><span className="req-id-chip">{request.id}</span></td>
                  <td className="req-details">
                    <div className="req-title">{request.title}</div>
                    <div className="req-subtitle">{request.subtitle}</div>
                  </td>
                  <td className="req-status">
                    <span
                      className="ar-status-badge"
                      style={{ backgroundColor: getStatusColor(request.status) }}
                    >
                      {request.status}
                    </span>
                  </td>
                  <td className="req-submitted">{request.submittedBy}</td>
                  <td className="req-action">
                    <button className="btn-save ar-table-action-btn" onClick={() => openModal(request)}>
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      </div>{/* end ar-page-content */}

      {/* Modal Overlay */}
      {isModalOpen && <div className="ar-modal-overlay" onClick={closeModal} />}

      {/* Modal */}
      {isModalOpen && selectedRequest && (
        <div className="ar-modal">
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
                style={{ backgroundColor: getStatusColor(selectedRequest.status) }}
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
                <p className="ar-metadata-value">{selectedRequest.submittedBy}</p>
              </div>
              <div className="ar-metadata-item">
                <label className="ar-metadata-label">Submitted</label>
                <p className="ar-metadata-value">{selectedRequest.date}</p>
              </div>
              <div className="ar-metadata-item">
                <label className="ar-metadata-label">Last Update</label>
                <p className="ar-metadata-value">{selectedRequest.lastUpdate}</p>
              </div>
              <div className="ar-metadata-item">
                <label className="ar-metadata-label">Assigned Official</label>
                <p className="ar-metadata-value ar-official-value">{selectedRequest.assignedOfficial}</p>
              </div>
            </div>

            <div className="ar-section">
              <h4 className="ar-section-title">Request Description</h4>
              <div className="ar-description-box">{selectedRequest.description}</div>
            </div>

            <div className="ar-section">
              <h4 className="ar-section-title">Official Response / Notes</h4>
              <div className="ar-response-box">{selectedRequest.response}</div>
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
                    const rawStatus = (h.request_status || "").toUpperCase().replace(/ /g, "_");
                    const statusLabel = h.request_status
                      ? h.request_status.replace(/_/g, " ").toUpperCase()
                      : "";
                    const dotColor = STATUS_COLOR_MAP[rawStatus] || "#6B7280";
                    return (
                      <li key={idx} className="history-item" style={{ "--dot-color": dotColor }}>
                        <div className="history-row">
                          <div className="history-row-top">
                            <span className="history-status" style={{ backgroundColor: dotColor }}>
                              {statusLabel}
                            </span>
                            <span className="history-user">{h.updater_name || "System"}</span>
                          </div>
                          <span className="history-date">{date.toLocaleString()}</span>
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
            <button className="ar-close-btn" onClick={closeModal}>Close Monitor</button>
          </div>
        </div>
      )}
    </div>
  );
}