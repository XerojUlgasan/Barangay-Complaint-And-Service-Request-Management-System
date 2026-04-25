import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  getAllSettlementsForAdmin,
  getSettlementsByComplaintId,
  getComplaintById,
} from "../../supabse_db/settlement/settlement";
import {
  formatPhilippineDateOnly,
  formatPhilippineDateTime,
} from "../../utils/philippineTime";
import "../../styles/BarangayAdmin.css";

const normalizeValue = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");

const titleCase = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getTodayKey = () => {
  const now = new Date();
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
};

const getDateKeyFromIso = (isoValue) => {
  if (!isoValue) return "";
  const date = new Date(isoValue);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
};

const formatTimeOnly = (isoValue, fallback = "N/A") => {
  if (!isoValue) return fallback;
  const date = new Date(isoValue);
  if (isNaN(date.getTime())) return fallback;
  return date.toLocaleTimeString("en-US", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const HighlightMatch = ({ text, query }) => {
  if (!query || !query.trim()) return <>{text}</>;
  const pattern = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${pattern})`, "gi");
  const parts = String(text).split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            style={{
              backgroundColor: "#fef08a",
              color: "#111827",
              padding: "0 2px",
              borderRadius: "2px"
            }}
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

const STATUS_CONFIG = {
  scheduled: { color: "#2563eb", bg: "#dbeafe" },
  rescheduled: { color: "#d97706", bg: "#fef3c7" },
  resolved: { color: "#059669", bg: "#d1fae5" },
  unresolved: { color: "#dc2626", bg: "#fee2e2" },
  rejected: { color: "#6b7280", bg: "#f3f4f6" },
};

const TYPE_CONFIG = {
  mediation: { color: "#7c3aed", bg: "#ede9fe" },
  conciliation: { color: "#0891b2", bg: "#cffafe" },
};

const getStatusStyle = (status) =>
  STATUS_CONFIG[normalizeValue(status)] || STATUS_CONFIG.scheduled;

const getTypeStyle = (type) =>
  TYPE_CONFIG[normalizeValue(type)] || TYPE_CONFIG.mediation;

export default function AdminMediations() {
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const todayKey = getTodayKey();

  // Filters State
  const [filterDate, setFilterDate] = useState(todayKey);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [complaintInfo, setComplaintInfo] = useState(null);
  const [settlementHistory, setSettlementHistory] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const result = await getAllSettlementsForAdmin();

    if (!result.success) {
      setSettlements([]);
      setError(result.message || "Failed to fetch settlements.");
      setLoading(false);
      return;
    }

    setSettlements(result.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (showDetailModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showDetailModal]);

  // Derived Summary Counts (Calculated off ALL settlements, ignoring filters)
  const todayCount = settlements.filter(
    (s) => getDateKeyFromIso(s.session_start) === todayKey,
  ).length;

  const todayMediationCount = settlements.filter(
    (s) =>
      getDateKeyFromIso(s.session_start) === todayKey &&
      normalizeValue(s.type) === "mediation",
  ).length;

  const todayConciliationCount = settlements.filter(
    (s) =>
      getDateKeyFromIso(s.session_start) === todayKey &&
      normalizeValue(s.type) === "conciliation",
  ).length;

  // Filter the list
  const filteredSettlements = useMemo(() => {
    return settlements
      .filter((s) => {
        // 1. Date Filter
        if (filterDate && getDateKeyFromIso(s.session_start) !== filterDate) {
          return false;
        }

        // 2. Status Filter
        if (filterStatus !== "all" && normalizeValue(s.status) !== filterStatus) {
          return false;
        }

        // 3. Type Filter
        if (filterType !== "all" && normalizeValue(s.type) !== filterType) {
          return false;
        }

        // 4. Search Filter
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchId = String(s.id).includes(query);
          const matchComplaintId = String(s.complaint_id).includes(query);
          const matchComplaintType = String(
            s.complaint?.complaint_type || "",
          ).toLowerCase().includes(query);
          const matchParties = (s.partyNames || []).some(
            (p) => String(p.fullName || "").toLowerCase().includes(query),
          );

          if (!matchId && !matchComplaintId && !matchComplaintType && !matchParties) {
            return false;
          }
        }

        return true;
      })
      .sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }, [settlements, filterDate, filterStatus, filterType, searchQuery]);

  // Open detail modal
  const handleViewDetails = async (settlement) => {
    setSelectedSettlement(settlement);
    setShowDetailModal(true);
    setDetailLoading(true);
    setComplaintInfo(null);
    setSettlementHistory([]);

    const [complaintResult, historyResult] = await Promise.all([
      getComplaintById(settlement.complaint_id),
      getSettlementsByComplaintId(settlement.complaint_id),
    ]);

    if (complaintResult.success) {
      setComplaintInfo(complaintResult.data);
    }

    if (historyResult.success) {
      setSettlementHistory(historyResult.data || []);
    }

    setDetailLoading(false);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedSettlement(null);
    setComplaintInfo(null);
    setSettlementHistory([]);
  };

  const clearFilters = () => {
    setFilterDate("");
    setFilterStatus("all");
    setFilterType("all");
    setSearchQuery("");
  };

  return (
    <div className="admin-mediations-root">
      {/* Page Header */}
      <div className="admin-mediations-header">
        <div className="admin-mediations-header-left">
          <h1 className="admin-mediations-title">Mediations & Conciliations</h1>
          <p className="admin-mediations-subtitle">
            Search, filter, and track barangay settlement schedules globally
          </p>
        </div>
        <div className="admin-mediations-header-date">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="16"
            height="16"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          <span>{formatPhilippineDateOnly(new Date().toISOString())}</span>
        </div>
      </div>

      {/* Summary Chips */}
      <div className="admin-mediations-chips">
        <div className="admin-mediations-chip">
          <span className="admin-mediations-chip-num">{todayCount}</span>
          <span className="admin-mediations-chip-label">Today Total</span>
        </div>
        <div className="admin-mediations-chip accent-purple">
          <span className="admin-mediations-chip-num">{todayMediationCount}</span>
          <span className="admin-mediations-chip-label">Today Mediation</span>
        </div>
        <div className="admin-mediations-chip accent-cyan">
          <span className="admin-mediations-chip-num">{todayConciliationCount}</span>
          <span className="admin-mediations-chip-label">Today Conciliation</span>
        </div>
        <div className="admin-mediations-chip accent-muted">
          <span className="admin-mediations-chip-num">{settlements.length}</span>
          <span className="admin-mediations-chip-label">All Time (Total)</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="admin-mediations-error">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="16"
            height="16"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Filters and List Section */}
      <div className="admin-mediations-section">
        
        {/* Controls Layout */}
        <div className="admin-mediations-controls-wrap">
          <div className="admin-mediations-search-box">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="18"
              height="18"
              className="admin-mediations-search-icon"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by ID, Complaint Type, or Party Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-mediations-search-input"
            />
          </div>

          <div className="admin-mediations-filters-row">
            <div className="admin-mediations-filter-group">
              <label>Date Filter</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>
            <div className="admin-mediations-filter-group">
              <label>Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="rescheduled">Rescheduled</option>
                <option value="resolved">Resolved</option>
                <option value="unresolved">Unresolved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="admin-mediations-filter-group">
              <label>Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="mediation">Mediation</option>
                <option value="conciliation">Conciliation</option>
              </select>
            </div>
            
            {(filterDate || filterStatus !== "all" || filterType !== "all" || searchQuery) && (
              <button className="admin-mediations-filter-clear" onClick={clearFilters}>
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="admin-mediations-section-header" style={{ marginTop: "24px" }}>
          <h2 className="admin-mediations-section-title">
            Settlement Results
          </h2>
          <span className="admin-mediations-section-count">
            {filteredSettlements.length} match(es)
          </span>
        </div>

        {loading ? (
          <div className="admin-mediations-loading">
            <div className="admin-mediations-spinner" />
            <span>Loading settlements...</span>
          </div>
        ) : filteredSettlements.length === 0 ? (
          <div className="admin-mediations-empty">
            <div className="admin-mediations-empty-icon">⚖️</div>
            <p className="admin-mediations-empty-text">
              NO SETTLEMENTS FOUND
            </p>
            <p className="admin-mediations-empty-sub">
              Try adjusting your filters or search query
            </p>
          </div>
        ) : (
          <div className="admin-mediations-list">
            {filteredSettlements.map((s) => {
              const typeStyle = getTypeStyle(s.type);
              const statusStyle = getStatusStyle(s.status);

              return (
                <div className="admin-mediations-card" key={s.id}>
                  <div className="admin-mediations-card-top">
                    <div className="admin-mediations-card-id">
                      <HighlightMatch text={`#${s.id}`} query={searchQuery} />
                    </div>
                    <div className="admin-mediations-card-pills">
                      <span
                        className="admin-mediations-pill"
                        style={{
                          color: typeStyle.color,
                          background: typeStyle.bg,
                        }}
                      >
                        {titleCase(s.type)}
                      </span>
                      <span
                        className="admin-mediations-pill"
                        style={{
                          color: statusStyle.color,
                          background: statusStyle.bg,
                        }}
                      >
                        {titleCase(s.status || "scheduled")}
                      </span>
                    </div>
                  </div>

                  <div className="admin-mediations-card-body">
                    <div className="admin-mediations-card-field">
                      <span className="admin-mediations-card-label">
                        Scheduled Date
                      </span>
                      <span className="admin-mediations-card-value" style={{ fontWeight: 800, color: '#047857' }}>
                        {formatPhilippineDateOnly(s.session_start, "N/A")}
                      </span>
                    </div>
                    <div className="admin-mediations-card-field">
                      <span className="admin-mediations-card-label">
                        Session Time
                      </span>
                      <span className="admin-mediations-card-value">
                        <span className="admin-mediations-time-chip start">
                          {formatTimeOnly(s.session_start)}
                        </span>
                        <span className="admin-mediations-time-sep">→</span>
                        <span className="admin-mediations-time-chip end">
                          {formatTimeOnly(s.session_end)}
                        </span>
                      </span>
                    </div>
                    <div className="admin-mediations-card-field">
                      <span className="admin-mediations-card-label">
                        Complaint
                      </span>
                      <span className="admin-mediations-card-value">
                        <HighlightMatch
                          text={`#${s.complaint_id} — ${s.complaint?.complaint_type || "Unknown Type"}`}
                          query={searchQuery}
                        />
                      </span>
                    </div>
                    <div className="admin-mediations-card-field">
                      <span className="admin-mediations-card-label">
                        Parties
                      </span>
                      <span className="admin-mediations-card-value">
                        <HighlightMatch
                          text={
                            (s.partyNames || [])
                              .map((p) => p.fullName)
                              .join(", ") || "N/A"
                          }
                          query={searchQuery}
                        />
                      </span>
                    </div>
                  </div>

                  <div className="admin-mediations-card-footer">
                    <button
                      className="admin-mediations-btn-detail"
                      onClick={() => handleViewDetails(s)}
                    >
                      View Complaint Info
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal &&
        selectedSettlement &&
        createPortal(
          <div
            className="admin-mediations-modal-overlay"
            onClick={closeDetailModal}
          >
            <div
              className="admin-mediations-modal"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="admin-mediations-modal-header">
                <div>
                  <h3 className="admin-mediations-modal-title">
                    Settlement #{selectedSettlement.id} — Details
                  </h3>
                  <p className="admin-mediations-modal-sub">
                    Complaint #{selectedSettlement.complaint_id}
                  </p>
                </div>
                <button
                  className="admin-mediations-modal-close"
                  onClick={closeDetailModal}
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

              {/* Modal Body */}
              <div className="admin-mediations-modal-body">
                {detailLoading ? (
                  <div className="admin-mediations-loading">
                    <div className="admin-mediations-spinner" />
                    <span>Loading details...</span>
                  </div>
                ) : (
                  <>
                    {/* Complaint Info Section */}
                    <div className="admin-mediations-detail-section">
                      <h4 className="admin-mediations-detail-heading">
                        Complaint Information
                      </h4>
                      {complaintInfo ? (
                        <div className="admin-mediations-detail-grid">
                          <div className="admin-mediations-detail-item">
                            <span className="admin-mediations-detail-key">
                              Complaint ID
                            </span>
                            <span className="admin-mediations-detail-val">
                              #{complaintInfo.id}
                            </span>
                          </div>
                          <div className="admin-mediations-detail-item">
                            <span className="admin-mediations-detail-key">
                              Complaint Type
                            </span>
                            <span className="admin-mediations-detail-val">
                              {complaintInfo.complaint_type || "N/A"}
                            </span>
                          </div>
                          <div className="admin-mediations-detail-item full">
                            <span className="admin-mediations-detail-key">
                              Description
                            </span>
                            <span className="admin-mediations-detail-val desc">
                              {complaintInfo.description ||
                                "No description provided."}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="admin-mediations-muted">
                          Complaint info could not be loaded.
                        </p>
                      )}
                    </div>


                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="admin-mediations-modal-footer">
                <button
                  className="admin-mediations-btn-close"
                  onClick={closeDetailModal}
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

