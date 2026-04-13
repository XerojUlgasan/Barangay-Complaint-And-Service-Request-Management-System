import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  logout,
  checkIfPasswordChangeRequired,
  updatePasswordAndSetFlag,
} from "../../supabse_db/auth/auth";
import { useAuth } from "../../context/AuthContext";
import { getRequests } from "../../supabse_db/request/request";
import {
  getComplaints,
  getComplaintsAgainstResident,
  getComplaintHistory,
  getComplaintMediationHistory,
} from "../../supabse_db/complaint/complaint";
import ResidentSidebar from "../../components/ResidentSidebar";
import ResidentSettings from "../../components/ResidentSettings";
import ResidentProfile from "../../components/ResidentProfile";
import PasswordChangeModal from "../../components/PasswordChangeModal";
import "../../styles/UserPages.css";

const COMPLAINT_SECTIONS = [
  { key: "uncategorized", label: "Uncategorized" },
  { key: "blotter", label: "Blotter" },
  { key: "for mediation", label: "For Mediation" },
  { key: "community concern", label: "Community Concern" },
];

const REQUEST_FINISHED_STATUSES = new Set([
  "completed",
  "rejected",
  "non compliant",
]);

const COMPLAINT_FINISHED_STATUSES = new Set([
  "recorded",
  "resolved",
  "rejected",
]);

const normalizeComplaintValue = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");

const getComplaintSectionLabel = (category) => {
  const key = normalizeComplaintValue(category) || "uncategorized";
  return (
    COMPLAINT_SECTIONS.find((section) => section.key === key)?.label ||
    "Uncategorized"
  );
};

const getComplaintStatusLabel = (status) => {
  const value = normalizeComplaintValue(status);
  if (value === "for review") return "For Review";
  if (value === "pending") return "Pending";
  if (value === "recorded") return "Recorded";
  if (value === "rejected") return "Rejected";
  if (value === "resolved") return "Resolved";
  return value
    ? value.replace(/\b\w/g, (char) => char.toUpperCase())
    : "For Review";
};

const getComplaintStatusColor = (status) => {
  const value = normalizeComplaintValue(status);
  if (value === "resolved") return "#10b981";
  if (value === "rejected") return "#ef4444";
  if (value === "recorded") return "#0ea5e9";
  if (value === "pending") return "#f97316";
  return "#f59e0b";
};

const getMediationStatusLabel = (status) => {
  const value = normalizeComplaintValue(status);
  if (value === "scheduled") return "Scheduled";
  if (value === "resolved") return "Resolved";
  if (value === "unresolved") return "Unresolved";
  if (value === "rejected") return "Rejected";
  if (value === "rescheduled") return "Rescheduled";
  return value
    ? value.replace(/\b\w/g, (char) => char.toUpperCase())
    : "Scheduled";
};

const getMediationStatusColor = (status) => {
  const value = normalizeComplaintValue(status);
  if (value === "scheduled") return "#0ea5e9";
  if (value === "resolved") return "#10b981";
  if (value === "unresolved") return "#f59e0b";
  if (value === "rejected") return "#ef4444";
  if (value === "rescheduled") return "#14b8a6";
  return "#6b7280";
};

const formatLongDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const formatLongDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { authUser, userLoading, userName } = useAuth();

  const [requests, setRequests] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [allMediationSessions, setAllMediationSessions] = useState([]);
  const [upcomingMediations, setUpcomingMediations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [mediationHistory, setMediationHistory] = useState([]);
  const [mediationHistoryLoading, setMediationHistoryLoading] = useState(false);

  // Password change modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (userLoading || !authUser) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [requestsRes, complaintsRes, againstRes] = await Promise.all([
          getRequests(),
          getComplaints(),
          getComplaintsAgainstResident({ userId: authUser.id }),
        ]);

        if (requestsRes.success) {
          setRequests(requestsRes.data);
        }

        const filedComplaintRows =
          complaintsRes.success && Array.isArray(complaintsRes.data)
            ? complaintsRes.data
            : [];
        const againstComplaintRows =
          againstRes.success && Array.isArray(againstRes.data)
            ? againstRes.data
            : [];

        const complaintRows = Array.from(
          new Map(
            [...filedComplaintRows, ...againstComplaintRows].map(
              (complaint) => [complaint.id, complaint],
            ),
          ).values(),
        );

        setComplaints(complaintRows);

        if (complaintRows.length > 0) {
          const mediationResults = await Promise.all(
            complaintRows.map((complaint) =>
              getComplaintMediationHistory(complaint.id),
            ),
          );

          const mediationSessions = mediationResults.flatMap((result) =>
            result.success && Array.isArray(result.data) ? result.data : [],
          );
          setAllMediationSessions(mediationSessions);

          const nowMs = Date.now();
          const upcoming = complaintRows
            .map((complaint, index) => {
              const mediationResult = mediationResults[index];
              const rows =
                mediationResult.success && Array.isArray(mediationResult.data)
                  ? mediationResult.data
                  : [];
              const latestSession = rows[rows.length - 1] || null;
              const latestStatus = normalizeComplaintValue(
                latestSession?.status,
              );
              const startMs = latestSession?.session_start
                ? new Date(latestSession.session_start).getTime()
                : Number.NaN;

              const isUpcoming =
                latestSession &&
                ["scheduled", "rescheduled"].includes(latestStatus) &&
                !Number.isNaN(startMs) &&
                startMs > nowMs;

              if (!isUpcoming) return null;

              return {
                complaint,
                latestSession,
                startMs,
              };
            })
            .filter(Boolean)
            .sort((left, right) => left.startMs - right.startMs);

          setUpcomingMediations(upcoming);
        } else {
          setAllMediationSessions([]);
          setUpcomingMediations([]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    // Check if password change is required on first login
    const checkPasswordChange = async () => {
      try {
        const needsPasswordChange = await checkIfPasswordChangeRequired();
        console.log("Needs password change:", needsPasswordChange);
        setShowPasswordModal(needsPasswordChange);
      } catch (error) {
        console.error("Error checking password change requirement:", error);
      }
    };

    fetchData();
    checkPasswordChange();
  }, [authUser, userLoading]);

  const handleLogoutConfirm = useCallback(async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  }, [navigate]);

  const handleSubmitChoice = useCallback(
    (type) => {
      setShowSubmitModal(false);
      navigate(
        type === "certificate" ? "/submit/certificate" : "/submit/complaint",
      );
    },
    [navigate],
  );

  const handlePasswordChange = useCallback(
    async (e) => {
      e.preventDefault();
      setPasswordError("");

      if (!newPassword || !confirmPassword) {
        setPasswordError("Please fill in all fields.");
        return;
      }

      if (newPassword !== confirmPassword) {
        setPasswordError("Passwords do not match.");
        return;
      }

      if (newPassword.length < 6) {
        setPasswordError("Password must be at least 6 characters.");
        return;
      }

      setPasswordLoading(true);
      const result = await updatePasswordAndSetFlag(newPassword);
      setPasswordLoading(false);

      if (!result.success) {
        setPasswordError(result.message);
        return;
      }

      // Password changed successfully, close modal
      setShowPasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
    },
    [newPassword, confirmPassword],
  );

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const loadComplaintHistory = useCallback(async (complaint) => {
    const result = await getComplaintHistory(complaint.id);

    if (!result.success) {
      return [];
    }

    const sorted = [...result.data].sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at);
      const dateB = new Date(b.updated_at || b.created_at);
      return dateA - dateB;
    });

    if (sorted.length === 0) {
      sorted.push({
        id: "initial-snapshot",
        status: complaint.status,
        category: complaint.category,
        remarks: complaint.description,
        updater_name: null,
        priority_level: complaint.priority_level,
        created_at: complaint.created_at,
        updated_at: complaint.created_at,
        assigned_official_id: complaint.assigned_official_id,
        mediation_accepted: complaint.mediation_accepted,
      });
    }

    return sorted;
  }, []);

  const handleOpenComplaintDetails = useCallback(
    async (complaint) => {
      setSelectedComplaint(complaint);
      setHistoryLoading(true);
      setMediationHistoryLoading(true);
      setHistoryData([]);
      setMediationHistory([]);

      const [historyRows, mediationRowsResult] = await Promise.all([
        loadComplaintHistory(complaint),
        getComplaintMediationHistory(complaint.id),
      ]);

      setHistoryData(historyRows);
      setMediationHistory(
        mediationRowsResult.success && Array.isArray(mediationRowsResult.data)
          ? mediationRowsResult.data
          : [],
      );
      setHistoryLoading(false);
      setMediationHistoryLoading(false);
      setShowDetailsModal(true);
    },
    [loadComplaintHistory],
  );

  const closeComplaintDetails = useCallback(() => {
    setShowDetailsModal(false);
    setHistoryLoading(false);
    setMediationHistoryLoading(false);
    setHistoryData([]);
    setMediationHistory([]);
    setSelectedComplaint(null);
  }, []);

  const {
    finishedRequestCount,
    unfinishedRequestCount,
    finishedComplaintCount,
    unfinishedComplaintCount,
  } = useMemo(() => {
    const requestSummary = {
      total: requests.length,
      finished: 0,
    };

    requests.forEach((request) => {
      const normalizedStatus = normalizeComplaintValue(request.request_status);
      if (REQUEST_FINISHED_STATUSES.has(normalizedStatus)) {
        requestSummary.finished++;
      }
    });

    const complaintSummary = {
      total: complaints.length,
      finished: 0,
      unfinished: 0,
    };

    complaints.forEach((complaint) => {
      const normalizedStatus = normalizeComplaintValue(complaint.status);

      if (COMPLAINT_FINISHED_STATUSES.has(normalizedStatus)) {
        complaintSummary.finished++;
      } else {
        complaintSummary.unfinished++;
      }
    });

    return {
      finishedRequestCount: requestSummary.finished,
      unfinishedRequestCount: requestSummary.total - requestSummary.finished,
      finishedComplaintCount: complaintSummary.finished,
      unfinishedComplaintCount: complaintSummary.unfinished,
    };
  }, [requests, complaints]);

  const getBadgeClass = useCallback((status) => {
    const n = (status || "").toLowerCase().replace(/[\s_-]/g, "");
    if (n === "completed" || n === "resolved") return "badge completed";
    if (n === "inprogress") return "badge progress";
    if (n === "pending") return "badge pending";
    if (n === "rejected" || n === "dismissed") return "badge rejected";
    return "badge";
  }, []);

  const latestMediationSession =
    mediationHistory[mediationHistory.length - 1] || null;

  const formatRespondents = useCallback((respondentId) => {
    if (!respondentId) return "—";
    const ids = Array.isArray(respondentId) ? respondentId : [respondentId];
    return ids.filter(Boolean).join(", ") || "—";
  }, []);

  return (
    <div className="user-landing-page">
      <div className="layout">
        {/* LOGOUT CONFIRMATION MODAL */}
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

        {/* PASSWORD CHANGE MODAL (First-time Login) */}
        <PasswordChangeModal
          open={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
          onSubmit={handlePasswordChange}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          showNewPassword={showNewPassword}
          setShowNewPassword={setShowNewPassword}
          showConfirmPassword={showConfirmPassword}
          setShowConfirmPassword={setShowConfirmPassword}
          passwordError={passwordError}
          passwordLoading={passwordLoading}
        />

        {showDetailsModal && selectedComplaint && (
          <div className="logout-modal-overlay" onClick={closeComplaintDetails}>
            <div
              className="details-modal resident-complaint-details-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="history-modal-header">
                <div>
                  <h3 className="history-modal-title">Complaint Details</h3>
                  <p className="history-modal-sub">
                    {selectedComplaint.complaint_type}
                  </p>
                </div>
                <button
                  className="history-modal-close"
                  onClick={closeComplaintDetails}
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
                <div className="details-grid">
                  <div className="details-row">
                    <span className="details-label">Status</span>
                    <span className={getBadgeClass(selectedComplaint.status)}>
                      {getComplaintStatusLabel(selectedComplaint.status)}
                    </span>
                  </div>
                  <div className="details-row">
                    <span className="details-label">Category</span>
                    <span className="details-value">
                      {getComplaintSectionLabel(selectedComplaint.category)}
                    </span>
                  </div>
                  <div className="details-row">
                    <span className="details-label">Submitted</span>
                    <span className="details-value">
                      {formatLongDateTime(selectedComplaint.created_at)}
                    </span>
                  </div>
                  <div className="details-row">
                    <span className="details-label">Incident Date</span>
                    <span className="details-value">
                      {formatLongDate(selectedComplaint.incident_date)}
                    </span>
                  </div>
                  <div className="details-row">
                    <span className="details-label">Location</span>
                    <span className="details-value">
                      {selectedComplaint.incident_location || "—"}
                    </span>
                  </div>
                  <div className="details-row">
                    <span className="details-label">Assigned To</span>
                    <span className="details-value">
                      {selectedComplaint.assigned_official_name || "—"}
                    </span>
                  </div>
                  <div className="details-row">
                    <span className="details-label">Respondent</span>
                    <span className="details-value">
                      {formatRespondents(selectedComplaint.respondent_id)}
                    </span>
                  </div>
                  {selectedComplaint.description && (
                    <div className="details-full">
                      <span className="details-label">Description</span>
                      <p className="details-desc">
                        {selectedComplaint.description}
                      </p>
                    </div>
                  )}
                  {selectedComplaint.remarks && (
                    <div className="details-full">
                      <span className="details-label">Remarks</span>
                      <p className="details-desc">
                        {selectedComplaint.remarks}
                      </p>
                    </div>
                  )}
                </div>

                <div className="resident-history-section">
                  <div className="resident-history-header">
                    <h4>History</h4>
                    <span>Tracks status and category updates over time.</span>
                  </div>

                  {historyLoading ? (
                    <p className="modal-empty-text">Loading history...</p>
                  ) : historyData.length === 0 ? (
                    <p className="modal-empty-text">
                      No history available yet.
                    </p>
                  ) : (
                    <div className="history-timeline resident-history-timeline">
                      {historyData.map((item, index) => {
                        const itemStatus = getComplaintStatusLabel(item.status);
                        const itemCategory = getComplaintSectionLabel(
                          item.category,
                        );
                        const itemDot = getComplaintStatusColor(item.status);
                        const previousItem = historyData[index - 1] || null;
                        const changeNotes = [];

                        if (!previousItem) {
                          changeNotes.push("Created complaint record");
                        } else {
                          if (
                            normalizeComplaintValue(previousItem.status) !==
                            normalizeComplaintValue(item.status)
                          ) {
                            changeNotes.push(`Status set to ${itemStatus}`);
                          }
                          if (
                            normalizeComplaintValue(previousItem.category) !==
                            normalizeComplaintValue(item.category)
                          ) {
                            changeNotes.push(`Category set to ${itemCategory}`);
                          }
                        }

                        return (
                          <div className="timeline-item" key={item.id || index}>
                            <div
                              className="timeline-dot"
                              style={{ backgroundColor: itemDot }}
                            />
                            {index < historyData.length - 1 && (
                              <div className="timeline-line" />
                            )}
                            <div className="timeline-content">
                              <div className="resident-history-badges">
                                <span
                                  className="resident-history-badge"
                                  style={{ backgroundColor: itemDot }}
                                >
                                  {itemStatus}
                                </span>
                                <span className="resident-history-badge category">
                                  {itemCategory}
                                </span>
                              </div>
                              {changeNotes.length > 0 && (
                                <div className="resident-history-changes">
                                  {changeNotes.join(" • ")}
                                </div>
                              )}
                              <div className="timeline-meta">
                                <span className="timeline-date">
                                  {formatLongDateTime(
                                    item.updated_at || item.created_at,
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="resident-history-section resident-mediation-history-section">
                  <div className="resident-history-header">
                    <h4>Mediation Status</h4>
                    <span>Tracks mediation schedule and status updates.</span>
                  </div>

                  <div className="details-grid resident-mediation-summary-grid">
                    <div className="details-row">
                      <span className="details-label">Current status</span>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: latestMediationSession
                            ? getMediationStatusColor(
                                latestMediationSession.status,
                              )
                            : "#6b7280",
                        }}
                      >
                        {latestMediationSession
                          ? getMediationStatusLabel(
                              latestMediationSession.status,
                            )
                          : "Awaiting schedule"}
                      </span>
                    </div>
                    <div className="details-row">
                      <span className="details-label">Latest schedule</span>
                      <span className="details-value">
                        {latestMediationSession
                          ? `${formatLongDateTime(latestMediationSession.session_start)} to ${formatLongDateTime(latestMediationSession.session_end)}`
                          : "No session yet"}
                      </span>
                    </div>
                  </div>

                  {mediationHistoryLoading ? (
                    <p className="modal-empty-text">
                      Loading mediation history...
                    </p>
                  ) : mediationHistory.length === 0 ? (
                    <p className="modal-empty-text">
                      No mediation history available yet.
                    </p>
                  ) : (
                    <div className="history-timeline resident-history-timeline">
                      {mediationHistory.map((item, index) => (
                        <div className="timeline-item" key={item.id || index}>
                          <div
                            className="timeline-dot"
                            style={{
                              backgroundColor: getMediationStatusColor(
                                item.status,
                              ),
                            }}
                          />
                          {index < mediationHistory.length - 1 && (
                            <div className="timeline-line" />
                          )}
                          <div className="timeline-content">
                            <div className="resident-history-badges">
                              <span
                                className="resident-history-badge"
                                style={{
                                  backgroundColor: getMediationStatusColor(
                                    item.status,
                                  ),
                                }}
                              >
                                {getMediationStatusLabel(item.status)}
                              </span>
                            </div>
                            <div className="timeline-priority">
                              Session: {formatLongDateTime(item.session_start)}{" "}
                              to {formatLongDateTime(item.session_end)}
                            </div>
                            <div className="timeline-meta">
                              <span className="timeline-date">
                                {formatLongDateTime(item.created_at)}
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
          </div>
        )}

        {/* SIDEBAR COMPONENT */}
        <ResidentSidebar
          isOpen={sidebarOpen}
          onClose={closeSidebar}
          activePage="dashboard"
        />

        {/* MAIN CONTENT */}
        <main className="main">
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

            <h3>Dashboard</h3>

            <div className="user">
              <div className="user-text">
                <strong>{authUser?.email || "Loading..."}</strong>
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

          <div className="welcome">
            <h1>Welcome, {userName || "..."}!</h1>
            <p>Manage your barangay services and requests</p>
          </div>

          {upcomingMediations.length > 0 && (
            <div className="resident-dashboard-mediation-notice">
              <div className="resident-dashboard-mediation-notice-head">
                <h3>Upcoming Mediation Schedule</h3>
                <span>
                  {upcomingMediations.length} upcoming mediation
                  {upcomingMediations.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="resident-dashboard-mediation-list">
                {upcomingMediations.map((item) => (
                  <div
                    className="resident-dashboard-mediation-item"
                    key={item.latestSession.id || item.complaint.id}
                  >
                    <div className="resident-dashboard-mediation-copy">
                      <strong>
                        {item.complaint.complaint_type || "Complaint"}
                      </strong>
                      <p>
                        {formatLongDateTime(item.latestSession.session_start)}{" "}
                        to {formatLongDateTime(item.latestSession.session_end)}
                      </p>
                      <span>
                        Location:{" "}
                        {item.complaint.incident_location || "Not specified"}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="resident-dashboard-mediation-view"
                      onClick={() => handleOpenComplaintDetails(item.complaint)}
                    >
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="action-cards">
            <button
              onClick={() => setShowSubmitModal(true)}
              className="card blue clickable"
              style={{ border: "none", cursor: "pointer", textAlign: "left" }}
            >
              <div className="circle">+</div>
              <div className="card-content">
                <h3>Submit New Request</h3>
                <p>File complaints or request services</p>
              </div>
            </button>
            <a href="/announcements" className="card green clickable">
              <div className="circle">!</div>
              <div className="card-content">
                <h3>Announcements</h3>
                <p>View barangay announcements</p>
              </div>
            </a>
          </div>

          <div className="status-cards">
            <div className="status">
              <div className="status-left">
                <p>Finished Requests</p>
                <h2>{loading ? "..." : finishedRequestCount}</h2>
              </div>
              <div className="status-icon green-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>
            </div>

            <div className="status">
              <div className="status-left">
                <p>Unfinished Requests</p>
                <h2>{loading ? "..." : unfinishedRequestCount}</h2>
              </div>
              <div className="status-icon yellow">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
            </div>

            <div className="status">
              <div className="status-left">
                <p>Finished Complaints</p>
                <h2>{loading ? "..." : finishedComplaintCount}</h2>
              </div>
              <div className="status-icon green-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>
            </div>

            <div className="status">
              <div className="status-left">
                <p>Unfinished Complaints</p>
                <h2>{loading ? "..." : unfinishedComplaintCount}</h2>
              </div>
              <div className="status-icon blue-icon">!</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
