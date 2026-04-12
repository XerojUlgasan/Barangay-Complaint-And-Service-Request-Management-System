import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { CalendarDays, FileText, MapPin, Tag, Users, X } from "lucide-react";
import {
  getAssignedComplaints,
  updateComplaintCategory,
} from "../../supabse_db/official/official";
import {
  createComplaintMediationSession,
  getActiveMediationSessions,
  getComplaintMediationHistory,
  updateComplaintMediationStatus,
} from "../../supabse_db/complaint/complaint";
import {
  formatPhilippineDateOnly,
  formatPhilippineDateTime,
  formatPhilippineShortDateTime,
  toPhilippineDateTimeLocalValue,
} from "../../utils/philippineTime";
import "../../styles/BarangayAdmin.css";

const SECTION_CONFIGS = [
  {
    key: "uncategorized",
    label: "Uncategorized",
    description: "Complaints without a category. Only these can be classified.",
  },
  {
    key: "blotter",
    label: "Blotter",
    description: "Complaints already categorized as blotter cases.",
  },
  {
    key: "for mediation",
    label: "For Mediation",
    description: "Complaints routed for mediation.",
  },
  {
    key: "community concern",
    label: "Community Concern",
    description: "Complaints categorized as community concerns.",
  },
];

const STATUS_CONFIGS = {
  "for review": { label: "For Review", color: "#f59e0b" },
  pending: { label: "Pending", color: "#f97316" },
  recorded: { label: "Recorded", color: "#0ea5e9" },
  rejected: { label: "Rejected", color: "#ef4444" },
  resolved: { label: "Resolved", color: "#10b981" },
};

const STATUS_FILTER_OPTIONS = [
  "All Status",
  "For Review",
  "Pending",
  "Recorded",
  "Rejected",
  "Resolved",
];

const normalizeKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");

const titleCase = (value) =>
  String(value || "")
    .trim()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());

const formatDate = (value, includeTime = false) => {
  if (includeTime) {
    return formatPhilippineDateTime(value, "N/A");
  }

  return formatPhilippineDateOnly(value, "N/A");
};

const getStatusConfig = (status) => {
  const key = normalizeKey(status);
  return (
    STATUS_CONFIGS[key] || {
      label: titleCase(status || "For Review"),
      color: "#6b7280",
    }
  );
};

const getSectionKey = (category) => normalizeKey(category) || "uncategorized";

const getSectionLabel = (sectionKey) =>
  SECTION_CONFIGS.find((section) => section.key === sectionKey)?.label ||
  titleCase(sectionKey);

const MEDIATION_ACTIONS = [
  { value: "scheduled", label: "Schedule" },
  { value: "unresolved", label: "Unresolved" },
  { value: "rejected", label: "Reject" },
  { value: "resolved", label: "Resolve" },
  { value: "rescheduled", label: "Reschedule" },
];

const formatDateTimeLocalValue = (value) => {
  return toPhilippineDateTimeLocalValue(value);
};

const formatMediationDateTime = (value) => {
  return formatPhilippineShortDateTime(value, "—");
};

const formatMediationRange = (sessionStart, sessionEnd) => {
  if (!sessionStart || !sessionEnd) return "—";
  return `${formatMediationDateTime(sessionStart)} to ${formatMediationDateTime(sessionEnd)}`;
};

const isMediationTimeOverlap = (startA, endA, startB, endB) => {
  const rangeStartA = new Date(startA);
  const rangeEndA = new Date(endA);
  const rangeStartB = new Date(startB);
  const rangeEndB = new Date(endB);

  return (
    !Number.isNaN(rangeStartA.getTime()) &&
    !Number.isNaN(rangeEndA.getTime()) &&
    !Number.isNaN(rangeStartB.getTime()) &&
    !Number.isNaN(rangeEndB.getTime()) &&
    rangeStartA < rangeEndB &&
    rangeEndA > rangeStartB
  );
};

const ComplaintDetailModal = ({
  complaint,
  isOpen,
  onClose,
  onSetCategory,
  isUpdatingCategory,
  onStartMediation,
}) => {
  if (!isOpen || !complaint) return null;

  const isUncategorized = complaint.sectionKey === "uncategorized";
  const statusConfig = getStatusConfig(complaint.status);

  return createPortal(
    <>
      <div className="complaint-detail-overlay" onClick={onClose} />
      <div
        className="complaint-detail-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="complaint-detail-header">
          <div className="complaint-detail-header-content">
            <span
              className="complaint-status-badge"
              style={{ backgroundColor: statusConfig.color }}
            >
              {statusConfig.label}
            </span>
            <span className="complaint-section-pill">
              {getSectionLabel(complaint.sectionKey)}
            </span>
          </div>
          <button className="complaint-detail-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="complaint-detail-body">
          <div className="complaint-detail-title-wrap">
            <h2 className="complaint-detail-title">
              {complaint.complaintType}
            </h2>
            <p className="complaint-detail-subtitle">
              Submitted on {complaint.submittedAt}
            </p>
          </div>

          <div className="complaint-detail-grid">
            <div className="complaint-detail-card">
              <label>Creation Date</label>
              <div>
                <CalendarDays size={16} />
                <span>{complaint.submittedAt}</span>
              </div>
            </div>

            <div className="complaint-detail-card">
              <label>Incident Date</label>
              <div>
                <CalendarDays size={16} />
                <span>{complaint.incidentDate}</span>
              </div>
            </div>

            <div className="complaint-detail-card">
              <label>Incident Location</label>
              <div>
                <MapPin size={16} />
                <span>{complaint.incidentLocation}</span>
              </div>
            </div>

            <div className="complaint-detail-card">
              <label>Complainant</label>
              <div>
                <Users size={16} />
                <span>{complaint.complainant}</span>
              </div>
            </div>

            <div className="complaint-detail-card">
              <label>Complaint Type</label>
              <div>
                <FileText size={16} />
                <span>{complaint.complaintType}</span>
              </div>
            </div>

            <div className="complaint-detail-card">
              <label>Respondent(s)</label>
              <div>
                <Users size={16} />
                <span>{complaint.respondentDisplay}</span>
              </div>
            </div>

            <div className="complaint-detail-card">
              <label>Category</label>
              <div>
                <Tag size={16} />
                <span>{getSectionLabel(complaint.sectionKey)}</span>
              </div>
            </div>

            <div className="complaint-detail-card">
              <label>Status</label>
              <div>
                <Tag size={16} />
                <span>{statusConfig.label}</span>
              </div>
            </div>
          </div>

          <div className="complaint-description-section">
            <label>Description</label>
            <p>{complaint.description}</p>
          </div>

          {complaint.remarks ? (
            <div className="complaint-description-section complaint-notes-section">
              <label>Remarks</label>
              <p>{complaint.remarks}</p>
            </div>
          ) : null}
        </div>

        <div className="complaint-detail-footer">
          <button className="complaint-detail-secondary" onClick={onClose}>
            Close
          </button>
          {isUncategorized ? (
            <>
              <button
                className="complaint-detail-action"
                onClick={() => onSetCategory("blotter")}
                disabled={isUpdatingCategory}
              >
                Set as Blotter
              </button>
              <button
                className="complaint-detail-action"
                onClick={() => onSetCategory("for mediation")}
                disabled={isUpdatingCategory}
              >
                Set as For Mediation
              </button>
              <button
                className="complaint-detail-action"
                onClick={() => onSetCategory("community concern")}
                disabled={isUpdatingCategory}
              >
                Set as Community Concern
              </button>
            </>
          ) : complaint.sectionKey === "for mediation" &&
            complaint.mediation_accepted ? (
            <button
              className="complaint-detail-action complaint-detail-action-mediation"
              onClick={onStartMediation}
            >
              Mediations
            </button>
          ) : null}
        </div>
      </div>
    </>,
    document.body,
  );
};

const MediationSessionModal = ({
  complaint,
  isOpen,
  onClose,
  history,
  activeSessions,
  action,
  onActionChange,
  sessionStart,
  onSessionStartChange,
  sessionEnd,
  onSessionEndChange,
  onSubmit,
  saving,
  error,
  success,
}) => {
  if (!isOpen || !complaint) return null;

  // Extract date portion from datetime-local strings (YYYY-MM-DD)
  const getDatePart = (dateTimeLocal) => {
    if (!dateTimeLocal) return "";
    return dateTimeLocal.split("T")[0];
  };

  // Extract time portion from datetime-local strings (HH:mm)
  const getTimePart = (dateTimeLocal) => {
    if (!dateTimeLocal) return "";
    return dateTimeLocal.split("T")[1] || "";
  };

  // Auto-update end date when start date changes
  const handleStartChange = (newStart) => {
    onSessionStartChange(newStart);

    // If end is empty or on a different day, set it to same day, 1 hour later
    if (newStart) {
      const startDate = getDatePart(newStart);
      const endDate = getDatePart(sessionEnd);

      if (!sessionEnd || startDate !== endDate) {
        const startTime = getTimePart(newStart);
        if (startTime) {
          const [hours, minutes] = startTime.split(":");
          const startHour = parseInt(hours, 10);
          const endHour = Math.min(startHour + 1, 23); // Avoid hour 24
          const endTime = `${endHour.toString().padStart(2, "0")}:${minutes}`;
          onSessionEndChange(`${startDate}T${endTime}`);
        }
      }
    }
  };

  // Constrain end date to same day as start and time must be after start time
  const handleEndChange = (newEnd) => {
    const startDate = getDatePart(sessionStart);
    const endDate = getDatePart(newEnd);
    const startTime = getTimePart(sessionStart);
    const endTime = getTimePart(newEnd);

    // If user tries to select a different date, force it back to start date
    if (newEnd && startDate && endDate !== startDate) {
      onSessionEndChange(`${startDate}T${endTime}`);
      return;
    }

    // Check if end time is earlier than start time (same day)
    if (
      newEnd &&
      startDate &&
      endDate === startDate &&
      startTime &&
      endTime &&
      endTime < startTime
    ) {
      // Force end time to be at least the start time
      onSessionEndChange(`${startDate}T${startTime}`);
      return;
    }

    onSessionEndChange(newEnd);
  };

  // Calculate max time for end input (end of start date)
  const startDate = getDatePart(sessionStart);
  const maxEndDateTime = startDate ? `${startDate}T23:59` : "";

  const latestSession = history[history.length - 1] || null;
  const latestStatus = normalizeKey(latestSession?.status);
  const complaintStatus = normalizeKey(complaint?.status);
  const complaintClosed =
    complaintStatus === "resolved" || complaintStatus === "rejected";
  const mediationClosed =
    latestStatus === "resolved" || latestStatus === "rejected";
  const canCreateScheduled = !latestSession || latestStatus === "unresolved";
  const canUpdateScheduled = ["scheduled", "rescheduled"].includes(
    latestStatus,
  );
  const canFinalize = ["scheduled", "rescheduled"].includes(latestStatus);
  const canReschedule =
    latestStatus === "scheduled" || latestStatus === "rescheduled";
  const actionConfig =
    MEDIATION_ACTIONS.find((item) => item.value === action) ||
    MEDIATION_ACTIONS[0];
  const actionEnabledMap = {
    scheduled: !mediationClosed && canCreateScheduled,
    unresolved: !mediationClosed && canUpdateScheduled,
    rejected: !mediationClosed && canFinalize,
    resolved: !mediationClosed && canFinalize,
    rescheduled: canReschedule && Boolean(latestSession),
  };
  const actionEnabled = Boolean(actionEnabledMap[action]);
  const actionNeedsSchedule = ["scheduled", "rescheduled"].includes(action);
  const effectiveStart = actionNeedsSchedule
    ? sessionStart
    : latestSession?.session_start || "";
  const effectiveEnd = actionNeedsSchedule
    ? sessionEnd
    : latestSession?.session_end || "";
  const conflictSessions = !actionNeedsSchedule
    ? []
    : activeSessions.filter((session) =>
        isMediationTimeOverlap(
          effectiveStart,
          effectiveEnd,
          session.session_start,
          session.session_end,
        ),
      );
  const isTimedAction = actionNeedsSchedule;
  const isScheduleAction = action === "scheduled";
  const isRejectedAction = action === "rejected";
  const isResolvedAction = action === "resolved";
  const isUnresolvedAction = action === "unresolved";
  const lockDateInputs =
    isRejectedAction || isResolvedAction || isUnresolvedAction;
  const requiresLatestSession = action !== "scheduled";
  const canSubmit =
    !saving &&
    actionEnabled &&
    (!requiresLatestSession || Boolean(latestSession)) &&
    (!isTimedAction ||
      (effectiveStart && effectiveEnd && conflictSessions.length === 0));

  return createPortal(
    <>
      <div className="complaint-detail-overlay" onClick={onClose} />
      <div
        className="complaint-detail-dialog mediation-session-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="complaint-detail-header">
          <div className="complaint-detail-header-content">
            <span className="complaint-status-badge mediation-status-badge">
              Mediation
            </span>
            <span className="complaint-section-pill">
              {complaint.complaintType}
            </span>
          </div>
          <button className="complaint-detail-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="complaint-detail-body mediation-session-body">
          <div className="complaint-detail-title-wrap">
            <h2 className="complaint-detail-title">Mediation session</h2>
            <p className="complaint-detail-subtitle">
              Manage mediation schedules and status updates for this complaint.
            </p>
          </div>

          {success ? (
            <div className="mediation-session-success">{success}</div>
          ) : null}
          {error ? (
            <div className="mediation-session-error">{error}</div>
          ) : null}
          {mediationClosed ? (
            <div className="mediation-session-note">
              This mediation is already closed. You can view history, but you
              can no longer modify this mediation or its complaint.
            </div>
          ) : null}
          {complaintClosed ? (
            <div className="mediation-session-note">
              This complaint is already {complaintStatus}. Mediation actions are
              hidden.
            </div>
          ) : null}

          <div className="complaint-detail-grid mediation-summary-grid">
            <div className="complaint-detail-card">
              <label>Current status</label>
              <div>
                <Tag size={16} />
                <span>
                  {latestSession?.status_label || "Awaiting schedule"}
                </span>
              </div>
            </div>
            <div className="complaint-detail-card">
              <label>Latest schedule</label>
              <div>
                <CalendarDays size={16} />
                <span>
                  {latestSession
                    ? formatMediationRange(
                        latestSession.session_start,
                        latestSession.session_end,
                      )
                    : "No session yet"}
                </span>
              </div>
            </div>
          </div>

          {!complaintClosed ? (
            <>
              <div className="mediation-session-actions">
                {MEDIATION_ACTIONS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`mediation-action-chip${action === item.value ? " active" : ""}`}
                    onClick={() => onActionChange(item.value)}
                    disabled={!actionEnabledMap[item.value]}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="mediation-session-form">
                <div className="mediation-session-form-row">
                  <label>
                    Start date and time
                    <input
                      type="datetime-local"
                      value={sessionStart}
                      onChange={(event) =>
                        handleStartChange(event.target.value)
                      }
                      disabled={lockDateInputs || !actionNeedsSchedule}
                      min={formatDateTimeLocalValue(new Date().toISOString())}
                    />
                  </label>
                  <label>
                    End date and time
                    <input
                      type="datetime-local"
                      value={sessionEnd}
                      onChange={(event) => handleEndChange(event.target.value)}
                      disabled={
                        lockDateInputs || !actionNeedsSchedule || !sessionStart
                      }
                      min={sessionStart}
                      max={maxEndDateTime}
                    />
                  </label>
                </div>

                {isRejectedAction ? (
                  <div className="mediation-session-note">
                    Rejected uses the latest scheduled session and does not
                    require a new schedule.
                  </div>
                ) : null}

                {isTimedAction && conflictSessions.length > 0 ? (
                  <div className="mediation-session-conflicts">
                    <strong>Conflicts detected</strong>
                    <p>
                      The selected schedule overlaps with an existing mediation
                      session.
                    </p>
                    <ul>
                      {conflictSessions.map((session) => (
                        <li key={session.id}>
                          {formatMediationRange(
                            session.session_start,
                            session.session_end,
                          )}
                          {session.status_label
                            ? ` · ${session.status_label}`
                            : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {!actionEnabled ? (
                  <div className="mediation-session-note">
                    This action is not available in the current mediation state.
                  </div>
                ) : null}
              </div>
            </>
          ) : null}

          <div className="mediation-history-section">
            <div className="mediation-history-header">
              <h3>Mediation history</h3>
              <span>Records are ordered by created_at and id.</span>
            </div>

            {history.length === 0 ? (
              <p className="mediation-history-empty">
                No mediation history yet.
              </p>
            ) : (
              <div className="mediation-history-list">
                {history.map((item) => (
                  <div className="mediation-history-item" key={item.id}>
                    <span
                      className="mediation-history-status"
                      style={{ backgroundColor: item.status_color }}
                    >
                      {item.status_label}
                    </span>
                    <div className="mediation-history-range">
                      {formatMediationRange(
                        item.session_start,
                        item.session_end,
                      )}
                    </div>
                    <div className="mediation-history-date">
                      {formatMediationDateTime(item.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="complaint-detail-footer">
          <button className="complaint-detail-secondary" onClick={onClose}>
            Close
          </button>
          {!complaintClosed ? (
            <button
              className="complaint-detail-action"
              onClick={onSubmit}
              disabled={!canSubmit}
            >
              {saving
                ? "Saving..."
                : isScheduleAction
                  ? "Start mediation session"
                  : actionConfig.label}
            </button>
          ) : null}
        </div>
      </div>
    </>,
    document.body,
  );
};

export default function OfficialComplaintsView() {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState("uncategorized");
  const [complaints, setComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(true);
  const [errorComplaints, setErrorComplaints] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [activeStatusFilter, setActiveStatusFilter] = useState("All Status");
  const [showMediationModal, setShowMediationModal] = useState(false);
  const [mediationHistory, setMediationHistory] = useState([]);
  const [mediationActiveSessions, setMediationActiveSessions] = useState([]);
  const [mediationAction, setMediationAction] = useState("scheduled");
  const [mediationSessionStart, setMediationSessionStart] = useState("");
  const [mediationSessionEnd, setMediationSessionEnd] = useState("");
  const [mediationLoading, setMediationLoading] = useState(false);
  const [mediationSaving, setMediationSaving] = useState(false);
  const [mediationError, setMediationError] = useState("");
  const [mediationSuccess, setMediationSuccess] = useState("");

  const fetchComplaints = async () => {
    try {
      setLoadingComplaints(true);
      setErrorComplaints(null);

      const result = await getAssignedComplaints();

      if (!result.success || !Array.isArray(result.data)) {
        setComplaints([]);
        setErrorComplaints(result.message || "Failed to fetch complaints");
        return;
      }

      const transformed = result.data.map((row) => {
        const status = row.status || "for review";
        const sectionKey = getSectionKey(row.category);
        const respondentDisplay =
          row.respondent_names ||
          (Array.isArray(row.respondent_id)
            ? row.respondent_id.join(", ")
            : "") ||
          "—";

        return {
          ...row,
          complaintType: row.complaint_type || "Untitled Complaint",
          incidentLocation: row.incident_location || "Unknown Location",
          incidentDate: formatDate(row.incident_date),
          submittedAt: formatDate(row.created_at, true),
          complainant: row.complainant_name || "Unknown",
          respondentDisplay,
          status,
          statusDisplay: getStatusConfig(status).label,
          statusColor: getStatusConfig(status).color,
          sectionKey,
          sectionLabel: getSectionLabel(sectionKey),
          description: row.description || "No description provided",
          remarks: row.remarks || "",
        };
      });

      setComplaints(transformed);
    } catch (error) {
      setComplaints([]);
      setErrorComplaints("Error fetching complaints: " + error.message);
    } finally {
      setLoadingComplaints(false);
    }
  };

  const loadMediationDialogData = async (complaintId) => {
    setMediationLoading(true);
    setMediationError("");
    setMediationSuccess("");

    const [historyResult, activeSessionsResult] = await Promise.all([
      getComplaintMediationHistory(complaintId),
      getActiveMediationSessions(complaintId),
    ]);

    if (!historyResult.success) {
      setMediationHistory([]);
      setMediationActiveSessions([]);
      setMediationError(
        historyResult.message || "Failed to load mediation history",
      );
      setMediationLoading(false);
      return;
    }

    setMediationHistory(historyResult.data || []);
    setMediationActiveSessions(
      activeSessionsResult.success ? activeSessionsResult.data || [] : [],
    );

    const latestSession = (historyResult.data || []).slice(-1)[0] || null;
    const latestStatus = normalizeKey(latestSession?.status);
    const mediationClosed =
      latestStatus === "resolved" || latestStatus === "rejected";
    const defaultAction = mediationClosed
      ? "scheduled"
      : latestStatus === "rescheduled"
        ? "rescheduled"
        : !latestSession || ["unresolved"].includes(latestStatus)
          ? "scheduled"
          : "unresolved";

    setMediationAction(defaultAction);
    setMediationSessionStart(
      formatDateTimeLocalValue(latestSession?.session_start || ""),
    );
    setMediationSessionEnd(
      formatDateTimeLocalValue(latestSession?.session_end || ""),
    );
    setMediationLoading(false);
  };

  const openMediationDialog = async () => {
    if (!selectedComplaint) return;

    setShowMediationModal(true);
    await loadMediationDialogData(selectedComplaint.id);
  };

  const closeMediationDialog = () => {
    setShowMediationModal(false);
    setMediationLoading(false);
    setMediationSaving(false);
    setMediationError("");
    setMediationSuccess("");
    setMediationHistory([]);
    setMediationActiveSessions([]);
    setMediationAction("scheduled");
    setMediationSessionStart("");
    setMediationSessionEnd("");
  };

  const handleSubmitMediationSession = async () => {
    if (!selectedComplaint) return;

    setMediationSaving(true);
    setMediationError("");
    setMediationSuccess("");

    const actionNeedsSchedule = ["scheduled", "rescheduled"].includes(
      mediationAction,
    );
    const startValue = actionNeedsSchedule ? mediationSessionStart : null;
    const endValue = actionNeedsSchedule ? mediationSessionEnd : null;

    const actionResult =
      mediationAction === "scheduled"
        ? await createComplaintMediationSession({
            complaintId: selectedComplaint.id,
            sessionStart: startValue,
            sessionEnd: endValue,
          })
        : await updateComplaintMediationStatus({
            complaintId: selectedComplaint.id,
            status: mediationAction,
            sessionStart: startValue,
            sessionEnd: endValue,
          });

    if (!actionResult.success) {
      setMediationError(
        actionResult.message || "Failed to update mediation session",
      );
      setMediationSaving(false);
      return;
    }

    await loadMediationDialogData(selectedComplaint.id);
    setMediationSuccess(
      actionResult.message || "Mediation session updated successfully",
    );
    setMediationSaving(false);
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
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

  useEffect(() => {
    if (
      location.state?.selectedComplaintId &&
      location.state?.openModal &&
      complaints.length > 0
    ) {
      const complaint = complaints.find(
        (row) => String(row.id) === String(location.state.selectedComplaintId),
      );

      if (complaint) {
        setSelectedComplaint(complaint);
        setIsModalOpen(true);
        window.history.replaceState({}, document.title);
      }
    }
  }, [complaints, location.state]);

  const sectionCounts = useMemo(() => {
    return SECTION_CONFIGS.reduce((accumulator, section) => {
      accumulator[section.key] = complaints.filter(
        (complaint) => complaint.sectionKey === section.key,
      ).length;
      return accumulator;
    }, {});
  }, [complaints]);

  const filteredComplaints = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59`) : null;

    return complaints.filter((complaint) => {
      const sectionMatch = complaint.sectionKey === activeSection;
      const searchMatch =
        !normalizedSearch ||
        complaint.complaintType.toLowerCase().includes(normalizedSearch) ||
        complaint.incidentLocation.toLowerCase().includes(normalizedSearch) ||
        complaint.complainant.toLowerCase().includes(normalizedSearch) ||
        complaint.respondentDisplay.toLowerCase().includes(normalizedSearch) ||
        complaint.description.toLowerCase().includes(normalizedSearch) ||
        complaint.statusDisplay.toLowerCase().includes(normalizedSearch) ||
        complaint.sectionLabel.toLowerCase().includes(normalizedSearch);

      const complaintDate = complaint.created_at
        ? new Date(complaint.created_at)
        : null;
      const statusMatch =
        activeStatusFilter === "All Status" ||
        normalizeKey(complaint.statusDisplay) ===
          normalizeKey(activeStatusFilter);
      const dateMatch =
        (!start || !complaintDate || complaintDate >= start) &&
        (!end || !complaintDate || complaintDate <= end);

      return sectionMatch && searchMatch && statusMatch && dateMatch;
    });
  }, [
    activeSection,
    activeStatusFilter,
    complaints,
    endDate,
    searchQuery,
    startDate,
  ]);

  const openModal = (complaint) => {
    setSelectedComplaint(complaint);
    setShowMediationModal(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setShowMediationModal(false);
    setMediationError("");
    setMediationSuccess("");
    setTimeout(() => setSelectedComplaint(null), 250);
  };

  const handleSetCategory = async (category) => {
    if (!selectedComplaint || isUpdatingCategory) return;

    try {
      setIsUpdatingCategory(true);
      const result = await updateComplaintCategory(
        selectedComplaint.id,
        category,
      );

      if (!result.success) {
        setErrorComplaints(
          result.message || "Failed to update complaint category",
        );
        return;
      }

      await fetchComplaints();
      closeModal();
    } catch (error) {
      setErrorComplaints("Error updating complaint category: " + error.message);
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  const activeSectionConfig =
    SECTION_CONFIGS.find((section) => section.key === activeSection) ||
    SECTION_CONFIGS[0];

  return (
    <div className={`admin-page${isModalOpen ? " modal-open-blur" : ""}`}>
      <div className="ar-page-content official-complaints-page">
        <div className="page-actions official-complaints-header">
          <div>
            <h3>Official Complaints</h3>
            <p className="muted">
              Review assigned complaints by category and classify uncategorized
              cases.
            </p>
          </div>
          <div className="complaints-header-note">
            Only uncategorized complaints can be moved to blotter, mediation, or
            community concern.
          </div>
        </div>

        <div className="table-filters official-complaints-filters">
          <div className="filter-search">
            <label className="filter-label">Search</label>
            <input
              type="text"
              placeholder="Search by type, location, complainant, respondent, or description..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="filter-input"
            />
          </div>
          <div className="filter-dates">
            <div>
              <label className="filter-label">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
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
                onChange={(event) => setEndDate(event.target.value)}
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
            {(startDate ||
              endDate ||
              searchQuery ||
              activeStatusFilter !== "All Status") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStartDate("");
                  setEndDate("");
                  setActiveStatusFilter("All Status");
                }}
                className="filter-clear-btn"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        <div className="complaint-section-tabs">
          {SECTION_CONFIGS.map((section) => (
            <button
              key={section.key}
              type="button"
              className={`complaint-section-tab${activeSection === section.key ? " active" : ""}`}
              onClick={() => setActiveSection(section.key)}
            >
              <span>{section.label}</span>
              <span className="complaint-section-count">
                {sectionCounts[section.key] || 0}
              </span>
            </button>
          ))}
        </div>

        <div className="complaint-section-summary">
          <div>
            <strong>{activeSectionConfig.label}</strong>
            <span>{activeSectionConfig.description}</span>
          </div>
          <div className="official-section-summary-right">
            <select
              className="filter-date-input official-status-filter-select"
              value={activeStatusFilter}
              onChange={(event) => setActiveStatusFilter(event.target.value)}
            >
              {STATUS_FILTER_OPTIONS.map((statusOption) => (
                <option key={statusOption} value={statusOption}>
                  {statusOption}
                </option>
              ))}
            </select>
            <div className="table-count-label">
              Showing {filteredComplaints.length} of{" "}
              {sectionCounts[activeSection] || 0} complaints
            </div>
          </div>
        </div>

        <div className="requests-table-card">
          <table className="requests-table balanced-table complaint-table">
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
                  <td
                    colSpan="6"
                    style={{ color: "#ef4444", textAlign: "center" }}
                  >
                    {errorComplaints}
                  </td>
                </tr>
              ) : filteredComplaints.length > 0 ? (
                filteredComplaints.map((complaint) => (
                  <tr key={complaint.id}>
                    <td>
                      <div className="complaint-table-main">
                        <span className="req-title">
                          {complaint.complaintType}
                        </span>
                        <span className="complaint-table-subtitle">
                          {complaint.incidentLocation}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="req-submitted complaint-table-respondents">
                        {complaint.respondentDisplay}
                      </span>
                    </td>
                    <td>
                      <span className="req-submitted">
                        {complaint.incidentDate}
                      </span>
                    </td>
                    <td>
                      <span className="req-submitted">
                        {complaint.submittedAt}
                      </span>
                    </td>
                    <td>
                      <span
                        className="req-status-badge"
                        style={{ backgroundColor: complaint.statusColor }}
                      >
                        {complaint.statusDisplay}
                      </span>
                    </td>
                    <td>
                      <button
                        className="view-details-btn"
                        onClick={() => openModal(complaint)}
                      >
                        {complaint.sectionKey === "uncategorized"
                          ? "View & Classify"
                          : "View Details"}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="table-empty-cell">
                    No complaints found in this section
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ComplaintDetailModal
        complaint={selectedComplaint}
        isOpen={isModalOpen}
        onClose={closeModal}
        onSetCategory={handleSetCategory}
        isUpdatingCategory={isUpdatingCategory}
        onStartMediation={openMediationDialog}
      />

      <MediationSessionModal
        complaint={selectedComplaint}
        isOpen={showMediationModal}
        onClose={closeMediationDialog}
        history={mediationHistory}
        activeSessions={mediationActiveSessions}
        action={mediationAction}
        onActionChange={setMediationAction}
        sessionStart={mediationSessionStart}
        onSessionStartChange={setMediationSessionStart}
        sessionEnd={mediationSessionEnd}
        onSessionEndChange={setMediationSessionEnd}
        onSubmit={handleSubmitMediationSession}
        saving={mediationSaving}
        error={mediationLoading ? "Loading mediation data..." : mediationError}
        success={mediationSuccess}
      />
    </div>
  );
}
