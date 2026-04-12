import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getComplaints,
  getComplaintHistory,
  getComplaintMediationHistory,
  updateComplaintMediationAccepted,
} from "../../supabse_db/complaint/complaint";
import { logout } from "../../supabse_db/auth/auth";
import supabase from "../../supabse_db/supabase_client";
import {
  formatResidentFullName,
  getResidentsByAuthUids,
  getResidentSummariesByAuthUids,
} from "../../supabse_db/resident/resident";
import { useAuth } from "../../context/AuthContext";
import ResidentSidebar from "../../components/ResidentSidebar";
import ResidentSettings from "../../components/ResidentSettings";
import ResidentProfile from "../../components/ResidentProfile";
import "../../styles/UserPages.css";

const COMPLAINT_SECTIONS = [
  { key: "uncategorized", label: "Uncategorized" },
  { key: "blotter", label: "Blotters" },
  { key: "for mediation", label: "For Mediation" },
  { key: "community concern", label: "Community Concern" },
];

const STATUS_OPTIONS = [
  "All Status",
  "For Review",
  "Rejected",
  "Resolved",
  "Recorded",
  "Pending",
];

const normalizeComplaintValue = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");

const isExplicitFalse = (value) =>
  value === false || normalizeComplaintValue(value) === "false";

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

const getComplaintSectionKey = (category) => {
  const value = normalizeComplaintValue(category);
  return value || "uncategorized";
};

const getComplaintSectionLabel = (category) => {
  const key = getComplaintSectionKey(category);
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

const MyComplaints = () => {
  const navigate = useNavigate();
  const { authUser, resident, residentLoading, userName, userRole } = useAuth();

  const [activeTab, setActiveTab] = useState("filed");
  const [complaints, setComplaints] = useState([]);
  const [againstComplaints, setAgainstComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [againstLoading, setAgainstLoading] = useState(true);
  const [activeComplaintSection, setActiveComplaintSection] =
    useState("uncategorized");
  const [filter, setFilter] = useState("All Status");
  const [againstFilter, setAgainstFilter] = useState("All Status");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [mediationHistory, setMediationHistory] = useState([]);
  const [mediationHistoryLoading, setMediationHistoryLoading] = useState(false);
  const [showMediationModal, setShowMediationModal] = useState(false);
  const [mediationProcessing, setMediationProcessing] = useState(false);
  const [mediationNotice, setMediationNotice] = useState("");
  const [mediationError, setMediationError] = useState("");
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
        let currentResidentId = resident?.id || null;
        let filedRows = [];
        let residentNameMap = {};

        const result = await getComplaints({
          userId: authUser.id,
          userRole: userRole || "resident",
        });
        if (result.success) {
          filedRows = Array.isArray(result.data) ? result.data : [];
          const respondentAuthUids = [
            ...new Set(
              filedRows.flatMap((complaint) => complaint.respondent_id || []),
            ),
          ].filter(Boolean);
          const complainantAuthUids = filedRows
            .map((complaint) => complaint.complainant_id)
            .filter(Boolean);

          const [respondentsResult, complainantsResult] = await Promise.all([
            getResidentSummariesByAuthUids(respondentAuthUids),
            getResidentsByAuthUids(complainantAuthUids),
          ]);

          if (respondentsResult.success) {
            Object.entries(respondentsResult.data).forEach(
              ([authUid, summary]) => {
                residentNameMap[authUid] =
                  summary.resident_fullname ||
                  summary.fullname ||
                  "Unknown Resident";
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
          setComplaints(
            filedRows.map((complaint) => ({
              ...complaint,
              sectionKey: getComplaintSectionKey(complaint.category),
              sectionLabel: getComplaintSectionLabel(complaint.category),
              statusLabel: getComplaintStatusLabel(complaint.status),
              statusColor: getComplaintStatusColor(complaint.status),
              createdLabel: formatLongDateTime(complaint.created_at),
              incidentLabel: formatLongDate(complaint.incident_date),
              complainant_name:
                residentNameMap[complaint.complainant_id] || "Unknown",
              respondent_names: (complaint.respondent_id || [])
                .map(
                  (respondentId) =>
                    residentNameMap[respondentId] || respondentId,
                )
                .join(", "),
            })),
          );
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
                first_name,
                last_name
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
                    ? `${complaint.assigned_official.first_name} ${complaint.assigned_official.last_name}`
                    : null,
                }))
              : [];
        }

        const againstRespondentAuthUids = againstRows
          .flatMap((complaint) => complaint.respondent_id || [])
          .filter(Boolean);
        const complainantAuthUids = againstRows
          .map((complaint) => complaint.complainant_id)
          .filter(Boolean);

        const [respondentsResult, complainantsResult] = await Promise.all([
          getResidentSummariesByAuthUids(againstRespondentAuthUids),
          getResidentsByAuthUids(complainantAuthUids),
        ]);

        if (respondentsResult.success) {
          Object.entries(respondentsResult.data).forEach(
            ([authUid, summary]) => {
              residentNameMap[authUid] =
                summary.resident_fullname ||
                summary.fullname ||
                "Unknown Resident";
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
  }, [authUser, resident, residentLoading, userRole]);

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

  const loadComplaintHistory = async (complaint) => {
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
  };

  const loadComplaintMediationHistory = async (complaintId) => {
    const result = await getComplaintMediationHistory(complaintId);

    if (!result.success) {
      return [];
    }

    return Array.isArray(result.data) ? result.data : [];
  };

  const handleOpenComplaintDetails = async (complaint) => {
    setSelectedComplaint(complaint);
    setHistoryLoading(true);
    setMediationHistoryLoading(true);
    setHistoryData([]);
    setMediationHistory([]);

    const [history, mediationHistoryRows] = await Promise.all([
      loadComplaintHistory(complaint),
      loadComplaintMediationHistory(complaint.id),
    ]);

    setHistoryData(history);
    setMediationHistory(mediationHistoryRows);
    setHistoryLoading(false);
    setMediationHistoryLoading(false);
    setMediationNotice("");
    setMediationError("");
    setShowDetailsModal(true);
  };

  const handleViewDetails = handleOpenComplaintDetails;

  const handleViewAgainst = (complaint) => {
    setAgainstDetail(complaint);
    setShowAgainstModal(true);
  };

  const closeComplaintDetails = () => {
    setShowDetailsModal(false);
    setShowMediationModal(false);
    setMediationProcessing(false);
    setMediationNotice("");
    setMediationError("");
    setMediationHistory([]);
    setMediationHistoryLoading(false);
  };

  const handleOpenMediationConfirmation = () => {
    setMediationError("");
    setMediationNotice("");
    setShowMediationModal(true);
  };

  const handleConfirmMediation = async () => {
    if (!selectedComplaint) return;

    setMediationProcessing(true);
    setMediationError("");

    const result = await updateComplaintMediationAccepted(selectedComplaint.id);

    if (!result.success) {
      setMediationError(result.message || "Failed to accept mediation request");
      setMediationProcessing(false);
      return;
    }

    const updatedComplaint = {
      ...selectedComplaint,
      mediation_accepted: true,
      status: "for review",
      statusLabel: getComplaintStatusLabel("for review"),
      statusColor: getComplaintStatusColor("for review"),
    };

    setSelectedComplaint(updatedComplaint);
    setComplaints((prevComplaints) =>
      prevComplaints.map((complaint) =>
        complaint.id === updatedComplaint.id
          ? {
              ...complaint,
              mediation_accepted: true,
              status: "for review",
              statusLabel: getComplaintStatusLabel("for review"),
              statusColor: getComplaintStatusColor("for review"),
            }
          : complaint,
      ),
    );
    const refreshedHistory = await loadComplaintHistory(updatedComplaint);
    setHistoryData(refreshedHistory);
    setMediationProcessing(false);
    setShowMediationModal(true);
    setMediationNotice(
      "Mediation request accepted. Please wait for further informamtion about the schedule.",
    );
  };

  const closeSidebar = () => setSidebarOpen(false);

  const normalize = (str) => (str || "").toLowerCase().replace(/[\s_-]/g, "");

  const filtered = complaints.filter((c) => {
    const sectionMatch =
      getComplaintSectionKey(c.category) === activeComplaintSection;
    const statusMatch =
      filter === "All Status" || normalize(c.statusLabel) === normalize(filter);
    return sectionMatch && statusMatch;
  });

  const filteredAgainst =
    againstFilter === "All Status"
      ? againstComplaints
      : againstComplaints.filter(
          (c) => normalize(c.status) === normalize(againstFilter),
        );

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const getBadgeClass = (status) => {
    const n = normalize(status);
    if (n === "resolved") return "badge completed";
    if (n === "rejected" || n === "dismissed") return "badge rejected";
    if (n === "forreview" || n === "pending") return "badge pending";
    return "badge";
  };

  const formatStatus = (status) => {
    if (!status) return "";
    return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const sectionCounts = COMPLAINT_SECTIONS.reduce((accumulator, section) => {
    accumulator[section.key] = complaints.filter(
      (complaint) => getComplaintSectionKey(complaint.category) === section.key,
    ).length;
    return accumulator;
  }, {});

  const latestMediationSession =
    mediationHistory[mediationHistory.length - 1] || null;

  // Resolves respondent UUIDs to full names using the fetched map
  const formatRespondents = (respondentId) => {
    if (!respondentId) return "—";
    const ids = Array.isArray(respondentId) ? respondentId : [respondentId];
    if (ids.length === 0) return "—";
    const names = ids.map(
      (id) => respondentNames[id] || id || "Unknown Resident",
    );
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

        {/* MY COMPLAINT DETAILS MODAL */}
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

              {getComplaintSectionKey(selectedComplaint.category) ===
                "for mediation" &&
                isExplicitFalse(selectedComplaint.mediation_accepted) && (
                  <div className="resident-mediation-cta-wrap">
                    <div className="resident-mediation-cta-copy">
                      <strong>Mediation Request</strong>
                      <span>
                        Request barangay mediation for this complaint.
                      </span>
                    </div>
                    <button
                      type="button"
                      className="resident-mediation-cta"
                      onClick={handleOpenMediationConfirmation}
                    >
                      Accept Mediation
                    </button>
                  </div>
                )}

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
                    <span>
                      Tracks status, category, and official updates over time.
                    </span>
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
                          if (
                            normalizeComplaintValue(
                              previousItem.mediation_accepted,
                            ) !==
                            normalizeComplaintValue(item.mediation_accepted)
                          ) {
                            changeNotes.push(
                              `Mediation ${item.mediation_accepted ? "accepted" : "not accepted"}`,
                            );
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

                {((selectedComplaint.category || "").toLowerCase() ===
                  "for mediation" ||
                  selectedComplaint.mediation_accepted ||
                  mediationHistory.length > 0) && (
                  <div className="resident-history-section resident-mediation-history-section">
                    <div className="resident-history-header">
                      <h4>Mediation Status</h4>
                      <span>
                        Tracks the mediation table history linked to this
                        complaint.
                      </span>
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
                              : selectedComplaint.mediation_accepted
                                ? "#0ea5e9"
                                : "#6b7280",
                          }}
                        >
                          {latestMediationSession
                            ? getMediationStatusLabel(
                                latestMediationSession.status,
                              )
                            : selectedComplaint.mediation_accepted
                              ? "Accepted"
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
                      <div className="details-row">
                        <span className="details-label">Last update</span>
                        <span className="details-value">
                          {latestMediationSession
                            ? formatLongDateTime(
                                latestMediationSession.created_at,
                              )
                            : "—"}
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
                        {mediationHistory.map((item, index) => {
                          const previousItem =
                            mediationHistory[index - 1] || null;
                          const changeNotes = [];

                          if (!previousItem) {
                            changeNotes.push("Mediation record created");
                          } else if (
                            normalizeComplaintValue(previousItem.status) !==
                            normalizeComplaintValue(item.status)
                          ) {
                            changeNotes.push(
                              `Status set to ${getMediationStatusLabel(item.status)}`,
                            );
                          }

                          return (
                            <div
                              className="timeline-item"
                              key={item.id || index}
                            >
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
                                  <span className="resident-history-badge category">
                                    {formatLongDateTime(item.session_start)}
                                  </span>
                                </div>

                                {changeNotes.length > 0 && (
                                  <div className="resident-history-changes">
                                    {changeNotes.join(" • ")}
                                  </div>
                                )}

                                <div className="timeline-priority">
                                  Session:{" "}
                                  {formatLongDateTime(item.session_start)} to{" "}
                                  {formatLongDateTime(item.session_end)}
                                </div>

                                <div className="timeline-meta">
                                  <span className="timeline-date">
                                    {formatLongDateTime(item.created_at)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showMediationModal && selectedComplaint && (
          <div
            className="logout-modal-overlay"
            onClick={() => setShowMediationModal(false)}
          >
            <div
              className="details-modal resident-mediation-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="history-modal-header">
                <div>
                  <h3 className="history-modal-title">
                    Mediation Confirmation
                  </h3>
                  <p className="history-modal-sub">
                    {selectedComplaint.complaint_type}
                  </p>
                </div>
                <button
                  className="history-modal-close"
                  onClick={() => setShowMediationModal(false)}
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
              <div className="history-modal-body resident-mediation-body">
                {mediationNotice ? (
                  <div className="resident-mediation-success">
                    <p>{mediationNotice}</p>
                    <button
                      type="button"
                      className="resident-mediation-close-btn"
                      onClick={() => setShowMediationModal(false)}
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="resident-mediation-copy">
                      <p>
                        You are about to request mediation assistance from the
                        Barangay regarding your concern.
                      </p>
                      <p>
                        By proceeding, you agree to participate in a peaceful
                        and voluntary settlement process facilitated by
                        authorized barangay officials. The purpose of mediation
                        is to resolve disputes amicably between parties without
                        escalating the matter to formal legal action.
                      </p>
                      <div className="resident-mediation-notes">
                        <strong>Please note:</strong>
                        <ul>
                          <li>
                            Both parties will be invited to attend a scheduled
                            mediation session.
                          </li>
                          <li>
                            Your cooperation and honest participation are
                            expected.
                          </li>
                          <li>
                            Any agreement reached during mediation may be
                            documented and recognized by the barangay.
                          </li>
                        </ul>
                      </div>
                      <p className="resident-mediation-question">
                        Do you wish to proceed with your request for mediation?
                      </p>
                    </div>

                    {mediationError && (
                      <div className="resident-mediation-error">
                        {mediationError}
                      </div>
                    )}

                    <div className="resident-mediation-actions">
                      <button
                        type="button"
                        className="resident-mediation-cancel"
                        onClick={() => setShowMediationModal(false)}
                        disabled={mediationProcessing}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="resident-mediation-confirm"
                        onClick={handleConfirmMediation}
                        disabled={mediationProcessing}
                      >
                        {mediationProcessing
                          ? "Accepting..."
                          : "Accept Mediation"}
                      </button>
                    </div>
                  </>
                )}
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
                <div className="resident-complaint-section-tabs">
                  {COMPLAINT_SECTIONS.map((section) => (
                    <button
                      key={section.key}
                      type="button"
                      className={`resident-complaint-section-tab${activeComplaintSection === section.key ? " active" : ""}`}
                      onClick={() => setActiveComplaintSection(section.key)}
                    >
                      <span>{section.label}</span>
                      <span className="resident-complaint-section-count">
                        {sectionCounts[section.key] || 0}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="mr-filter-bar resident-complaint-filter-bar">
                  <div className="resident-complaint-filter-left">
                    <select
                      className="mr-select"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      {STATUS_OPTIONS.map((statusOption) => (
                        <option key={statusOption}>{statusOption}</option>
                      ))}
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

                <div className="resident-complaint-section-summary">
                  <strong>
                    {getComplaintSectionLabel(activeComplaintSection)}
                  </strong>
                  <span>
                    Showing the complaints in this category. Use the status
                    filter to narrow the list.
                  </span>
                </div>

                {loading ? (
                  <p className="mr-empty-text">Loading complaints...</p>
                ) : filtered.length === 0 ? (
                  <p className="mr-empty-text">No complaints found.</p>
                ) : (
                  <div className="requests-table-card resident-complaints-table-card">
                    <table className="requests-table balanced-table resident-complaints-table">
                      <thead>
                        <tr>
                          <th>Complaint Type</th>
                          <th>Respondent(s)</th>
                          <th>Incident Date</th>
                          <th>Submitted</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((complaint) => (
                          <tr key={complaint.id}>
                            <td>
                              <div className="resident-complaint-title-wrap">
                                <span className="mr-card-compact-title">
                                  {complaint.complaint_type}
                                </span>
                                <span className="resident-complaint-subtitle">
                                  {complaint.incident_location || "—"}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className="resident-complaint-respondents">
                                {complaint.respondent_names ||
                                  formatRespondents(complaint.respondent_id)}
                              </span>
                            </td>
                            <td>
                              <span className="resident-complaint-date">
                                {complaint.incidentLabel ||
                                  formatLongDate(complaint.incident_date)}
                              </span>
                            </td>
                            <td>
                              <span className="resident-complaint-date">
                                {complaint.createdLabel ||
                                  formatLongDateTime(complaint.created_at)}
                              </span>
                            </td>
                            <td>
                              <span
                                className="badge"
                                style={{
                                  backgroundColor:
                                    complaint.statusColor ||
                                    getComplaintStatusColor(complaint.status),
                                }}
                              >
                                {complaint.statusLabel ||
                                  getComplaintStatusLabel(complaint.status)}
                              </span>
                            </td>
                            <td>
                              <button
                                className="details-btn"
                                onClick={() => handleViewDetails(complaint)}
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
