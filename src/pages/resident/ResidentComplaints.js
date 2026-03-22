import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getComplaints,
  getComplaintHistory,
} from "../../supabse_db/complaint/complaint";
import { logout } from "../../supabse_db/auth/auth";
import supabase from "../../supabse_db/supabase_client";
import {
  formatResidentFullName,
  getResidentsByAuthUids,
  getResidentsByIds,
} from "../../supabse_db/resident/resident";
import { useAuth } from "../../context/AuthContext";
import ResidentSidebar from "../../components/ResidentSidebar";
import "../../styles/UserPages.css";

const MyComplaints = () => {
  const navigate = useNavigate();
  const { authUser, resident, residentLoading, userName, userRole } = useAuth();

  const [activeTab, setActiveTab] = useState("filed");
  const [complaints, setComplaints] = useState([]);
  const [againstComplaints, setAgainstComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [againstLoading, setAgainstLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [filter, setFilter] = useState("All Status");
  const [againstFilter, setAgainstFilter] = useState("All Status");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsComplaint, setDetailsComplaint] = useState(null);
  const [detailsIsAgainst, setDetailsIsAgainst] = useState(false);
  const [showAgainstModal, setShowAgainstModal] = useState(false);
  const [againstDetail, setAgainstDetail] = useState(null);
  const [respondentNames, setRespondentNames] = useState({});

  useEffect(() => {
    // Wait until auth context has finished loading the resident so this
    // effect only fires once — not once for authUser changing and again
    // when resident data arrives.
    if (residentLoading) return;

    const fetchData = async () => {
      if (authUser) {
        setCurrentUserId(authUser.id);

        let currentResidentId = resident?.id || null;

        const result = await getComplaints({
          userId: authUser.id,
          userRole: userRole || "resident",
        });
        const filedData = result.success ? result.data : [];
        if (result.success) {
          setComplaints(result.data);
        }

        let againstRows = [];

        if (currentResidentId) {
          // Try multiple strategies to find complaints where respondent_id contains the resident id.
          // Different DB setups may store respondent_id as number, string, text[], or jsonb array.
          console.log(
            `[Filed Against Me] currentResidentId=${currentResidentId} (type=${typeof currentResidentId})`,
          );

          const selectExpr = `
              *,
              assigned_official:assigned_official_id (
                firstname,
                lastname
              )
            `;

          let againstData = null;
          let againstError = null;

          const attempts = Array.from(
            new Set(
              [
                currentResidentId,
                authUser.id,
                String(currentResidentId),
                String(authUser.id),
              ].filter(Boolean),
            ),
          );

          // 1) Try .contains with numeric and string representation
          for (const attemptVal of attempts) {
            try {
              const res = await supabase
                .from("complaint_tbl")
                .select(selectExpr)
                .contains("respondent_id", [attemptVal]);

              if (res.error) {
                console.log(
                  `[Filed Against Me] .contains attempt(${typeof attemptVal}): error`,
                  res.error,
                );
              } else if (res.data && res.data.length > 0) {
                againstData = res.data;
                againstError = null;
                console.log(
                  `[Filed Against Me] .contains success with value=${attemptVal}: rows=`,
                  res.data.length,
                );
                break;
              } else {
                console.log(
                  `[Filed Against Me] .contains attempt(${attemptVal}) returned 0 rows`,
                );
              }
            } catch (err) {
              console.log(
                `[Filed Against Me] .contains attempt(${attemptVal}) threw:`,
                err,
              );
            }
          }

          // 2) Try raw 'cs' filter with JSON string (older approach) as fallback
          if (!againstData) {
            for (const attemptVal of attempts) {
              try {
                // Postgres array literal for the 'cs' operator expects {"val1","val2"}
                const pgArray = `{"${attemptVal}"}`;
                const res = await supabase
                  .from("complaint_tbl")
                  .select(selectExpr)
                  .filter("respondent_id", "cs", pgArray);

                if (res.error) {
                  console.log(
                    `[Filed Against Me] .filter cs attempt(${attemptVal}): error`,
                    res.error,
                  );
                } else if (res.data && res.data.length > 0) {
                  againstData = res.data;
                  againstError = null;
                  console.log(
                    `[Filed Against Me] .filter cs success with value=${attemptVal}: rows=`,
                    res.data.length,
                  );
                  break;
                } else {
                  console.log(
                    `[Filed Against Me] .filter cs attempt(${attemptVal}) returned 0 rows`,
                  );
                }
              } catch (err) {
                console.log(
                  `[Filed Against Me] .filter cs attempt(${attemptVal}) threw:`,
                  err,
                );
              }
            }
          }

          // 3) As a last resort, fetch recent complaints and filter client-side (less efficient)
          if (!againstData) {
            try {
              const res = await supabase
                .from("complaint_tbl")
                .select(selectExpr)
                .order("created_at", { ascending: false });

              if (res.error) {
                console.log(
                  "[Filed Against Me] fallback fetch error:",
                  res.error,
                );
                againstError = res.error;
              } else if (res.data) {
                const rows = res.data || [];
                const filtered = rows.filter((row) => {
                  const r = row.respondent_id;
                  if (!r) return false;
                  if (Array.isArray(r)) {
                    return (
                      r.includes(currentResidentId) ||
                      r.includes(String(currentResidentId))
                    );
                  }
                  // try parsing if it's a JSON string
                  if (typeof r === "string") {
                    try {
                      const parsed = JSON.parse(r);
                      if (Array.isArray(parsed)) {
                        return (
                          parsed.includes(currentResidentId) ||
                          parsed.includes(String(currentResidentId))
                        );
                      }
                    } catch (e) {
                      // string but not JSON - compare directly
                      return (
                        r === String(currentResidentId) ||
                        r === currentResidentId
                      );
                    }
                  }
                  return false;
                });

                if (filtered.length > 0) {
                  againstData = filtered;
                  againstError = null;
                  console.log(
                    `[Filed Against Me] client-side filter found rows=`,
                    filtered.length,
                  );
                } else {
                  console.log(
                    `[Filed Against Me] client-side filter found 0 rows`,
                  );
                }
              }
            } catch (err) {
              console.log("[Filed Against Me] fallback fetch threw:", err);
              againstError = err;
            }
          }

          // Map result to againstRows as before
          againstRows =
            !againstError && againstData
              ? againstData.map((complaint) => ({
                  ...complaint,
                  complainant_name: "—",
                  assigned_official_name: complaint.assigned_official
                    ? `${complaint.assigned_official.firstname} ${complaint.assigned_official.lastname}`
                    : null,
                }))
              : [];
        }

        const filedRows = Array.isArray(filedData) ? filedData : [];
        const respondentResidentIds = [...filedRows, ...againstRows]
          .flatMap((complaint) => complaint.respondent_id || [])
          .filter(Boolean);
        const complainantAuthUids = againstRows
          .map((complaint) => complaint.complainant_id)
          .filter(Boolean);

        const [respondentsResult, complainantsResult] = await Promise.all([
          getResidentsByIds(respondentResidentIds),
          getResidentsByAuthUids(complainantAuthUids),
        ]);

        const residentNameMap = {};

        if (respondentsResult.success) {
          Object.entries(respondentsResult.data).forEach(
            ([residentId, resident]) => {
              residentNameMap[residentId] = formatResidentFullName(resident);
            },
          );
        }

        if (complainantsResult.success) {
          Object.entries(complainantsResult.data).forEach(
            ([authUid, resident]) => {
              residentNameMap[authUid] = formatResidentFullName(resident);
            },
          );
        }

        setRespondentNames(residentNameMap);
        setAgainstComplaints(
          againstRows.map((complaint) => ({
            ...complaint,
            complainant_name: residentNameMap[complaint.complainant_id] || "—",
          })),
        );
        setAgainstLoading(false);
      } else {
        setComplaints([]);
        setAgainstLoading(false);
      }

      setLoading(false);
    };

    fetchData();
  }, [authUser, resident, residentLoading]);

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
    navigate(type === "certificate" ? "/submit/certificate" : "/submit/complaint");
  };

  const handleViewHistory = async (complaint) => {
    setSelectedComplaint(complaint);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    setHistoryData([]);

    const result = await getComplaintHistory(complaint.id);
    if (result.success) {
      const sorted = [...result.data].sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at);
        const dateB = new Date(b.updated_at || b.created_at);
        return dateB - dateA;
      });

      const hasPending = sorted.some(
        (item) => normalize(item.status) === "pending",
      );
      if (!hasPending) {
        sorted.push({
          id: "initial-pending",
          status: "pending",
          remarks: null,
          updater_name: null,
          priority_level: null,
          created_at: complaint.created_at,
          updated_at: complaint.created_at,
        });
      }
      setHistoryData(sorted);
    }
    setHistoryLoading(false);
  };

  const handleViewDetails = (complaint) => {
    setDetailsComplaint(complaint);
    setShowDetailsModal(true);
  };

  const handleViewAgainst = (complaint) => {
    setAgainstDetail(complaint);
    setShowAgainstModal(true);
  };

  const closeSidebar = () => setSidebarOpen(false);

  const normalize = (str) => (str || "").toLowerCase().replace(/[\s_-]/g, "");

  const filtered =
    filter === "All Status"
      ? complaints
      : complaints.filter((c) => normalize(c.status) === normalize(filter));

  const filteredAgainst =
    againstFilter === "All Status"
      ? againstComplaints
      : againstComplaints.filter(
          (c) => normalize(c.status) === normalize(againstFilter),
        );

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
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
    if (n === "resolved" || n === "completed") return "badge completed";
    if (n === "inprogress") return "badge progress";
    if (n === "pending") return "badge pending";
    if (n === "rejected" || n === "dismissed") return "badge rejected";
    if (n === "forvalidation") return "badge forvalidation";
    if (n === "noncompliant") return "badge forcompliance";
    return "badge";
  };

  const formatStatus = (status) => {
    if (!status) return "";
    return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const getTimelineDot = (status) => {
    const n = normalize(status);
    if (n === "resolved" || n === "completed") return "#059669";
    if (n === "inprogress") return "#2563eb";
    if (n === "rejected" || n === "dismissed") return "#dc2626";
    if (n === "forvalidation") return "#0369a1";
    if (n === "noncompliant") return "#f59e0b";
    return "#f59e0b";
  };

  // Resolves respondent UUIDs to full names using the fetched map
  const formatRespondents = (respondentId) => {
    if (!respondentId) return "—";
    const ids = Array.isArray(respondentId) ? respondentId : [respondentId];
    if (ids.length === 0) return "—";
    const names = ids.map((id) => respondentNames[id] || "Unknown Resident");
    return names.join(", ");
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
                  <h3 className="history-modal-title">Complaint History</h3>
                  {selectedComplaint && (
                    <p className="history-modal-sub">
                      {selectedComplaint.complaint_type}
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
                  <p className="modal-empty-text">Loading history...</p>
                ) : historyData.length === 0 ? (
                  <p className="modal-empty-text">No history available yet.</p>
                ) : (
                  <div className="history-timeline">
                    {historyData.map((item, index) => (
                      <div className="timeline-item" key={item.id || index}>
                        <div
                          className="timeline-dot"
                          style={{
                            backgroundColor: getTimelineDot(item.status),
                          }}
                        />
                        {index < historyData.length - 1 && (
                          <div className="timeline-line" />
                        )}
                        <div className="timeline-content">
                          <div className="timeline-status">
                            {formatStatus(item.status)}
                          </div>
                          {item.priority_level && (
                            <div className="timeline-priority">
                              Priority: {item.priority_level}
                            </div>
                          )}
                          {item.remarks && (
                            <div className="timeline-remarks">
                              "{item.remarks}"
                            </div>
                          )}
                          <div className="timeline-meta">
                            {item.updater_name && (
                              <span className="timeline-official">
                                by {item.updater_name}
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

        {/* MY COMPLAINT DETAILS MODAL */}
        {showDetailsModal && detailsComplaint && (
          <div
            className="logout-modal-overlay"
            onClick={() => setShowDetailsModal(false)}
          >
            <div className="details-modal" onClick={(e) => e.stopPropagation()}>
              <div className="history-modal-header">
                <div>
                  <h3 className="history-modal-title">Complaint Details</h3>
                  <p className="history-modal-sub">
                    {detailsComplaint.complaint_type}
                  </p>
                </div>
                <button
                  className="history-modal-close"
                  onClick={() => setShowDetailsModal(false)}
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
                    <span className={getBadgeClass(detailsComplaint.status)}>
                      {formatStatus(detailsComplaint.status) || "Pending"}
                    </span>
                  </div>
                  <div className="details-row">
                    <span className="details-label">Priority</span>
                    <span className="details-value">
                      {detailsComplaint.priority_level || "Not set"}
                    </span>
                  </div>
                  <div className="details-row">
                    <span className="details-label">Submitted</span>
                    <span className="details-value">
                      {formatDate(detailsComplaint.created_at)}
                    </span>
                  </div>
                  <div className="details-row">
                    <span className="details-label">Incident Date</span>
                    <span className="details-value">
                      {formatDate(detailsComplaint.incident_date)}
                    </span>
                  </div>
                  <div className="details-row">
                    <span className="details-label">Location</span>
                    <span className="details-value">
                      {detailsComplaint.incident_location || "—"}
                    </span>
                  </div>
                  {/* ASSIGNED TO: barangay official handling the complaint */}
                  <div className="details-row">
                    <span className="details-label">Assigned To</span>
                    <span className="details-value">
                      {detailsComplaint.assigned_official_name || "—"}
                    </span>
                  </div>
                  {/* RESPONDENT: resident(s) named in the complaint, resolved to real names */}
                  <div className="details-row">
                    <span className="details-label">Respondent</span>
                    <span className="details-value">
                      {formatRespondents(detailsComplaint.respondent_id)}
                    </span>
                  </div>
                  {detailsComplaint.description && (
                    <div className="details-full">
                      <span className="details-label">Description</span>
                      <p className="details-desc">
                        {detailsComplaint.description}
                      </p>
                    </div>
                  )}
                  {detailsComplaint.remarks && (
                    <div className="details-full">
                      <span className="details-label">Remarks</span>
                      <p className="details-desc">{detailsComplaint.remarks}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* COMPLAINT AGAINST ME MODAL */}
        {showAgainstModal && againstDetail && (
          <div
            className="logout-modal-overlay"
            onClick={() => setShowAgainstModal(false)}
          >
            <div className="details-modal" onClick={(e) => e.stopPropagation()}>
              <div className="history-modal-header">
                <div>
                  <h3 className="history-modal-title">Complaint Against You</h3>
                  <p className="history-modal-sub">
                    {againstDetail.complaint_type}
                  </p>
                </div>
                <button
                  className="history-modal-close"
                  onClick={() => setShowAgainstModal(false)}
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
                {/* Who filed */}
                <div className="against-filer-box">
                  <div className="against-filer-icon">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#dc2626"
                      strokeWidth="2"
                      width="20"
                      height="20"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div>
                    <div className="against-filer-label">Filed by</div>
                    <div className="against-filer-name">
                      {againstDetail.complainant_name}
                    </div>
                  </div>
                </div>

                <div className="details-grid">
                  <div className="details-row">
                    <span className="details-label">Status</span>
                    <span className={getBadgeClass(againstDetail.status)}>
                      {formatStatus(againstDetail.status) || "Pending"}
                    </span>
                  </div>
                  <div className="details-row">
                    <span className="details-label">Priority</span>
                    <span className="details-value">
                      {againstDetail.priority_level || "Not set"}
                    </span>
                  </div>
                  <div className="details-row">
                    <span className="details-label">Submitted</span>
                    <span className="details-value">
                      {formatDate(againstDetail.created_at)}
                    </span>
                  </div>
                  <div className="details-row">
                    <span className="details-label">Incident Date</span>
                    <span className="details-value">
                      {formatDate(againstDetail.incident_date)}
                    </span>
                  </div>
                  <div className="details-row">
                    <span className="details-label">Location</span>
                    <span className="details-value">
                      {againstDetail.incident_location || "—"}
                    </span>
                  </div>
                  {/* ASSIGNED TO: barangay official handling the complaint */}
                  <div className="details-row">
                    <span className="details-label">Assigned To</span>
                    <span className="details-value">
                      {againstDetail.assigned_official_name || "—"}
                    </span>
                  </div>
                  {/* RESPONDENT: resident(s) named in the complaint, resolved to real names */}
                  <div className="details-row">
                    <span className="details-label">Respondent</span>
                    <span className="details-value">
                      {formatRespondents(againstDetail.respondent_id)}
                    </span>
                  </div>
                  {againstDetail.description && (
                    <div className="details-full">
                      <span className="details-label">Description</span>
                      <p className="details-desc">
                        {againstDetail.description}
                      </p>
                    </div>
                  )}
                  {againstDetail.remarks && (
                    <div className="details-full">
                      <span className="details-label">
                        Remarks from Official
                      </span>
                      <p className="details-desc details-desc-remarks">
                        {againstDetail.remarks}
                      </p>
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
          activePage="complaints"
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
            <h3>My Complaints</h3>
            <div className="user">
              <div className="user-text">
                <strong>{userName || "Loading..."}</strong>
                <span>Resident</span>
              </div>
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
            <h1 className="mr-page-title">My Complaints</h1>
            <p className="mr-page-sub">
              Track and manage your complaint records
            </p>

            {/* ── TAB SWITCHER ── */}
            <div className="complaints-tab-bar">
              <button
                className={`complaints-tab${activeTab === "filed" ? " active" : ""}`}
                onClick={() => setActiveTab("filed")}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  width="15"
                  height="15"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                Complaints I Filed
                <span className="tab-count">{complaints.length}</span>
              </button>
              <button
                className={`complaints-tab${activeTab === "against" ? " active against" : ""}`}
                onClick={() => setActiveTab("against")}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  width="15"
                  height="15"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Filed Against Me
                {againstComplaints.length > 0 && (
                  <span className="tab-count against">
                    {againstComplaints.length}
                  </span>
                )}
              </button>
            </div>

            {/* ── TAB: COMPLAINTS I FILED ── */}
            {activeTab === "filed" && (
              <>
                <div className="mr-filter-bar">
                  <div style={{ display: "flex", gap: "12px", alignItems: "center", flex: 1 }}>
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
                      <option>Resolved</option>
                      <option>Rejected</option>
                      <option>Dismissed</option>
                    </select>
                    <span className="mr-count">
                      {filtered.length} complaint
                      {filtered.length !== 1 ? "s" : ""}
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
                    New Complaint
                  </button>
                </div>

                {loading ? (
                  <p className="mr-empty-text">Loading complaints...</p>
                ) : filtered.length === 0 ? (
                  <p className="mr-empty-text">No complaints found.</p>
                ) : (
                  <div className="mr-grid-4">
                    {filtered.map((complaint) => (
                      <div className="mr-card-compact" key={complaint.id}>
                        <div className="mr-card-compact-header">
                          <div className="mr-card-compact-icon">
                            {normalize(complaint.status) === "resolved" ||
                            normalize(complaint.status) === "completed" ? (
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#059669"
                                strokeWidth="2"
                                width="14"
                                height="14"
                              >
                                <circle cx="12" cy="12" r="10" />
                                <path d="M9 12l2 2 4-4" />
                              </svg>
                            ) : (
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#dc2626"
                                strokeWidth="2"
                                width="14"
                                height="14"
                              >
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                              </svg>
                            )}
                          </div>
                          <span className={getBadgeClass(complaint.status)}>
                            {formatStatus(complaint.status) || "Pending"}
                          </span>
                        </div>
                        <div className="mr-card-compact-title">
                          {complaint.complaint_type}
                        </div>
                        <p className="mr-card-compact-desc">
                          {complaint.description}
                        </p>
                        <div className="mr-card-compact-actions">
                          <button
                            className="details-btn"
                            onClick={() => handleViewDetails(complaint)}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              width="12"
                              height="12"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="8" x2="12" y2="12" />
                              <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            Details
                          </button>
                          <button
                            className="history-btn-compact"
                            onClick={() => handleViewHistory(complaint)}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              width="12"
                              height="12"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            History
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── TAB: FILED AGAINST ME ── */}
            {activeTab === "against" && (
              <>
                <div className="mr-filter-bar">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth="2"
                    width="18"
                    height="18"
                  >
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>
                  <select
                    className="mr-select against-select"
                    value={againstFilter}
                    onChange={(e) => setAgainstFilter(e.target.value)}
                  >
                    <option>All Status</option>
                    <option>Pending</option>
                    <option>In Progress</option>
                    <option>Resolved</option>
                    <option>Rejected</option>
                    <option>Dismissed</option>
                  </select>
                  <span className="mr-count">
                    {filteredAgainst.length} complaint
                    {filteredAgainst.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {againstLoading ? (
                  <p className="mr-empty-text">Loading...</p>
                ) : filteredAgainst.length === 0 ? (
                  <div className="against-empty">
                    <div className="against-empty-icon">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#d1d5db"
                        strokeWidth="1.5"
                        width="48"
                        height="48"
                      >
                        <path d="M9 12l2 2 4-4" />
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                      </svg>
                    </div>
                    <p className="against-empty-title">
                      No complaints against you
                    </p>
                    <p className="against-empty-sub">
                      You're all clear — no one has filed a complaint against
                      you.
                    </p>
                  </div>
                ) : (
                  <div className="mr-grid-4">
                    {filteredAgainst.map((complaint) => (
                      <div
                        className="mr-card-compact against-card"
                        key={complaint.id}
                      >
                        <div className="mr-card-compact-header">
                          <div className="mr-card-compact-icon against-icon">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#dc2626"
                              strokeWidth="2"
                              width="14"
                              height="14"
                            >
                              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                              <line x1="12" y1="9" x2="12" y2="13" />
                              <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                          </div>
                          <span className={getBadgeClass(complaint.status)}>
                            {formatStatus(complaint.status) || "Pending"}
                          </span>
                        </div>

                        <div className="mr-card-compact-title">
                          {complaint.complaint_type}
                        </div>

                        {/* Filer info */}
                        <div className="against-card-filer">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#9ca3af"
                            strokeWidth="2"
                            width="11"
                            height="11"
                          >
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                          <span>
                            Filed by:{" "}
                            <strong>{complaint.complainant_name}</strong>
                          </span>
                        </div>

                        <p className="mr-card-compact-desc">
                          {complaint.description}
                        </p>

                        <div className="mr-card-compact-actions">
                          <button
                            className="details-btn against-details-btn"
                            onClick={() => handleViewAgainst(complaint)}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              width="12"
                              height="12"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="8" x2="12" y2="12" />
                              <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MyComplaints;
