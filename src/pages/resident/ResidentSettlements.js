import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../../supabse_db/auth/auth";
import { useAuth } from "../../context/AuthContext";
import { getResidentSettlements } from "../../supabse_db/settlement/settlement";
import { formatPhilippineDateTime } from "../../utils/philippineTime";
import ResidentSidebar from "../../components/ResidentSidebar";
import ResidentSettings from "../../components/ResidentSettings";
import ResidentProfile from "../../components/ResidentProfile";
import "../../styles/UserPages.css";

const normalizeValue = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");

const SETTLEMENT_STATUS_PRIORITY = {
  scheduled: 0,
  rescheduled: 1,
  unresolved: 2,
  resolved: 3,
  rejected: 4,
  extended: 5,
};

const getSettlementTypeLabel = (value) => {
  const normalized = normalizeValue(value);
  if (normalized === "mediation") return "Mediation";
  if (normalized === "conciliation" || normalized === "concilation") {
    return "Conciliation";
  }

  return normalized
    ? normalized.replace(/\b\w/g, (char) => char.toUpperCase())
    : "Settlement";
};

const getSettlementStatusLabel = (value) => {
  const normalized = normalizeValue(value);
  if (normalized === "scheduled") return "Scheduled";
  if (normalized === "rescheduled") return "Rescheduled";
  if (normalized === "resolved") return "Resolved";
  if (normalized === "unresolved") return "Unresolved";
  if (normalized === "rejected") return "Rejected";
  if (normalized === "extended") return "Extended";

  return normalized
    ? normalized.replace(/\b\w/g, (char) => char.toUpperCase())
    : "Scheduled";
};

const getSettlementStatusClass = (value) => {
  const normalized = normalizeValue(value);
  if (normalized === "scheduled") return "scheduled";
  if (normalized === "rescheduled") return "rescheduled";
  if (normalized === "resolved") return "resolved";
  if (normalized === "unresolved") return "unresolved";
  if (normalized === "rejected") return "rejected";
  if (normalized === "extended") return "extended";
  return "unknown";
};

const getSettlementStatusPriority = (value) => {
  const normalized = normalizeValue(value);
  if (
    Object.prototype.hasOwnProperty.call(SETTLEMENT_STATUS_PRIORITY, normalized)
  ) {
    return SETTLEMENT_STATUS_PRIORITY[normalized];
  }

  return Number.MAX_SAFE_INTEGER;
};

const formatScheduleDateTime = (value) =>
  formatPhilippineDateTime(value, "Not available");

const toMillis = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.NaN;
  return date.getTime();
};

const isSettlementOverdue = (sessionEnd) => {
  if (!sessionEnd) return false;
  const endTime = toMillis(sessionEnd);
  if (Number.isNaN(endTime)) return false;
  return endTime < Date.now();
};

const toPartyNames = (parties = []) => {
  if (!Array.isArray(parties) || parties.length === 0)
    return "No parties found.";
  return parties
    .map((party) => party?.fullName || party?.uid || "Unknown")
    .join(", ");
};

const formatShortDateTime = (value) => formatScheduleDateTime(value);

const ResidentSettlements = () => {
  const navigate = useNavigate();
  const { authUser, userLoading, userName } = useAuth();

  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState(null);

  useEffect(() => {
    if (userLoading || !authUser) return;

    const fetchSettlements = async () => {
      setLoading(true);
      setLoadError("");

      const result = await getResidentSettlements({ userId: authUser.id });

      if (!result.success) {
        setSettlements([]);
        setLoadError(result.message || "Failed to load settlements.");
        setLoading(false);
        return;
      }

      setSettlements(Array.isArray(result.data) ? result.data : []);
      setLoading(false);
    };

    fetchSettlements();
  }, [authUser, userLoading]);

  const handleLogoutConfirm = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const closeSidebar = () => setSidebarOpen(false);

  const statusOptions = useMemo(() => {
    const uniqueStatuses = [
      ...new Set(
        settlements
          .map((entry) => normalizeValue(entry.status))
          .filter(Boolean),
      ),
    ];

    const sortedStatuses = uniqueStatuses.sort((left, right) => {
      const leftPriority = getSettlementStatusPriority(left);
      const rightPriority = getSettlementStatusPriority(right);

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return getSettlementStatusLabel(left).localeCompare(
        getSettlementStatusLabel(right),
      );
    });

    return ["all", ...sortedStatuses];
  }, [settlements]);

  const filteredSettlements = useMemo(() => {
    return settlements.filter((entry) => {
      const normalizedType = normalizeValue(entry.type);
      const normalizedStatus = normalizeValue(entry.status);

      const matchesType =
        typeFilter === "all" || normalizedType === normalizeValue(typeFilter);
      const matchesStatus =
        statusFilter === "all" ||
        normalizedStatus === normalizeValue(statusFilter);

      return matchesType && matchesStatus;
    });
  }, [settlements, typeFilter, statusFilter]);

  const orderedSettlements = useMemo(() => {
    const nowMs = Date.now();

    return [...filteredSettlements].sort((left, right) => {
      const leftStatusPriority = getSettlementStatusPriority(left.status);
      const rightStatusPriority = getSettlementStatusPriority(right.status);

      if (leftStatusPriority !== rightStatusPriority) {
        return leftStatusPriority - rightStatusPriority;
      }

      const leftMs = toMillis(left.session_start);
      const rightMs = toMillis(right.session_start);

      if (Number.isNaN(leftMs) && Number.isNaN(rightMs)) return 0;
      if (Number.isNaN(leftMs)) return 1;
      if (Number.isNaN(rightMs)) return -1;

      const leftUpcoming = leftMs > nowMs;
      const rightUpcoming = rightMs > nowMs;

      if (leftUpcoming !== rightUpcoming) {
        return leftUpcoming ? -1 : 1;
      }

      if (leftUpcoming && rightUpcoming) {
        return leftMs - rightMs;
      }

      return rightMs - leftMs;
    });
  }, [filteredSettlements]);

  const openDetails = (settlement) => {
    setSelectedSettlement(settlement);
    setShowDetailsModal(true);
  };

  const closeDetails = () => {
    setShowDetailsModal(false);
    setSelectedSettlement(null);
  };

  return (
    <div className="user-landing-page">
      <div className="layout">
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

        {showDetailsModal && selectedSettlement && (
          <div className="logout-modal-overlay" onClick={closeDetails}>
            <div
              className="details-modal resident-settlement-details-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="history-modal-header">
                <div>
                  <h3 className="history-modal-title">Settlement Details</h3>
                  <p className="history-modal-sub">
                    {selectedSettlement.complaint?.complaint_type ||
                      "Complaint"}
                  </p>
                </div>
                <button className="history-modal-close" onClick={closeDetails}>
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
                    <span className="details-label">Type</span>
                    <span className="details-value">
                      {getSettlementTypeLabel(selectedSettlement.type)}
                    </span>
                  </div>
                  <div className="details-row">
                    <span className="details-label">Status</span>
                    <div className="resident-settlement-status-wrap">
                      {isSettlementOverdue(selectedSettlement.session_end) &&
                        (normalizeValue(selectedSettlement.status) ===
                          "scheduled" ||
                          normalizeValue(selectedSettlement.status) ===
                            "rescheduled") && (
                          <span className="badge resident-settlement-status-badge overdue">
                            Overdue
                          </span>
                        )}
                      <span
                        className={`badge resident-settlement-status-badge ${getSettlementStatusClass(selectedSettlement.status)}`}
                      >
                        {getSettlementStatusLabel(selectedSettlement.status)}
                      </span>
                    </div>
                  </div>
                  <div className="details-row">
                    <span className="details-label">Complaint ID</span>
                    <span className="details-value">
                      #{selectedSettlement.complaint_id}
                    </span>
                  </div>
                  <div className="details-full resident-settlement-detail-section">
                    <span className="details-label">Complaint Details</span>
                    <div className="resident-settlement-detail-list">
                      <div className="resident-settlement-detail-item">
                        <span>Complaint Type</span>
                        <strong>
                          {selectedSettlement.complaint?.complaint_type ||
                            "Complaint"}
                        </strong>
                      </div>
                      <div className="resident-settlement-detail-item">
                        <span>Complaint Status</span>
                        <strong>
                          {selectedSettlement.complaint?.status || "Unknown"}
                        </strong>
                      </div>
                      <div className="resident-settlement-detail-item">
                        <span>Incident Date</span>
                        <strong>
                          {formatShortDateTime(
                            selectedSettlement.complaint?.incident_date,
                          )}
                        </strong>
                      </div>
                      <div className="resident-settlement-detail-item resident-settlement-detail-item-full">
                        <span>Description</span>
                        <strong>
                          {selectedSettlement.complaint?.description ||
                            "No description provided."}
                        </strong>
                      </div>
                      <div className="resident-settlement-detail-item">
                        <span>Complaint Location</span>
                        <strong>
                          {selectedSettlement.complaint?.incident_location ||
                            "Not specified"}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="details-full resident-settlement-detail-section">
                    <span className="details-label">Settlement Details</span>
                    <div className="resident-settlement-detail-list">
                      <div className="resident-settlement-detail-item">
                        <span>Settlement Type</span>
                        <strong>
                          {getSettlementTypeLabel(selectedSettlement.type)}
                        </strong>
                      </div>
                      <div className="resident-settlement-detail-item">
                        <span>Settlement Status</span>
                        <strong>
                          {getSettlementStatusLabel(selectedSettlement.status)}
                        </strong>
                      </div>
                      <div className="resident-settlement-detail-item">
                        <span>Created At</span>
                        <strong>
                          {formatShortDateTime(selectedSettlement.created_at)}
                        </strong>
                      </div>
                      <div className="resident-settlement-detail-item resident-settlement-detail-item-full">
                        <span>Schedule</span>
                        <div className="resident-settlement-schedule">
                          <div className="resident-settlement-time-chip start">
                            <span>Start</span>
                            <strong>
                              {formatScheduleDateTime(
                                selectedSettlement.session_start,
                              )}
                            </strong>
                          </div>
                          <div className="resident-settlement-time-chip end">
                            <span>End</span>
                            <strong>
                              {formatScheduleDateTime(
                                selectedSettlement.session_end,
                              )}
                            </strong>
                          </div>
                        </div>
                      </div>
                      <div className="resident-settlement-detail-item resident-settlement-detail-item-full">
                        <span>Parties</span>
                        <strong>
                          {toPartyNames(selectedSettlement.partyNames)}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <ResidentSidebar
          isOpen={sidebarOpen}
          onClose={closeSidebar}
          activePage="settlements"
        />

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

            <h3>My Settlements</h3>

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

          <div className="mr-content">
            <h1 className="mr-page-title">My Settlements</h1>
            <p className="mr-page-sub">
              Review mediation and conciliation sessions where you are listed as
              a party.
            </p>

            <div className="mr-filter-bar resident-settlement-filter-bar">
              <div className="resident-settlement-filter-group">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="2"
                  width="18"
                  height="18"
                >
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
                <select
                  className="mr-select"
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="mediation">Mediation</option>
                  <option value="conciliation">Conciliation</option>
                </select>
                <select
                  className="mr-select"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="all">All Status</option>
                  {statusOptions
                    .filter((status) => status !== "all")
                    .map((status) => (
                      <option key={status} value={status}>
                        {getSettlementStatusLabel(status)}
                      </option>
                    ))}
                </select>
                <span className="mr-count">
                  {orderedSettlements.length} settlement
                  {orderedSettlements.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="resident-settlement-status-legend">
                {statusOptions
                  .filter((status) => status !== "all")
                  .map((status) => (
                    <span
                      className="resident-settlement-legend-item"
                      key={status}
                    >
                      <span
                        className={`badge resident-settlement-status-badge ${getSettlementStatusClass(status)}`}
                      >
                        {getSettlementStatusLabel(status)}
                      </span>
                    </span>
                  ))}
              </div>
            </div>

            {loading ? (
              <p className="mr-empty-text">Loading settlements...</p>
            ) : loadError ? (
              <p className="mr-empty-text" style={{ color: "#dc2626" }}>
                {loadError}
              </p>
            ) : orderedSettlements.length === 0 ? (
              <p className="mr-empty-text">
                No settlements found for your account.
              </p>
            ) : (
              <div className="mr-grid-4 resident-settlement-grid">
                {orderedSettlements.map((settlement) => (
                  <div
                    className="mr-card-compact resident-settlement-card"
                    key={settlement.id}
                  >
                    <div className="mr-card-compact-header">
                      <div className="mr-card-compact-icon resident-settlement-icon">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#0284c7"
                          strokeWidth="2"
                          width="18"
                          height="18"
                        >
                          <rect x="3" y="4" width="18" height="18" rx="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                      </div>
                      <div className="resident-settlement-status-wrap">
                        {isSettlementOverdue(settlement.session_end) &&
                          (normalizeValue(settlement.status) === "scheduled" ||
                            normalizeValue(settlement.status) ===
                              "rescheduled") && (
                            <span className="badge resident-settlement-status-badge overdue">
                              Overdue
                            </span>
                          )}
                        <span
                          className={`badge resident-settlement-status-badge ${getSettlementStatusClass(settlement.status)}`}
                        >
                          {getSettlementStatusLabel(settlement.status)}
                        </span>
                      </div>
                    </div>

                    <div className="mr-card-compact-title">
                      {settlement.complaint?.complaint_type || "Complaint"}
                    </div>

                    <div className="resident-settlement-meta">
                      <span>{getSettlementTypeLabel(settlement.type)}</span>
                      <span>Complaint #{settlement.complaint_id}</span>
                    </div>

                    <div className="resident-settlement-schedule">
                      <div className="resident-settlement-time-chip start">
                        <span>Start</span>
                        <strong>
                          {formatScheduleDateTime(settlement.session_start)}
                        </strong>
                      </div>
                      <div className="resident-settlement-time-chip end">
                        <span>End</span>
                        <strong>
                          {formatScheduleDateTime(settlement.session_end)}
                        </strong>
                      </div>
                    </div>

                    <p className="resident-settlement-parties">
                      <strong>Parties:</strong>{" "}
                      {toPartyNames(settlement.partyNames)}
                    </p>

                    <div className="mr-card-compact-actions">
                      <button
                        className="details-btn"
                        onClick={() => openDetails(settlement)}
                      >
                        View Details
                      </button>
                    </div>
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

export default ResidentSettlements;
