import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getRequestHistory,
  markRequestResidentComplied,
} from "../../supabse_db/request/request";
import { logout } from "../../supabse_db/auth/auth";
import { uploadAnImage } from "../../supabse_db/uploadImages";
import supabase from "../../supabse_db/supabase_client";
import { useAuth } from "../../context/AuthContext";
import ResidentSidebar from "../../components/ResidentSidebar";
import ResidentSettings from "../../components/ResidentSettings";
import ResidentProfile from "../../components/ResidentProfile";
import "../../styles/UserPages.css";

const MyRequests = () => {
  const navigate = useNavigate();
  const { authUser, userLoading, userName } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All Status");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // History modal state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Compliance modal state
  const [showComplianceModal, setShowComplianceModal] = useState(false);
  const [complianceRequest, setComplianceRequest] = useState(null);
  const [complianceFiles, setComplianceFiles] = useState([]);
  const [complianceUploading, setComplianceUploading] = useState(false);

  useEffect(() => {
    if (userLoading || !authUser) return;

    const fetchData = async () => {
      const { data, error } = await supabase
        .from("request_tbl")
        .select(
          `*,
          official:barangay_officials!request_tbl_assigned_official_id_fkey (
            first_name,
            last_name,
            position
          )`,
        )
        .eq("requester_id", authUser.id)
        .order("created_at", { ascending: false });

      if (!error && data) setRequests(data);
      setLoading(false);
    };

    fetchData();
  }, [authUser, userLoading]);

  const handleLogoutConfirm = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleSubmitChoice = (type) => {
    setShowSubmitModal(false);
    navigate(
      type === "certificate" ? "/submit/certificate" : "/submit/complaint",
    );
  };

  const handleViewHistory = async (req) => {
    setSelectedRequest(req);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    setHistoryData([]);

    const result = await getRequestHistory(req.id);
    if (result.success) {
      const sorted = [...result.data].sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at);
        const dateB = new Date(b.updated_at || b.created_at);
        return dateB - dateA;
      });

      // Check if there's already a "pending" entry
      const hasPending = sorted.some(
        (item) => normalize(item.request_status) === "pending",
      );

      // If not, inject the initial "Pending" entry using the request's created_at
      if (!hasPending) {
        const initialEntry = {
          id: "initial-pending",
          request_status: "pending",
          remarks: null,
          official_name: null,
          created_at: req.created_at,
          updated_at: req.created_at,
        };
        sorted.push(initialEntry);
      }

      setHistoryData(sorted);
    }
    setHistoryLoading(false);
  };

  const handleOpenComplianceModal = (req) => {
    setComplianceRequest(req);
    setComplianceFiles([]);
    setShowComplianceModal(true);
  };

  const handleComplianceFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setComplianceFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveComplianceFile = (index) => {
    setComplianceFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitCompliance = async () => {
    if (complianceFiles.length === 0) {
      alert("Please attach at least one file before submitting");
      return;
    }

    setComplianceUploading(true);
    try {
      let allSuccess = true;
      const uploadedPaths = [];

      for (const file of complianceFiles) {
        const result = await uploadAnImage(
          file,
          "request",
          complianceRequest.id,
        );

        if (result.success) {
          uploadedPaths.push(result.path);
        } else {
          allSuccess = false;
          console.error(`Error uploading ${file.name}:`, result.error);
        }
      }

      if (allSuccess) {
        const statusResult = await markRequestResidentComplied(
          complianceRequest.id,
        );

        if (!statusResult.success) {
          alert(
            `Upload succeeded but status update failed: ${statusResult.message}`,
          );
          return;
        }

        const nextStatus = statusResult.status || "resident_complied";
        const nowIso = new Date().toISOString();
        setRequests((prev) =>
          prev.map((request) =>
            request.id === complianceRequest.id
              ? {
                  ...request,
                  request_status: nextStatus,
                  updated_at: nowIso,
                }
              : request,
          ),
        );

        alert(
          `Successfully submitted ${uploadedPaths.length} compliance file(s)!`,
        );
        setShowComplianceModal(false);
        setComplianceRequest(null);
        setComplianceFiles([]);
      } else {
        alert("Some files failed to upload. Please try again.");
      }
    } catch (error) {
      console.error("Error in submission:", error);
      alert("An error occurred while submitting the compliance files");
    } finally {
      setComplianceUploading(false);
    }
  };

  const closeSidebar = () => setSidebarOpen(false);

  const normalize = (str) => (str || "").toLowerCase().replace(/[\s_-]/g, "");

  const filtered =
    filter === "All Status"
      ? requests
      : requests.filter(
          (r) => normalize(r.request_status) === normalize(filter),
        );

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getBadgeClass = (status) => {
    const n = normalize(status);
    if (n === "completed") return "badge completed";
    if (n === "inprogress") return "badge progress";
    if (n === "pending") return "badge pending";
    if (n === "rejected") return "badge rejected";
    if (n === "forcompliance") return "badge forcompliance";
    if (n === "forvalidation") return "badge forvalidation";
    if (n === "residentcomplied") return "badge complied";
    if (n === "complied") return "badge complied";
    return "badge";
  };

  const formatStatus = (status) => {
    if (!status) return "";
    return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const getTimelineDot = (status) => {
    const n = normalize(status);
    if (n === "completed") return "#059669";
    if (n === "inprogress") return "#2563eb";
    if (n === "rejected") return "#dc2626";
    if (n === "forcompliance") return "#f59e0b";
    if (n === "forvalidation") return "#0369a1";
    if (n === "residentcomplied") return "#1e40af";
    if (n === "complied") return "#1e40af";
    return "#f59e0b";
  };

  const getAssignedOfficialName = (request) => {
    const official = Array.isArray(request?.official)
      ? request.official[0]
      : request?.official;

    if (!official) return "—";

    const fullName = [official.first_name, official.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();

    return fullName || "—";
  };

  return (
    <div className="user-landing-page">
      <div className="layout">
        {/* LOGOUT MODAL */}
        {showLogoutModal && (
          <div
            className="logout-modal-overlay"
            onClick={() => setShowLogoutModal(false)}
          >
            <div className="logout-modal" onClick={(e) => e.stopPropagation()}>
              <div className="logout-modal-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth="2"
                  width="32"
                  height="32"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </div>
              <h3 className="logout-modal-title">Logout</h3>
              <p className="logout-modal-message">
                Are you sure you want to logout?
              </p>
              <div className="logout-modal-actions">
                <button
                  className="logout-modal-no"
                  onClick={() => setShowLogoutModal(false)}
                >
                  No, Stay
                </button>
                <button
                  className="logout-modal-yes"
                  onClick={handleLogoutConfirm}
                >
                  Yes, Logout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SUBMIT TYPE MODAL */}
        {showSubmitModal && (
          <div
            className="submit-modal-overlay"
            onClick={() => setShowSubmitModal(false)}
          >
            <div className="submit-modal" onClick={(e) => e.stopPropagation()}>
              <div className="submit-modal-header">
                <h3 className="submit-modal-title">
                  What would you like to submit?
                </h3>
                <button
                  className="submit-modal-close"
                  onClick={() => setShowSubmitModal(false)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    width="18"
                    height="18"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="submit-modal-body">
                <button
                  className="submit-modal-option"
                  onClick={() => handleSubmitChoice("certificate")}
                >
                  <div className="submit-modal-icon-wrap green">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      width="28"
                      height="28"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <polyline points="9 15 11 17 15 13" />
                    </svg>
                  </div>
                  <span className="submit-modal-option-title">
                    Certificate Request
                  </span>
                  <span className="submit-modal-option-sub">
                    Indigency, Clearance, etc.
                  </span>
                </button>

                <button
                  className="submit-modal-option"
                  onClick={() => handleSubmitChoice("complaint")}
                >
                  <div className="submit-modal-icon-wrap red">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      width="28"
                      height="28"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <span className="submit-modal-option-title">
                    File Complaint
                  </span>
                  <span className="submit-modal-option-sub">
                    Report incidents or issues
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HISTORY MODAL */}
        {showHistoryModal && (
          <div
            className="logout-modal-overlay"
            onClick={() => setShowHistoryModal(false)}
          >
            <div className="history-modal" onClick={(e) => e.stopPropagation()}>
              <div className="history-modal-header">
                <div>
                  <h3 className="history-modal-title">Request History</h3>
                  {selectedRequest && (
                    <p className="history-modal-sub">
                      {selectedRequest.subject}
                    </p>
                  )}
                </div>
                <button
                  className="history-modal-close"
                  onClick={() => setShowHistoryModal(false)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    width="20"
                    height="20"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="history-modal-body">
                {historyLoading ? (
                  <p
                    style={{
                      color: "#888",
                      textAlign: "center",
                      padding: "24px",
                    }}
                  >
                    Loading history...
                  </p>
                ) : historyData.length === 0 ? (
                  <p
                    style={{
                      color: "#888",
                      textAlign: "center",
                      padding: "24px",
                    }}
                  >
                    No history available yet.
                  </p>
                ) : (
                  <div className="history-timeline">
                    {historyData.map((item, index) => (
                      <div className="timeline-item" key={item.id || index}>
                        <div
                          className="timeline-dot"
                          style={{
                            backgroundColor: getTimelineDot(
                              item.request_status,
                            ),
                          }}
                        />
                        {index < historyData.length - 1 && (
                          <div className="timeline-line" />
                        )}
                        <div className="timeline-content">
                          <div className="timeline-status">
                            {formatStatus(item.request_status)}
                          </div>
                          {item.remarks && (
                            <div className="timeline-remarks">
                              "{item.remarks}"
                            </div>
                          )}
                          <div className="timeline-meta">
                            {item.official_name && (
                              <span className="timeline-official">
                                by {item.official_name}
                              </span>
                            )}
                            <span className="timeline-date">
                              {formatDateTime(
                                item.updated_at || item.created_at,
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* COMPLIANCE MODAL */}
        {showComplianceModal && (
          <div
            className="logout-modal-overlay"
            onClick={() => setShowComplianceModal(false)}
          >
            <div
              className="compliance-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="compliance-modal-header">
                <div>
                  <h3 className="compliance-modal-title">Submit Compliance</h3>
                  {complianceRequest && (
                    <p className="compliance-modal-sub">
                      {complianceRequest.subject}
                    </p>
                  )}
                </div>
                <button
                  className="compliance-modal-close"
                  onClick={() => setShowComplianceModal(false)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    width="20"
                    height="20"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="compliance-modal-body">
                {complianceRequest && (
                  <>
                    <div className="compliance-section">
                      <div className="compliance-info-box">
                        <div className="compliance-info-item">
                          <label className="compliance-label">
                            Current Status
                          </label>
                          <div
                            className={`compliance-status-badge ${normalize(complianceRequest.request_status)}`}
                          >
                            {formatStatus(complianceRequest.request_status)}
                          </div>
                        </div>

                        {complianceRequest.remarks && (
                          <div className="compliance-info-item">
                            <label className="compliance-label">Remarks</label>
                            <p className="compliance-remarks">
                              {complianceRequest.remarks}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="compliance-section">
                      <label className="compliance-label">
                        Attach Compliance Files
                      </label>
                      <div
                        className={`compliance-file-input-wrapper ${complianceFiles.length > 0 ? "has-file" : ""}`}
                      >
                        <input
                          type="file"
                          id="compliance-file-input"
                          onChange={handleComplianceFileChange}
                          accept="image/*"
                          multiple
                          className="compliance-file-input"
                        />
                        <label
                          htmlFor="compliance-file-input"
                          className="compliance-file-label"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            width="24"
                            height="24"
                          >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                          <span>
                            {complianceFiles.length > 0
                              ? `${complianceFiles.length} file${complianceFiles.length > 1 ? "s" : ""} selected`
                              : "Click to upload or drag & drop"}
                          </span>
                          {complianceFiles.length === 0 && (
                            <span className="compliance-file-hint">
                              PNG, JPG, GIF up to 10MB each
                            </span>
                          )}
                        </label>
                        {complianceFiles.length > 0 && (
                          <div className="compliance-file-success">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              width="16"
                              height="16"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <path d="M9 12l2 2 4-4" />
                            </svg>
                            {complianceFiles.length} file
                            {complianceFiles.length > 1 ? "s" : ""} ready
                          </div>
                        )}
                      </div>

                      {/* File Previews */}
                      {complianceFiles.length > 0 && (
                        <div className="compliance-file-previews">
                          {complianceFiles.map((file, index) => (
                            <div
                              key={index}
                              className="compliance-file-preview-item"
                            >
                              <div className="compliance-preview-image-wrapper">
                                <img
                                  src={URL.createObjectURL(file)}
                                  alt={`Preview ${index + 1}`}
                                  className="compliance-preview-image"
                                />
                              </div>
                              <div className="compliance-preview-info">
                                <p
                                  className="compliance-preview-name"
                                  title={file.name}
                                >
                                  {file.name}
                                </p>
                                <p className="compliance-preview-size">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                              <button
                                type="button"
                                className="compliance-preview-remove"
                                onClick={() =>
                                  handleRemoveComplianceFile(index)
                                }
                                title="Remove this file"
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  width="16"
                                  height="16"
                                >
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="compliance-actions">
                      <button
                        className="compliance-cancel-btn"
                        onClick={() => setShowComplianceModal(false)}
                        disabled={complianceUploading}
                      >
                        Cancel
                      </button>
                      <button
                        className="compliance-submit-btn"
                        onClick={handleSubmitCompliance}
                        disabled={
                          complianceUploading || complianceFiles.length === 0
                        }
                      >
                        {complianceUploading ? (
                          <>
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              width="16"
                              height="16"
                              className="spinner-icon"
                            >
                              <circle cx="12" cy="12" r="10" />
                            </svg>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              width="16"
                              height="16"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <path d="M9 12l2 2 4-4" />
                            </svg>
                            Submit Compliance
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MOBILE SIDEBAR OVERLAY */}
        <div
          className={`sidebar-overlay${sidebarOpen ? " visible" : ""}`}
          onClick={closeSidebar}
        />

        {/* SIDEBAR COMPONENT */}
        <ResidentSidebar
          isOpen={sidebarOpen}
          onClose={closeSidebar}
          activePage="requests"
        />

        {/* MAIN */}
        <main className="main">
          {/* TOPBAR */}
          <div className="topbar">
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                width="20"
                height="20"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <h3>My Requests</h3>
            <div className="user">
              <div className="user-text">
                <strong>{userName || "Loading..."}</strong>
                <span>Resident</span>
              </div>
              <ResidentProfile />
              <ResidentSettings />
              <button
                onClick={() => setShowLogoutModal(true)}
                className="back-button"
                title="Logout"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </div>

          {/* CONTENT */}
          <div className="mr-content">
            <h1 className="mr-page-title">My Requests</h1>
            <p className="mr-page-sub">
              Track and manage your submitted requests
            </p>

            <div className="mr-filter-bar">
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  alignItems: "center",
                  flex: 1,
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#059669"
                  strokeWidth="2"
                  width="18"
                  height="18"
                >
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
                <select
                  className="mr-select"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option>All Status</option>
                  <option>Pending</option>
                  <option>In Progress</option>
                  <option>For Compliance</option>
                  <option>For Validation</option>
                  <option>Resident Complied</option>
                  <option>Complied</option>
                  <option>Completed</option>
                  <option>Rejected</option>
                </select>
                <span className="mr-count">
                  {filtered.length} request{filtered.length !== 1 ? "s" : ""}
                </span>
              </div>
              <button
                onClick={() => setShowSubmitModal(true)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#059669",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  width="16"
                  height="16"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Request
              </button>
            </div>

            {loading ? (
              <p style={{ color: "#888" }}>Loading requests...</p>
            ) : filtered.length === 0 ? (
              <p style={{ color: "#888" }}>No requests found.</p>
            ) : (
              <div className="mr-grid">
                {filtered.map((req) => (
                  <div className="mr-card" key={req.id}>
                    <div className="mr-card-type">
                      {req.certificate_type || req.request_type || "Request"}
                    </div>
                    <div className="mr-card-header">
                      <div className="mr-card-title-block">
                        {normalize(req.request_status) === "completed" ? (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#059669"
                            strokeWidth="2"
                            width="18"
                            height="18"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <path d="M9 12l2 2 4-4" />
                          </svg>
                        ) : (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#2563eb"
                            strokeWidth="2"
                            width="18"
                            height="18"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                        )}
                        <div>
                          <div className="mr-card-title">{req.subject}</div>
                        </div>
                      </div>
                      <span className={getBadgeClass(req.request_status)}>
                        {formatStatus(req.request_status)}
                      </span>
                    </div>

                    <p className="mr-description">{req.description}</p>

                    <div className="mr-meta">
                      <div className="mr-meta-row">
                        <span>Submitted:</span>
                        <span>{formatDate(req.created_at)}</span>
                      </div>
                      <div className="mr-meta-row">
                        <span>Assigned:</span>
                        <span>{getAssignedOfficialName(req)}</span>
                      </div>
                    </div>

                    {req.remarks && (
                      <div className="mr-notes">
                        <div className="mr-notes-label">Notes:</div>
                        {req.remarks}
                      </div>
                    )}

                    <button
                      className="history-btn"
                      onClick={() => handleViewHistory(req)}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        width="14"
                        height="14"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      View History
                    </button>

                    {normalize(req.request_status) === "forcompliance" && (
                      <button
                        className="compliance-btn"
                        onClick={() => handleOpenComplianceModal(req)}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          width="14"
                          height="14"
                        >
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                        Submit Compliance
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MyRequests;
