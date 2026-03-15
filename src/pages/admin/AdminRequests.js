import React, { useState, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";
import "../../styles/BarangayAdmin.css";
import "../../styles/RequestDetail.css"; // reuse modal/history styles from official view
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

const normalizeStatus = (status) => {
  if (!status) return "Pending";
  const normalized = typeof status === "string" ? status.toLowerCase() : status;
  return STATUS_LABELS[normalized] || status;
};

const getStatusColor = (statusLabel) => STATUS_COLORS[statusLabel] || "#9ca3af";

export default function AdminRequests() {
  const [selectedRequestStatus, setSelectedRequestStatus] =
    useState("All Status");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requestDropdownOpen, setRequestDropdownOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [errorRequests, setErrorRequests] = useState(null);

  // history for selected request (shown in modal)
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Transform database request data to match UI format
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
          // Transform the data to match UI expectations
          const transformedRequests = result.data.map((req) =>
            transformRequestData(req),
          );
          console.log("AdminRequests: Transformed data:", transformedRequests);

          // If database returned results, use them; otherwise use sample data
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
      if (e.key === "Escape") {
        closeModal();
      }
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

  const openModal = (request) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
    // fetch history immediately after opening
    fetchHistory(request.id);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setHistory([]); // clear previous history
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
        <div className="status-filter-wrapper" style={{ marginBottom: "1rem" }}>
          <button
            className="status-filter-btn"
            onClick={() => setRequestDropdownOpen(!requestDropdownOpen)}
          >
            {selectedRequestStatus}
            <ChevronDown size={18} style={{ marginLeft: "0.5rem" }} />
          </button>
          {requestDropdownOpen && (
            <div className="status-filter-dropdown">
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
          )}
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
                  <td className="req-id">{request.id}</td>
                  <td className="req-details">
                    <div className="req-title">{request.title}</div>
                    <div className="req-subtitle">{request.subtitle}</div>
                  </td>
                  <td className="req-status">
                    <span
                      className={`status-badge ${request.status.toLowerCase().replace(/ /g, "_")}`}
                    >
                      {request.status}
                    </span>
                  </td>
                  <td className="req-submitted">{request.submittedBy}</td>
                  <td className="req-action">
                    <button
                      className="view-details-btn"
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
      </div>

      {/* Modal Overlay */}
      {isModalOpen && <div className="modal-overlay" onClick={closeModal} />}

      {/* Modal */}
      {isModalOpen && selectedRequest && (
        <div className="request-modal">
          {/* Modal Header */}
          <div className="request-modal-header">
            <div className="modal-header-top">
              <h3 className="modal-request-title">{selectedRequest.title}</h3>
              <button className="modal-close-x" onClick={closeModal}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-header-badges">
              <span
                className="status-badge-modal"
                style={{
                  backgroundColor: getStatusColor(selectedRequest.status),
                  color: "#fff",
                }}
              >
                {selectedRequest.status.toUpperCase()}
              </span>
              <span className="admin-tag-modal">System Admin View</span>
            </div>
          </div>

          {/* Modal Content */}
          <div className="modal-body">
            {/* Metadata Grid */}
            <div className="request-metadata-grid">
              <div className="metadata-item">
                <label className="metadata-label">Citizen</label>
                <p className="metadata-value">{selectedRequest.submittedBy}</p>
              </div>
              <div className="metadata-item">
                <label className="metadata-label">Submitted</label>
                <p className="metadata-value">{selectedRequest.date}</p>
              </div>
              <div className="metadata-item">
                <label className="metadata-label">Last Update</label>
                <p className="metadata-value">{selectedRequest.lastUpdate}</p>
              </div>
              <div className="metadata-item">
                <label className="metadata-label">Assigned Official</label>
                <p className="metadata-value">
                  {selectedRequest.assignedOfficial}
                </p>
              </div>
            </div>

            {/* Description Box */}
            <div className="request-section">
              <h4 className="section-title">Request Description</h4>
              <div className="description-box">
                {selectedRequest.description}
              </div>
            </div>

            {/* Response Box */}
            <div className="request-section">
              <h4 className="section-title">Official Response / Notes</h4>
              <div className="response-box">{selectedRequest.response}</div>
            </div>

            {/* History Section (mirrors official view) */}
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
                    const statusLabel = h.request_status
                      ? h.request_status.replace(/_/g, " ").toUpperCase()
                      : "";
                    return (
                      <li key={idx} className="history-item">
                        <div className="history-row">
                          <span className="history-date">
                            {date.toLocaleString()}
                          </span>
                          <span className="history-status">{statusLabel}</span>
                          <span className="history-user">
                            {h.updater_name || "System"}
                          </span>
                        </div>
                        {h.remarks && (
                          <div className="history-remarks">{h.remarks}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="no-history">No history available.</p>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer-request">
            <button className="close-button" onClick={closeModal}>
              Close Monitor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
