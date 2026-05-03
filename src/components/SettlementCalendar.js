import React, { useEffect, useMemo, useState } from "react";
import {
  formatPhilippineDateOnly,
  toPhilippineDateTimeLocalValue,
} from "../utils/philippineTime";
import "../styles/SettlementCalendar.css";

const WEEKDAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

const getDateKeyFromIso = (value) => {
  const local = toPhilippineDateTimeLocalValue(value);
  return local ? local.slice(0, 10) : "";
};

const formatMonthLabel = (year, month) => {
  const base = new Date(Date.UTC(year, month, 1));
  return base.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Manila",
  });
};

const getFirstWeekdayInManila = (year, month) => {
  const firstDate = new Date(Date.UTC(year, month, 1, 12, 0, 0));
  const weekdayName = firstDate.toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "Asia/Manila",
  });

  return WEEKDAY_HEADERS.findIndex((header) => header === weekdayName);
};

const getTodayKey = () => {
  const now = new Date();
  const local = now.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  return local;
};

const DEFAULT_START_TIME = "09:00";
const DEFAULT_END_TIME = "10:00";
const EDIT_STATUS_OPTIONS = [
  "rescheduled",
  "unresolved",
  "resolved",
  "rejected",
];

const toMinutes = (timeValue) => {
  if (!timeValue || !timeValue.includes(":")) return 0;
  const [hour, minute] = timeValue
    .split(":")
    .map((value) => Number(value) || 0);
  return hour * 60 + minute;
};

const fromMinutes = (value) => {
  const normalized = Math.max(0, Math.min(23 * 60 + 59, value));
  const hour = String(Math.floor(normalized / 60)).padStart(2, "0");
  const minute = String(normalized % 60).padStart(2, "0");
  return `${hour}:${minute}`;
};

const addOneHour = (timeValue) => fromMinutes(toMinutes(timeValue) + 60);

const getTimeOnly = (dateTimeValue, fallback = DEFAULT_START_TIME) => {
  const raw = String(dateTimeValue || "").trim();
  if (!raw.includes("T")) return fallback;
  return raw.slice(11, 16) || fallback;
};

const formatPhilippineTimeOnly = (value, fallback = "N/A") => {
  if (!value) return fallback;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;

  return parsed.toLocaleTimeString("en-US", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const composeDateTime = (dayKey, timeValue) => `${dayKey}T${timeValue}`;

const getLocalDateKey = (dateTimeValue) => {
  const local = toPhilippineDateTimeLocalValue(dateTimeValue);
  return local ? local.slice(0, 10) : "";
};

const buildMonthCells = (year, month) => {
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstWeekday = getFirstWeekdayInManila(year, month);
  const previousMonthDays = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const cells = [];

  for (let i = firstWeekday - 1; i >= 0; i -= 1) {
    const day = previousMonthDays - i;
    const previousMonthDate = new Date(Date.UTC(year, month - 1, day));
    cells.push({
      key: previousMonthDate.toISOString().slice(0, 10),
      day,
      outsideMonth: true,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const currentDate = new Date(Date.UTC(year, month, day));
    cells.push({
      key: currentDate.toISOString().slice(0, 10),
      day,
      outsideMonth: false,
    });
  }

  const remaining = (7 - (cells.length % 7)) % 7;
  for (let i = 1; i <= remaining; i += 1) {
    const nextMonthDate = new Date(Date.UTC(year, month + 1, i));
    cells.push({
      key: nextMonthDate.toISOString().slice(0, 10),
      day: i,
      outsideMonth: true,
    });
  }

  return cells;
};

export default function SettlementCalendar({
  settlements = [],
  complaintOptions = [],
  initialType = "mediation",
  initialFilter = "all",
  loading = false,
  onCreateSettlement,
  onUpdateSettlement,
  readOnly = false,
  allowPastDates = false,
  permissions = null,
}) {
  const todayKey = getTodayKey();
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return {
      year: now.getUTCFullYear(),
      month: now.getUTCMonth(),
    };
  });
  const [selectedDay, setSelectedDay] = useState(todayKey);
  const [filterType, setFilterType] = useState(initialFilter);
  const [complaintSearch, setComplaintSearch] = useState("");
  const [createForm, setCreateForm] = useState({
    complaintId: "",
    type: initialType,
    startTime: DEFAULT_START_TIME,
    endTime: DEFAULT_END_TIME,
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSettlement, setEditingSettlement] = useState(null);
  const [editForm, setEditForm] = useState({
    dateKey: todayKey,
    startTime: DEFAULT_START_TIME,
    endTime: DEFAULT_END_TIME,
    status: "scheduled",
    recordedDateKey: todayKey,
    recordedStartTime: DEFAULT_START_TIME,
    recordedEndTime: DEFAULT_END_TIME,
  });
  const [createMessage, setCreateMessage] = useState({ type: "", text: "" });
  const [editMessage, setEditMessage] = useState({ type: "", text: "" });
  const [submitting, setSubmitting] = useState(false);
  const [hoveredButton, setHoveredButton] = useState(null);

  useEffect(() => {
    if (!selectedDay) return;
    setCreateForm((previous) => ({
      ...previous,
      startTime: previous.startTime || DEFAULT_START_TIME,
      endTime:
        previous.endTime ||
        addOneHour(previous.startTime || DEFAULT_START_TIME),
    }));
    setEditingSettlement(null);
    setIsCreateModalOpen(false);
  }, [selectedDay]);

  useEffect(() => {
    setCreateForm((previous) => ({ ...previous, type: initialType }));
  }, [initialType]);

  const openCreateModal = () => {
    if (isSelectedDayNotUpcoming) {
      setCreateMessage({
        type: "error",
        text: "Add Settlement is only available for upcoming days.",
      });
      return;
    }

    setCreateForm((previous) => ({
      ...previous,
      startTime: previous.startTime || DEFAULT_START_TIME,
      endTime:
        previous.endTime ||
        addOneHour(previous.startTime || DEFAULT_START_TIME),
    }));
    setCreateMessage({ type: "", text: "" });
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    if (submitting) return;
    setIsCreateModalOpen(false);
  };

  const closeEditModal = () => {
    if (submitting) return;
    setEditingSettlement(null);
  };

  const isOutcomeLockedStatus = (status) =>
    ["unresolved", "resolved", "rejected"].includes(normalizeValue(status));

  const syncEditFormForStatus = (status, source = editForm) => {
    const normalizedStatus = normalizeValue(status);
    const shouldLock = isOutcomeLockedStatus(normalizedStatus);

    return {
      ...source,
      status: normalizedStatus,
      dateKey: shouldLock ? source.recordedDateKey : source.dateKey,
      startTime: shouldLock ? source.recordedStartTime : source.startTime,
      endTime: shouldLock ? source.recordedEndTime : source.endTime,
    };
  };

  const normalizedSettlements = useMemo(
    () =>
      (settlements || []).map((entry) => ({
        ...entry,
        normalizedType: normalizeValue(entry.type),
        dayKey: getDateKeyFromIso(entry.session_start),
      })),
    [settlements],
  );

  const visibleSettlements = useMemo(() => {
    if (filterType === "all") {
      return normalizedSettlements;
    }

    return normalizedSettlements.filter(
      (entry) => entry.normalizedType === normalizeValue(filterType),
    );
  }, [filterType, normalizedSettlements]);

  const settlementsByDay = useMemo(() => {
    return visibleSettlements.reduce((accumulator, entry) => {
      if (!entry.dayKey) return accumulator;
      if (!accumulator[entry.dayKey]) accumulator[entry.dayKey] = [];
      accumulator[entry.dayKey].push(entry);
      return accumulator;
    }, {});
  }, [visibleSettlements]);

  const monthCells = useMemo(
    () => buildMonthCells(monthCursor.year, monthCursor.month),
    [monthCursor],
  );

  const selectedDaySettlements = settlementsByDay[selectedDay] || [];
  const isSelectedDayInPast = selectedDay < todayKey;
  const isSelectedDayNotUpcoming = selectedDay <= todayKey;
  const addSettlementDisabledReason = !permissions?.create_sett
    ? "You don't have permission to create settlements"
    : isSelectedDayNotUpcoming
      ? "Add Settlement is only available for upcoming days."
      : "";

  const filteredComplaintOptions = useMemo(() => {
    const normalizedSearch = normalizeValue(complaintSearch);

    return (complaintOptions || []).filter((option) => {
      if (!normalizedSearch) return true;
      const haystack = normalizeValue(
        `${option.label} ${option.subtitle} ${option.complainantName} ${option.respondentNames}`,
      );
      return haystack.includes(normalizedSearch);
    });
  }, [complaintOptions, complaintSearch]);

  const selectedComplaintOption = useMemo(
    () =>
      (complaintOptions || []).find(
        (option) => String(option.id) === String(createForm.complaintId),
      ) || null,
    [complaintOptions, createForm.complaintId],
  );

  const shiftMonth = (offset) => {
    setMonthCursor((previous) => {
      const date = new Date(
        Date.UTC(previous.year, previous.month + offset, 1),
      );
      return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth(),
      };
    });
  };

  const handleCreateSettlement = async (event) => {
    event.preventDefault();
    if (!onCreateSettlement || submitting) return;

    if (selectedComplaintOption?.lockedForNewSettlement) {
      setCreateMessage({
        type: "error",
        text: "This complaint already has a linked settlement that is not rejected.",
      });
      return;
    }

    if (isSelectedDayNotUpcoming) {
      setCreateMessage({
        type: "error",
        text: "Add Settlement is only available for upcoming days.",
      });
      return;
    }

    if (toMinutes(createForm.endTime) <= toMinutes(createForm.startTime)) {
      setCreateMessage({
        type: "error",
        text: "Session end time must be later than session start time.",
      });
      return;
    }

    const sessionStart = composeDateTime(selectedDay, createForm.startTime);
    const sessionEnd = composeDateTime(selectedDay, createForm.endTime);

    setSubmitting(true);
    setCreateMessage({ type: "", text: "" });

    const result = await onCreateSettlement({
      complaintId: createForm.complaintId,
      type: createForm.type,
      status: "scheduled",
      sessionStart,
      sessionEnd,
    });

    if (!result?.success) {
      setCreateMessage({
        type: "error",
        text: result?.message || "Failed to create settlement.",
      });
      setSubmitting(false);
      return;
    }

    setCreateMessage({
      type: "success",
      text: "Settlement scheduled successfully.",
    });
    setCreateForm((previous) => ({
      ...previous,
      complaintId: "",
      startTime: DEFAULT_START_TIME,
      endTime: addOneHour(DEFAULT_START_TIME),
    }));
    setComplaintSearch("");
    setIsCreateModalOpen(false);
    setSubmitting(false);
  };

  const handleStartEdit = (settlement) => {
    const recordedDateKey = getLocalDateKey(settlement.session_start);
    const recordedStartTime = getTimeOnly(
      settlement.sessionStartLocal,
      DEFAULT_START_TIME,
    );
    const recordedEndTime = getTimeOnly(
      settlement.sessionEndLocal,
      DEFAULT_END_TIME,
    );
    const normalizedStatus = normalizeValue(settlement.status);
    const initialStatus = EDIT_STATUS_OPTIONS.includes(normalizedStatus)
      ? normalizedStatus
      : "rescheduled";

    setEditingSettlement(settlement);
    setEditForm({
      dateKey: recordedDateKey,
      startTime: recordedStartTime,
      endTime: recordedEndTime,
      status: initialStatus,
      recordedDateKey,
      recordedStartTime,
      recordedEndTime,
    });
    setEditMessage({ type: "", text: "" });
  };

  const handleUpdateSettlement = async (event) => {
    event.preventDefault();

    if (!onUpdateSettlement || !editingSettlement || submitting) return;

    const normalizedStatus = normalizeValue(editForm.status);
    const shouldLockOutcome = isOutcomeLockedStatus(normalizedStatus);
    const dateKey = shouldLockOutcome
      ? editForm.recordedDateKey
      : editForm.dateKey;
    const startTime = shouldLockOutcome
      ? editForm.recordedStartTime
      : editForm.startTime;
    const endTime = shouldLockOutcome
      ? editForm.recordedEndTime
      : editForm.endTime;

    if (normalizedStatus === "scheduled") {
      setEditMessage({
        type: "error",
        text: "Scheduled is not allowed when editing a settlement.",
      });
      return;
    }

    if (toMinutes(endTime) <= toMinutes(startTime)) {
      setEditMessage({
        type: "error",
        text: "Session end time must be later than session start time.",
      });
      return;
    }

    if (dateKey < todayKey) {
      setEditMessage({
        type: "error",
        text: "Past dates are not allowed.",
      });
      return;
    }

    setSubmitting(true);
    setEditMessage({ type: "", text: "" });

    const result = await onUpdateSettlement({
      settlementId: editingSettlement.id,
      sessionStart: composeDateTime(dateKey, startTime),
      sessionEnd: composeDateTime(dateKey, endTime),
      status: normalizedStatus,
    });

    if (!result?.success) {
      setEditMessage({
        type: "error",
        text: result?.message || "Failed to update settlement.",
      });
      setSubmitting(false);
      return;
    }

    setEditMessage({
      type: "success",
      text: "Settlement updated successfully.",
    });
    setEditingSettlement(null);
    setSubmitting(false);
  };

  return (
    <div className="settlement-calendar-wrap">
      <div className="settlement-calendar-controls">
        <div className="settlement-calendar-nav">
          <button type="button" onClick={() => shiftMonth(-1)}>
            Prev
          </button>
          <h3>{formatMonthLabel(monthCursor.year, monthCursor.month)}</h3>
          <button type="button" onClick={() => shiftMonth(1)}>
            Next
          </button>
        </div>

        <div className="settlement-calendar-filter">
          <label>Type Filter</label>
          <select
            value={filterType}
            onChange={(event) => setFilterType(event.target.value)}
          >
            <option value="all">All</option>
            <option value="mediation">Mediation</option>
            <option value="conciliation">Conciliation</option>
          </select>
        </div>
      </div>

      <div className="settlement-calendar-grid-header">
        {WEEKDAY_HEADERS.map((weekday) => (
          <div key={weekday}>{weekday}</div>
        ))}
      </div>

      <div className="settlement-calendar-grid">
        {monthCells.map((cell) => {
          const total = (settlementsByDay[cell.key] || []).length;
          const isSelected = selectedDay === cell.key;
          const isToday = todayKey === cell.key;
          const isPast = cell.key < todayKey;

          return (
            <button
              key={cell.key}
              type="button"
              className={`settlement-calendar-cell${cell.outsideMonth ? " outside" : ""}${isSelected ? " selected" : ""}${isToday ? " today" : ""}${isPast && !allowPastDates ? " past" : ""}`}
              onClick={() => setSelectedDay(cell.key)}
              disabled={isPast && !allowPastDates}
            >
              <span className="day-number">{cell.day}</span>
              {total > 0 ? <span className="day-count">{total}</span> : null}
            </button>
          );
        })}
      </div>

      <div className="settlement-day-panel">
        <div className="settlement-day-panel-header">
          <h4>{formatPhilippineDateOnly(selectedDay, "Selected Day")}</h4>
          <div className="settlement-day-panel-actions">
            {!readOnly && (
              <div style={{ position: "relative", display: "inline-block" }}>
                <div
                  onMouseEnter={() => setHoveredButton("add-settlement")}
                  onMouseLeave={() => setHoveredButton(null)}
                >
                  <button
                    type="button"
                    className="settlement-add-btn"
                    onClick={openCreateModal}
                    disabled={
                      isSelectedDayNotUpcoming ||
                      submitting ||
                      !permissions?.create_sett
                    }
                    style={{
                      opacity: addSettlementDisabledReason ? 0.5 : 1,
                      cursor: addSettlementDisabledReason
                        ? "not-allowed"
                        : "pointer",
                    }}
                  >
                    Add Settlement
                  </button>
                </div>
                {hoveredButton === "add-settlement" &&
                  addSettlementDisabledReason && (
                    <div
                      className="settlement-button-tooltip"
                      style={{
                        position: "absolute",
                        bottom: "100%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        marginBottom: "8px",
                        backgroundColor: "#374151",
                        color: "#fff",
                        padding: "0.5rem 0.75rem",
                        borderRadius: "4px",
                        fontSize: "12px",
                        whiteSpace: "nowrap",
                        zIndex: 1000,
                        pointerEvents: "none",
                      }}
                    >
                      {addSettlementDisabledReason}
                    </div>
                  )}
              </div>
            )}
            <span>{selectedDaySettlements.length} scheduled settlement(s)</span>
          </div>
        </div>

        <p className="settlement-muted">
          Selected day is locked. Session start and end use this same date.
        </p>

        {isSelectedDayNotUpcoming ? (
          <p className="settlement-form-message error">
            Add Settlement is only available for upcoming days.
          </p>
        ) : null}

        <div className="settlement-day-list">
          {loading ? (
            <p className="settlement-muted">Loading settlements...</p>
          ) : selectedDaySettlements.length === 0 ? (
            <p className="settlement-muted">No settlements on this day.</p>
          ) : (
            selectedDaySettlements.map((settlement) => (
              <div key={settlement.id} className="settlement-item-card">
                <div className="settlement-item-top">
                  <div>
                    <strong>#{settlement.id}</strong>
                    <span className="settlement-pill type">
                      {titleCase(settlement.type)}
                    </span>
                    <span className="settlement-pill status">
                      {titleCase(settlement.status || "scheduled")}
                    </span>
                  </div>
                  {!readOnly && (
                    <div
                      style={{ position: "relative", display: "inline-block" }}
                    >
                      <button
                        type="button"
                        onClick={() => handleStartEdit(settlement)}
                        disabled={!permissions?.update_sett}
                        onMouseEnter={() =>
                          setHoveredButton(`edit-${settlement.id}`)
                        }
                        onMouseLeave={() => setHoveredButton(null)}
                        style={{
                          opacity: !permissions?.update_sett ? 0.5 : 1,
                          cursor: !permissions?.update_sett
                            ? "not-allowed"
                            : "pointer",
                        }}
                      >
                        Edit
                      </button>
                      {hoveredButton === `edit-${settlement.id}` &&
                        !permissions?.update_sett && (
                          <div
                            className="settlement-button-tooltip"
                            style={{
                              position: "absolute",
                              bottom: "100%",
                              right: 0,
                              marginBottom: "8px",
                              backgroundColor: "#374151",
                              color: "#fff",
                              padding: "0.5rem 0.75rem",
                              borderRadius: "4px",
                              fontSize: "12px",
                              whiteSpace: "nowrap",
                              zIndex: 1000,
                              pointerEvents: "none",
                            }}
                          >
                            You don't have permission to edit settlements
                          </div>
                        )}
                    </div>
                  )}
                </div>

                <div className="settlement-item-meta">
                  <div>
                    <label>Complaint</label>
                    <p>
                      #{settlement.complaint_id} -{" "}
                      {settlement.complaint?.complaint_type || "Unknown"}
                    </p>
                  </div>
                  <div>
                    <label>Schedule</label>
                    <p className="settlement-time-range">
                      <span className="settlement-time-chip start">
                        {formatPhilippineTimeOnly(
                          settlement.session_start,
                          "N/A",
                        )}
                      </span>
                      <span className="settlement-time-separator">to</span>
                      <span className="settlement-time-chip end">
                        {formatPhilippineTimeOnly(
                          settlement.session_end,
                          "N/A",
                        )}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label>Parties</label>
                    <p>
                      {(settlement.partyNames || [])
                        .map((party) => party.fullName)
                        .join(", ") || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isCreateModalOpen ? (
        <div className="settlement-modal-overlay" onClick={closeCreateModal}>
          <div
            className="settlement-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="settlement-modal-header">
              <h4>Add Settlement</h4>
              <button
                type="button"
                onClick={closeCreateModal}
                disabled={submitting}
              >
                Close
              </button>
            </div>

            <form
              className="settlement-create-form"
              onSubmit={handleCreateSettlement}
            >
              <div>
                <label>Search Complaint</label>
                <input
                  type="text"
                  value={complaintSearch}
                  onChange={(event) => setComplaintSearch(event.target.value)}
                  placeholder="Search by complaint, complainant, or respondent"
                  disabled={isSelectedDayNotUpcoming || submitting}
                />
              </div>

              <div>
                <label>Complaint</label>
                <select
                  value={createForm.complaintId}
                  onChange={(event) =>
                    setCreateForm((previous) => ({
                      ...previous,
                      complaintId: event.target.value,
                    }))
                  }
                  required
                  disabled={isSelectedDayNotUpcoming || submitting}
                >
                  <option value="">Select complaint</option>
                  {filteredComplaintOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {createForm.complaintId ? (
                  <p className="settlement-muted">
                    {selectedComplaintOption?.subtitle}
                  </p>
                ) : null}
                {selectedComplaintOption?.lockedForNewSettlement ? (
                  <p className="settlement-form-message error">
                    This complaint already has a linked settlement that is not
                    rejected, so a new settlement cannot be created.
                  </p>
                ) : null}
              </div>

              <div className="settlement-create-grid">
                <div>
                  <label>Type</label>
                  <input value={titleCase(initialType)} readOnly disabled />
                </div>
                <div>
                  <label>Status</label>
                  <input value="Scheduled" readOnly disabled />
                </div>
              </div>

              <div className="settlement-create-grid">
                <div>
                  <label>Start Date (Locked)</label>
                  <input type="date" value={selectedDay} readOnly disabled />
                </div>
                <div>
                  <label>End Date (Locked)</label>
                  <input type="date" value={selectedDay} readOnly disabled />
                </div>
              </div>

              <div className="settlement-create-grid">
                <div>
                  <label>Session Start</label>
                  <input
                    type="time"
                    value={createForm.startTime}
                    onChange={(event) =>
                      setCreateForm((previous) => ({
                        ...previous,
                        startTime: event.target.value,
                      }))
                    }
                    required
                    disabled={isSelectedDayNotUpcoming || submitting}
                  />
                </div>
                <div>
                  <label>Session End</label>
                  <input
                    type="time"
                    value={createForm.endTime}
                    onChange={(event) =>
                      setCreateForm((previous) => ({
                        ...previous,
                        endTime: event.target.value,
                      }))
                    }
                    required
                    disabled={isSelectedDayNotUpcoming || submitting}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="settlement-create-submit"
                disabled={submitting || isSelectedDayNotUpcoming}
              >
                {submitting ? "Saving..." : "Save Settlement"}
              </button>

              {createMessage.text ? (
                <p className={`settlement-form-message ${createMessage.type}`}>
                  {createMessage.text}
                </p>
              ) : null}
            </form>
          </div>
        </div>
      ) : null}

      {editingSettlement ? (
        <div className="settlement-modal-overlay" onClick={closeEditModal}>
          <div
            className="settlement-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="settlement-modal-header">
              <h4>Edit Settlement</h4>
              <button
                type="button"
                onClick={closeEditModal}
                disabled={submitting}
              >
                Close
              </button>
            </div>

            <div className="settlement-edit-summary">
              <div>
                <span>Complaint</span>
                <strong>
                  #{editingSettlement.complaint_id} -{" "}
                  {editingSettlement.complaint?.complaint_type || "Unknown"}
                </strong>
              </div>
              <div>
                <span>Parties</span>
                <strong>
                  {(editingSettlement.partyNames || [])
                    .map((party) => party.fullName)
                    .join(", ") || "N/A"}
                </strong>
              </div>
            </div>

            <form
              className="settlement-create-form"
              onSubmit={handleUpdateSettlement}
            >
              <div className="settlement-create-grid">
                <div>
                  <label>Type</label>
                  <input
                    value={titleCase(editingSettlement.type)}
                    readOnly
                    disabled
                  />
                </div>
                <div>
                  <label>Status</label>
                  <select
                    value={editForm.status}
                    onChange={(event) => {
                      const nextStatus = normalizeValue(event.target.value);
                      setEditForm((previous) =>
                        syncEditFormForStatus(nextStatus, {
                          ...previous,
                          status: nextStatus,
                        }),
                      );
                    }}
                    disabled={submitting}
                  >
                    <option value="rescheduled">Rescheduled</option>
                    <option value="unresolved">Unresolved</option>
                    <option value="resolved">Resolved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="settlement-create-grid">
                <div>
                  <label>Session Date</label>
                  <input
                    type="date"
                    value={
                      isOutcomeLockedStatus(editForm.status)
                        ? editForm.recordedDateKey
                        : editForm.dateKey
                    }
                    min={todayKey}
                    onChange={(event) => {
                      const nextDate = event.target.value;
                      setEditForm((previous) => ({
                        ...previous,
                        dateKey: nextDate,
                        status: "rescheduled",
                      }));
                    }}
                    disabled={
                      submitting || isOutcomeLockedStatus(editForm.status)
                    }
                    required
                  />
                </div>
                <div>
                  <label>Recorded Session Date</label>
                  <input
                    type="date"
                    value={editForm.recordedDateKey}
                    readOnly
                    disabled
                  />
                </div>
              </div>

              <div className="settlement-create-grid">
                <div>
                  <label>Session Start</label>
                  <input
                    type="time"
                    value={
                      isOutcomeLockedStatus(editForm.status)
                        ? editForm.recordedStartTime
                        : editForm.startTime
                    }
                    onChange={(event) => {
                      const nextTime = event.target.value;
                      setEditForm((previous) => ({
                        ...previous,
                        startTime: nextTime,
                        status: "rescheduled",
                      }));
                    }}
                    disabled={
                      submitting || isOutcomeLockedStatus(editForm.status)
                    }
                    required
                  />
                </div>
                <div>
                  <label>Session End</label>
                  <input
                    type="time"
                    value={
                      isOutcomeLockedStatus(editForm.status)
                        ? editForm.recordedEndTime
                        : editForm.endTime
                    }
                    onChange={(event) => {
                      const nextTime = event.target.value;
                      setEditForm((previous) => ({
                        ...previous,
                        endTime: nextTime,
                        status: "rescheduled",
                      }));
                    }}
                    disabled={
                      submitting || isOutcomeLockedStatus(editForm.status)
                    }
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="settlement-create-submit"
                disabled={submitting}
              >
                {submitting ? "Saving..." : "Save Changes"}
              </button>

              {editMessage.text ? (
                <p className={`settlement-form-message ${editMessage.type}`}>
                  {editMessage.text}
                </p>
              ) : null}
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
