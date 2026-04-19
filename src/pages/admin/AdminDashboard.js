import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  MapPin,
  Users,
  FileText,
  MessageSquare,
  BarChart3,
  Megaphone,
} from "lucide-react";
import "../../styles/BarangayAdmin.css";
import {
  getAllComplaints,
  getAllMediations,
  getAllRequests,
  getOfficialsWithStats,
  getOfficialsAttendanceToday,
  getResidentStats,
  analyzeComplaintsByLocation,
  analyzeComplaintsByType,
  analyzeRequestsByType,
  calculateAverageResponseTime,
  calculateAverageResolutionTime,
} from "../../supabse_db/analytics/analytics";
import { getAnnouncements } from "../../supabse_db/announcement/announcement";

const FINISHED_STATUSES = new Set(["completed", "rejected", "non_compliant"]);

const normalizeStatus = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .trim();

const isFinishedStatus = (status) =>
  FINISHED_STATUSES.has(normalizeStatus(status));

const PERIOD_FILTERS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
];

const PERIOD_LABEL_MAP = PERIOD_FILTERS.reduce((acc, item) => {
  acc[item.key] = item.label;
  return acc;
}, {});

const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

const endOfDay = (date) =>
  new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const getComparisonWindows = (period) => {
  const now = new Date();

  if (period === "today") {
    const currentStart = startOfDay(now);
    const currentEnd = now;
    const prevDate = addDays(now, -1);
    return {
      currentStart,
      currentEnd,
      previousStart: startOfDay(prevDate),
      previousEnd: endOfDay(prevDate),
      previousLabel: "yesterday",
    };
  }

  if (period === "week") {
    const currentEnd = now;
    const currentStart = startOfDay(addDays(now, -6));
    const previousEnd = endOfDay(addDays(currentStart, -1));
    const previousStart = startOfDay(addDays(previousEnd, -6));
    return {
      currentStart,
      currentEnd,
      previousStart,
      previousEnd,
      previousLabel: "the previous 7 days",
    };
  }

  if (period === "month") {
    const currentStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
      0,
      0,
      0,
      0,
    );
    const currentEnd = now;

    const previousMonthDate = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );
    const previousStart = new Date(
      previousMonthDate.getFullYear(),
      previousMonthDate.getMonth(),
      1,
      0,
      0,
      0,
      0,
    );

    const lastDayPrevMonth = new Date(
      previousMonthDate.getFullYear(),
      previousMonthDate.getMonth() + 1,
      0,
    ).getDate();
    const targetDay = Math.min(now.getDate(), lastDayPrevMonth);

    const previousEnd = new Date(
      previousMonthDate.getFullYear(),
      previousMonthDate.getMonth(),
      targetDay,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      now.getMilliseconds(),
    );

    return {
      currentStart,
      currentEnd,
      previousStart,
      previousEnd,
      previousLabel: "the same period last month",
    };
  }

  const currentStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
  const currentEnd = now;
  const previousStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
  const previousEnd = new Date(
    now.getFullYear() - 1,
    now.getMonth(),
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
  );

  return {
    currentStart,
    currentEnd,
    previousStart,
    previousEnd,
    previousLabel: "the same period last year",
  };
};

const countItemsInRange = (items = [], start, end, dateField = "created_at") =>
  items.filter((item) => {
    const value = item?.[dateField];
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    return date >= start && date <= end;
  }).length;

const formatDeltaText = (current, previous, noun, previousLabel) => {
  if (current === 0 && previous === 0) {
    return `No ${noun} recorded compared to ${previousLabel}.`;
  }

  if (previous === 0) {
    return `${current} ${noun} this period, up from 0 in ${previousLabel}.`;
  }

  const delta = current - previous;
  const pct = Math.round((Math.abs(delta) / previous) * 100);

  if (delta === 0) {
    return `${noun[0].toUpperCase() + noun.slice(1)} stayed the same as ${previousLabel}.`;
  }

  if (delta > 0) {
    return `${pct}% more ${noun} than ${previousLabel}.`;
  }

  return `${pct}% fewer ${noun} than ${previousLabel}.`;
};

const getOfficialPeriodStats = (
  officials = [],
  requests = [],
  complaints = [],
  period,
) => {
  const windows = getComparisonWindows(period);

  const getWindowStats = (start, end) => {
    const requestsInWindow = requests.filter((r) => {
      const date = new Date(r.created_at);
      if (Number.isNaN(date.getTime())) return false;
      return date >= start && date <= end;
    });

    const complaintsInWindow = complaints.filter((c) => {
      const date = new Date(c.created_at);
      if (Number.isNaN(date.getTime())) return false;
      return date >= start && date <= end;
    });

    const totalCases = requestsInWindow.length + complaintsInWindow.length;

    const completedRequests = requestsInWindow.filter(
      (r) => r.status === "completed" || r.request_status === "completed",
    ).length;
    const completedComplaints = complaintsInWindow.filter(
      (c) => c.status === "resolved" || c.status === "completed",
    ).length;
    const completedCases = completedRequests + completedComplaints;

    const activeOfficials = officials.filter((official) => {
      const hasRequests = requestsInWindow.some(
        (r) => r.assigned_official_id === official.auth_uid,
      );
      const hasComplaints = complaintsInWindow.some(
        (c) => c.assigned_official_id === official.auth_uid,
      );
      return hasRequests || hasComplaints;
    }).length;

    const officialWorkloads = officials.map((official) => {
      const reqCount = requestsInWindow.filter(
        (r) => r.assigned_official_id === official.auth_uid,
      ).length;
      const compCount = complaintsInWindow.filter(
        (c) => c.assigned_official_id === official.auth_uid,
      ).length;

      return {
        name:
          official.full_name ||
          `${official.firstname || ""} ${official.lastname || ""}`.trim() ||
          "Unknown Official",
        total: reqCount + compCount,
      };
    });

    const busiestOfficial =
      officialWorkloads
        .sort((a, b) => b.total - a.total)
        .find((o) => o.total > 0) || null;

    return {
      totalCases,
      completedCases,
      activeOfficials,
      completionRate:
        totalCases > 0 ? Math.round((completedCases / totalCases) * 100) : 0,
      busiestOfficial,
    };
  };

  return {
    previousLabel: windows.previousLabel,
    current: getWindowStats(windows.currentStart, windows.currentEnd),
    previous: getWindowStats(windows.previousStart, windows.previousEnd),
  };
};

const getDateOnly = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const isWithinPeriod = (dateValue, period) => {
  if (!dateValue) return false;

  const rowDate = getDateOnly(dateValue);
  if (!rowDate) return false;

  const today = getDateOnly(new Date());
  if (!today) return false;

  if (period === "today") {
    return rowDate.getTime() === today.getTime();
  }

  const daysDiff = Math.floor((today - rowDate) / (1000 * 60 * 60 * 24));

  if (period === "week") {
    return daysDiff >= 0 && daysDiff < 7;
  }

  if (period === "month") {
    return (
      rowDate.getFullYear() === today.getFullYear() &&
      rowDate.getMonth() === today.getMonth()
    );
  }

  if (period === "year") {
    return rowDate.getFullYear() === today.getFullYear();
  }

  return true;
};

// ==================== ADVANCED INSIGHTS HELPERS ====================

const calculateDaysElapsed = (dateValue) => {
  if (!dateValue) return 0;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 0;
  const now = new Date();
  return Math.floor((now - date) / (1000 * 60 * 60 * 24));
};

const calculateHoursElapsed = (dateValue) => {
  if (!dateValue) return 0;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 0;
  const now = new Date();
  return Math.floor((now - date) / (1000 * 60 * 60));
};

// Find aging/at-risk cases (pending for too long)
const findAgingCases = (items = [], statusField = "status", maxDaysSLA = 5) => {
  const statusKey = statusField === "status" ? "status" : "request_status";
  return items.filter((item) => {
    const status = normalizeStatus(item[statusKey] || "pending");
    const daysElapsed = calculateDaysElapsed(item.created_at);
    return status === "pending" && daysElapsed >= maxDaysSLA;
  });
};

// Find high-priority items pending
const findHighPriorityPending = (items = []) => {
  return items.filter((item) => {
    const status = normalizeStatus(item.status || item.request_status);
    const priority = String(item.priority_level || "").toLowerCase();
    return (
      status === "pending" && (priority === "high" || priority === "urgent")
    );
  });
};

// Calculate average resolution time in days
const calculateAvgResolutionDays = (items = []) => {
  const completed = items.filter((item) => {
    const status = normalizeStatus(item.status || item.request_status);
    return FINISHED_STATUSES.has(status);
  });

  if (completed.length === 0) return 0;

  const totalDays = completed.reduce((sum, item) => {
    return sum + calculateDaysElapsed(item.created_at);
  }, 0);

  return Math.round(totalDays / completed.length);
};

// Calculate first response time (for complaints with assigned_official_id)
const calculateAvgFirstResponseTime = (items = []) => {
  const assigned = items.filter((item) => item.assigned_official_id);
  if (assigned.length === 0) return 0;

  const totalHours = assigned.reduce((sum, item) => {
    return sum + calculateHoursElapsed(item.created_at);
  }, 0);

  const avgHours = Math.round(totalHours / assigned.length);
  return avgHours < 24 ? `${avgHours}h` : `${Math.round(avgHours / 24)}d`;
};

// Find bottleneck types (certificate or complaint types with highest pending)
const findBottleneckTypes = (
  items = [],
  typeField = "certificate_type",
  limit = 3,
) => {
  const typeMap = {};
  items.forEach((item) => {
    const status = normalizeStatus(item.status || item.request_status);
    if (status === "pending") {
      const type = item[typeField] || "Unspecified";
      typeMap[type] = (typeMap[type] || 0) + 1;
    }
  });

  return Object.entries(typeMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([type, count]) => ({ type, pendingCount: count }));
};

// Get busiest day of week from created dates
const findBusiestDay = (items = []) => {
  const dayMap = {
    0: { name: "Sunday", count: 0 },
    1: { name: "Monday", count: 0 },
    2: { name: "Tuesday", count: 0 },
    3: { name: "Wednesday", count: 0 },
    4: { name: "Thursday", count: 0 },
    5: { name: "Friday", count: 0 },
    6: { name: "Saturday", count: 0 },
  };

  items.forEach((item) => {
    const date = new Date(item.created_at);
    if (!Number.isNaN(date.getTime())) {
      const dayOfWeek = date.getDay();
      dayMap[dayOfWeek].count += 1;
    }
  });

  const sorted = Object.values(dayMap).sort((a, b) => b.count - a.count);
  return sorted[0];
};

// Detect reporting delays for complaints (incident_date vs created_at)
const findReportingDelayInsights = (complaints = []) => {
  const delayedReports = complaints.filter((c) => {
    const incidentDate = new Date(c.incident_date);
    const createdDate = new Date(c.created_at);
    if (
      Number.isNaN(incidentDate.getTime()) ||
      Number.isNaN(createdDate.getTime())
    ) {
      return false;
    }
    const delayDays = Math.floor(
      (createdDate - incidentDate) / (1000 * 60 * 60 * 24),
    );
    return delayDays > 3; // Delay if reported more than 3 days after incident
  });

  if (delayedReports.length === 0) return null;

  const avgDelay = Math.round(
    delayedReports.reduce((sum, c) => {
      const delayDays = Math.floor(
        (new Date(c.created_at) - new Date(c.incident_date)) /
          (1000 * 60 * 60 * 24),
      );
      return sum + delayDays;
    }, 0) / delayedReports.length,
  );

  return { count: delayedReports.length, avgDelay };
};

// Analyze official workload unevenness
const analyzeWorkloadDistribution = (
  officials = [],
  allRequests = [],
  allComplaints = [],
) => {
  if (officials.length === 0) return null;

  const workloads = officials.map((official) => {
    const assignedRequests = allRequests.filter(
      (r) => r.assigned_official_id === official.id,
    ).length;
    const assignedComplaints = allComplaints.filter(
      (c) => c.assigned_official_id === official.id,
    ).length;
    return {
      name: official.full_name || `${official.firstname} ${official.lastname}`,
      totalCases: assignedRequests + assignedComplaints,
    };
  });

  const cases = workloads.map((w) => w.totalCases);
  const avgWorkload = Math.round(
    cases.reduce((a, b) => a + b, 0) / cases.length,
  );
  const maxWorkload = Math.max(...cases);
  const minWorkload = Math.min(...cases);

  const unevenness = ((maxWorkload - minWorkload) / avgWorkload) * 100;

  return {
    average: avgWorkload,
    max: maxWorkload,
    min: minWorkload,
    unevenness: Math.round(unevenness),
    overloadedCount: workloads.filter((w) => w.totalCases > avgWorkload * 1.5)
      .length,
  };
};

// Check for critically aged high-priority items
const findCriticalRiskItems = (requests = [], complaints = []) => {
  const criticalRequests = requests.filter((r) => {
    const daysElapsed = calculateDaysElapsed(r.created_at);
    const status = normalizeStatus(r.status || r.request_status);
    return status === "pending" && daysElapsed > 7; // More than week old
  });

  const criticalComplaints = complaints.filter((c) => {
    const daysElapsed = calculateDaysElapsed(c.created_at);
    const status = normalizeStatus(c.status || c.complaint_status);
    const priority = String(c.priority_level || "").toLowerCase();
    return status !== "resolved" && priority === "high" && daysElapsed > 5;
  });

  return {
    totalCritical: criticalRequests.length + criticalComplaints.length,
    agingRequests: criticalRequests.length,
    highPriorityComplaints: criticalComplaints.length,
  };
};

function TimeFilterDropdown({ timeFilter, setTimeFilter }) {
  return (
    <div style={{ minWidth: "180px" }}>
      <label
        htmlFor="analytics-time-filter"
        style={{
          display: "block",
          fontSize: "0.75rem",
          color: "#6b7280",
          marginBottom: "0.25rem",
          fontWeight: 600,
        }}
      >
        Date Filter
      </label>
      <select
        id="analytics-time-filter"
        value={timeFilter}
        onChange={(e) => setTimeFilter(e.target.value)}
        style={{
          width: "100%",
          border: "1px solid #d1d5db",
          borderRadius: "0.5rem",
          padding: "0.5rem 0.75rem",
          fontSize: "0.875rem",
          color: "#111827",
          backgroundColor: "#ffffff",
        }}
      >
        {PERIOD_FILTERS.map((period) => (
          <option key={period.key} value={period.key}>
            {period.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Simple inline BarChart using SVG so we don't add dependencies
function BarChart({ data = [], labels = [] }) {
  const max = Math.max(...data, 1);
  const w = 360;
  const h = 160;
  const padding = 20;
  const bw = (w - padding * 2) / data.length - 10;
  const ref = useRef();
  const [tip, setTip] = useState({
    visible: false,
    x: 0,
    y: 0,
    label: "",
    value: 0,
  });

  const onBarEnter = (e, v, i) => {
    const box = ref.current.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top - 10;
    setTip({ visible: true, x, y, label: labels[i] || "", value: v });
  };

  const onBarLeave = () =>
    setTip({ visible: false, x: 0, y: 0, label: "", value: 0 });

  return (
    <div className="chart-wrapper" ref={ref}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%">
        {/* grid lines */}
        {[0, 1, 2, 3, 4].map((i) => {
          const y = padding + (h - padding * 2) * (i / 4);
          return (
            <line
              key={i}
              x1={padding}
              x2={w - padding}
              y1={y}
              y2={y}
              stroke="#eef2f7"
            />
          );
        })}
        {data.map((v, i) => {
          const x = padding + i * (bw + 12);
          const barH = ((h - padding * 2) * v) / max;
          const y = h - padding - barH;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={bw}
                height={barH}
                rx="6"
                fill="#10b981"
                onMouseEnter={(e) => onBarEnter(e, v, i)}
                onMouseMove={(e) => onBarEnter(e, v, i)}
                onMouseLeave={onBarLeave}
              />
              <text
                x={x + bw / 2}
                y={h - 6}
                fontSize="9"
                textAnchor="middle"
                fill="#4b5563"
              >
                {labels[i]}
              </text>
            </g>
          );
        })}
      </svg>
      {tip.visible && (
        <div className="chart-tooltip" style={{ left: tip.x, top: tip.y }}>
          <div className="tt-label">{tip.label}</div>
          <div className="tt-value">requests : {tip.value}</div>
        </div>
      )}
    </div>
  );
}

// LineChart Component
function LineChart({ data = [], labels = [] }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const w = 360;
  const h = 160;
  const padding = 20;
  const pointSpacing = (w - padding * 2) / (data.length - 1 || 1);
  const ref = useRef();
  const [tip, setTip] = useState({
    visible: false,
    x: 0,
    y: 0,
    label: "",
    value: 0,
  });

  const range = max - min || 1;

  const points = data.map((v, i) => ({
    x: padding + i * pointSpacing,
    y: h - padding - ((v - min) / range) * (h - padding * 2),
    value: v,
    label: labels[i] || "",
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const onPointEnter = (e, point) => {
    const box = ref.current.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top - 10;
    setTip({ visible: true, x, y, label: point.label, value: point.value });
  };

  const onPointLeave = () =>
    setTip({ visible: false, x: 0, y: 0, label: "", value: 0 });

  return (
    <div className="chart-wrapper" ref={ref}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%">
        {/* grid lines */}
        {[0, 1, 2, 3, 4].map((i) => {
          const y = padding + (h - padding * 2) * (i / 4);
          return (
            <line
              key={i}
              x1={padding}
              x2={w - padding}
              y1={y}
              y2={y}
              stroke="#eef2f7"
            />
          );
        })}
        {/* Line */}
        <path
          d={pathD}
          stroke="#3b82f6"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="4"
            fill="#3b82f6"
            onMouseEnter={(e) => onPointEnter(e, p)}
            onMouseMove={(e) => onPointEnter(e, p)}
            onMouseLeave={onPointLeave}
            style={{ cursor: "pointer" }}
          />
        ))}
        {/* Labels */}
        {points.map((p, i) => (
          <text
            key={`label-${i}`}
            x={p.x}
            y={h - 6}
            fontSize="9"
            textAnchor="middle"
            fill="#4b5563"
          >
            {p.label}
          </text>
        ))}
      </svg>
      {tip.visible && (
        <div className="chart-tooltip" style={{ left: tip.x, top: tip.y }}>
          <div className="tt-label">{tip.label}</div>
          <div className="tt-value">complaints: {tip.value}</div>
        </div>
      )}
    </div>
  );
}

function CombinedLineChart({
  labels = [],
  requestsData = [],
  complaintsData = [],
}) {
  const max = Math.max(...requestsData, ...complaintsData, 1);
  const min = 0;
  const w = 360;
  const h = 170;
  const padding = 20;
  const pointSpacing = (w - padding * 2) / (labels.length - 1 || 1);
  const ref = useRef();
  const [tip, setTip] = useState({
    visible: false,
    x: 0,
    y: 0,
    idx: -1,
  });

  const range = max - min || 1;

  const buildPoints = (series) =>
    series.map((v, i) => ({
      x: padding + i * pointSpacing,
      y: h - padding - ((v - min) / range) * (h - padding * 2),
      value: v,
      label: labels[i] || "",
      index: i,
    }));

  const requestPoints = buildPoints(requestsData);
  const complaintPoints = buildPoints(complaintsData);

  const toPath = (points) =>
    points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  const onPointEnter = (e, idx) => {
    const box = ref.current.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top - 10;
    setTip({ visible: true, x, y, idx });
  };

  const onPointLeave = () => setTip({ visible: false, x: 0, y: 0, idx: -1 });

  const tipLabel = labels[tip.idx] || "";
  const tipReq = requestsData[tip.idx] ?? 0;
  const tipComp = complaintsData[tip.idx] ?? 0;

  return (
    <div className="chart-wrapper" ref={ref}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%">
        {[0, 1, 2, 3, 4].map((i) => {
          const y = padding + (h - padding * 2) * (i / 4);
          return (
            <line
              key={i}
              x1={padding}
              x2={w - padding}
              y1={y}
              y2={y}
              stroke="#eef2f7"
            />
          );
        })}

        <path
          d={toPath(requestPoints)}
          stroke="#2563eb"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={toPath(complaintPoints)}
          stroke="#dc2626"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {requestPoints.map((p, i) => (
          <circle
            key={`r-${i}`}
            cx={p.x}
            cy={p.y}
            r="4"
            fill="#2563eb"
            style={{ cursor: "pointer" }}
            onMouseEnter={(e) => onPointEnter(e, i)}
            onMouseMove={(e) => onPointEnter(e, i)}
            onMouseLeave={onPointLeave}
          />
        ))}

        {complaintPoints.map((p, i) => (
          <circle
            key={`c-${i}`}
            cx={p.x}
            cy={p.y}
            r="4"
            fill="#dc2626"
            style={{ cursor: "pointer" }}
            onMouseEnter={(e) => onPointEnter(e, i)}
            onMouseMove={(e) => onPointEnter(e, i)}
            onMouseLeave={onPointLeave}
          />
        ))}

        {requestPoints.map((p, i) => (
          <text
            key={`label-${i}`}
            x={p.x}
            y={h - 6}
            fontSize="9"
            textAnchor="middle"
            fill="#4b5563"
          >
            {p.label}
          </text>
        ))}
      </svg>

      {tip.visible && (
        <div className="chart-tooltip" style={{ left: tip.x, top: tip.y }}>
          <div className="tt-label">{tipLabel}</div>
          <div className="tt-value" style={{ color: "#2563eb" }}>
            Requests: {tipReq}
          </div>
          <div className="tt-value" style={{ color: "#dc2626" }}>
            Complaints: {tipComp}
          </div>
        </div>
      )}
    </div>
  );
}

// Minimal DonutChart SVG
function DonutChart({
  segments = [],
  labels = ["Pending", "In Progress", "Completed", "Rejected"],
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const size = 160;
  const r = 52;
  let angle = -90;
  const cx = size / 2;
  const cy = size / 2;
  const ref = useRef();
  const [tip, setTip] = useState({
    visible: false,
    x: 0,
    y: 0,
    label: "",
    value: 0,
  });

  const nonZeroSegments = segments
    .map((seg, idx) => ({ ...seg, idx }))
    .filter((seg) => Number(seg.value) > 0);

  const buildArcPath = (start, end) => {
    const large = end - start > 180 ? 1 : 0;
    const sx = cx + r * Math.cos((Math.PI / 180) * start);
    const sy = cy + r * Math.sin((Math.PI / 180) * start);
    const ex = cx + r * Math.cos((Math.PI / 180) * end);
    const ey = cy + r * Math.sin((Math.PI / 180) * end);
    return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`;
  };

  const arcs = nonZeroSegments.map((seg) => {
    const frac = seg.value / total;
    const start = angle;
    const end = angle + frac * 360;
    angle = end;

    const d =
      frac >= 0.999999
        ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r}`
        : buildArcPath(start, end);

    return {
      d,
      color: seg.color || "#ccc",
      value: seg.value,
      label: labels[seg.idx] || "",
    };
  });

  const onSegEnter = (e, seg) => {
    const box = ref.current.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top - 10;
    setTip({ visible: true, x, y, label: seg.label, value: seg.value });
  };
  const onSegLeave = () =>
    setTip({ visible: false, x: 0, y: 0, label: "", value: 0 });

  return (
    <div className="chart-wrapper" ref={ref}>
      <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="100%">
        <g transform={`translate(0,0)`}>
          {arcs.map((a, i) => (
            <path
              key={i}
              d={a.d}
              stroke={a.color}
              strokeWidth={18}
              fill="none"
              strokeLinecap="round"
              onMouseEnter={(e) => onSegEnter(e, a)}
              onMouseMove={(e) => onSegEnter(e, a)}
              onMouseLeave={onSegLeave}
            />
          ))}
        </g>
      </svg>
      {tip.visible && (
        <div className="chart-tooltip" style={{ left: tip.x, top: tip.y }}>
          <div className="tt-label">{tip.label}</div>
          <div className="tt-value">{tip.value}</div>
        </div>
      )}
    </div>
  );
}

function DashboardView({
  requests = [],
  complaints = [],
  announcements = [],
  residentStats = {},
  requestTrends = [],
  complaintTrends = [],
}) {
  // Calculate request status counts
  const pendingCount = requests.filter(
    (r) => r.status === "pending" || r.request_status === "pending",
  ).length;
  const inProgressCount = requests.filter(
    (r) => r.status === "in_progress" || r.request_status === "in_progress",
  ).length;
  const completedCount = requests.filter(
    (r) => r.status === "completed" || r.request_status === "completed",
  ).length;
  const rejectedCount = requests.filter(
    (r) => r.status === "rejected" || r.request_status === "rejected",
  ).length;
  const totalRequests = requests.length;

  // Calculate complaint status counts
  const pendingComplaints = complaints.filter(
    (c) => c.status === "pending",
  ).length;
  const activeComplaints = complaints.filter(
    (c) => c.status === "in_progress" || c.status === "investigating",
  ).length;
  const resolvedComplaints = complaints.filter(
    (c) => c.status === "resolved" || c.status === "completed",
  ).length;
  const totalComplaints = complaints.length;

  // Calculate performance metrics
  const avgResponseTime = calculateAverageResponseTime(requests);
  const avgResolutionTime = calculateAverageResolutionTime(requests);

  // Get top complaint locations
  const topLocations = analyzeComplaintsByLocation(complaints).slice(0, 5);

  // Get request types breakdown
  const requestTypes = analyzeRequestsByType(requests).slice(0, 5);

  // Get recent 3 requests for live feed
  const recentRequests = requests.slice(0, 3);

  // Prepare trend data for charts
  const trendLabels = requestTrends.map((t) => t.month).slice(-6);
  const trendData = requestTrends.map((t) => t.count).slice(-6);

  return (
    <div className="admin-page">
      <section className="analytics">
        <div className="analytics-header">
          <h3>System Analytics Overview</h3>
          <p className="muted">
            Comprehensive barangay services and community insights
          </p>
        </div>

        {/* Top Summary Cards (stat-box style) */}
        <div className="stat-row" style={{ marginBottom: "2rem" }}>
          <div className="stat-box yellow">
            <span className="stat-icon">
              <FileText size={18} />
            </span>
            <div className="stat-label">Total Requests</div>
            <div className="stat-num">{totalRequests}</div>
            <div className="stat-sub">
              {completedCount} completed • {pendingCount} pending
            </div>
          </div>

          <div className="stat-box red">
            <span className="stat-icon">
              <AlertCircle size={18} />
            </span>
            <div className="stat-label">Complaints</div>
            <div className="stat-num">{totalComplaints}</div>
            <div className="stat-sub">
              {resolvedComplaints} resolved • {activeComplaints} active
            </div>
          </div>

          <div className="stat-box blue">
            <span className="stat-icon">
              <Users size={18} />
            </span>
            <div className="stat-label">Active Residents</div>
            <div className="stat-num">{residentStats.activeResidents || 0}</div>
            <div className="stat-sub">
              {residentStats.totalHouseholds || 0} households registered
            </div>
          </div>

          <div className="stat-box orange">
            <span className="stat-icon">
              <Megaphone size={18} />
            </span>
            <div className="stat-label">Announcements</div>
            <div className="stat-num">{announcements.length}</div>
            <div className="stat-sub">Community updates</div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="stat-row">
          <div className="stat-box yellow">
            <span className="stat-icon">
              <Clock size={18} />
            </span>
            <div className="stat-label">Avg Response</div>
            <div className="stat-num">{avgResponseTime}h</div>
          </div>
          <div className="stat-box blue">
            <span className="stat-icon">
              <TrendingUp size={18} />
            </span>
            <div className="stat-label">Avg Resolution</div>
            <div className="stat-num">{avgResolutionTime}d</div>
          </div>
          <div className="stat-box green">
            <span className="stat-icon">
              <CheckCircle size={18} />
            </span>
            <div className="stat-label">Completed</div>
            <div className="stat-num">{completedCount}</div>
          </div>
          <div className="stat-box red">
            <span className="stat-icon">
              <AlertCircle size={18} />
            </span>
            <div className="stat-label">Pending</div>
            <div className="stat-num">{pendingCount + pendingComplaints}</div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="charts-grid">
          <div className="chart-card big">
            <div className="chart-header">
              <FileText size={18} />
              Request Submission Trends (6 Months)
            </div>
            <div className="chart-body">
              <BarChart
                data={
                  trendData.length > 0 ? trendData : [12, 18, 14, 22, 18, 25]
                }
                labels={
                  trendLabels.length > 0
                    ? trendLabels
                    : ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"]
                }
              />
            </div>
          </div>

          <div className="chart-card big">
            <div className="chart-header">
              <BarChart3 size={18} />
              Request Status Distribution
            </div>
            <div className="chart-body donut">
              <DonutChart
                segments={[
                  { value: pendingCount, color: "#f59e0b" },
                  { value: inProgressCount, color: "#0ea5e9" },
                  { value: completedCount, color: "#10b981" },
                  { value: rejectedCount, color: "#ef4444" },
                ]}
              />
            </div>
            <div className="status-legend">
              <div className="legend-item">
                <span
                  className="legend-color"
                  style={{ background: "#f59e0b" }}
                ></span>
                <span className="legend-label">Pending ({pendingCount})</span>
              </div>
              <div className="legend-item">
                <span
                  className="legend-color"
                  style={{ background: "#0ea5e9" }}
                ></span>
                <span className="legend-label">
                  In Progress ({inProgressCount})
                </span>
              </div>
              <div className="legend-item">
                <span
                  className="legend-color"
                  style={{ background: "#10b981" }}
                ></span>
                <span className="legend-label">
                  Completed ({completedCount})
                </span>
              </div>
              <div className="legend-item">
                <span
                  className="legend-color"
                  style={{ background: "#ef4444" }}
                ></span>
                <span className="legend-label">Rejected ({rejectedCount})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Complaint Locations & Request Types */}
        <div className="charts-grid">
          <div className="chart-card">
            <div className="chart-header">
              <MapPin size={18} />
              Top Complaint Locations
            </div>
            <div className="chart-body">
              {topLocations.length > 0 ? (
                <div className="location-list">
                  {topLocations.map((loc, idx) => (
                    <div key={idx} className="location-item">
                      <div className="location-rank">#{idx + 1}</div>
                      <div className="location-name">{loc.location}</div>
                      <div className="location-count">{loc.count}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: "2rem",
                    textAlign: "center",
                    color: "#999",
                  }}
                >
                  No complaint data available
                </div>
              )}
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <FileText size={18} />
              Popular Request Types
            </div>
            <div className="chart-body">
              {requestTypes.length > 0 ? (
                <div className="location-list">
                  {requestTypes.map((type, idx) => (
                    <div key={idx} className="location-item">
                      <div className="location-rank">#{idx + 1}</div>
                      <div className="location-name">{type.type}</div>
                      <div className="location-count">{type.count}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: "2rem",
                    textAlign: "center",
                    color: "#999",
                  }}
                >
                  No request data available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live Request Feed */}
        <div className="live-feed">
          <div className="live-header">
            Live Request Feed <span className="badge">REAL-TIME</span>
          </div>
          <div className="feed-list">
            {recentRequests.length > 0 ? (
              recentRequests.map((req) => (
                <div className="feed-item" key={req.id}>
                  <div className="feed-icon">📄</div>
                  <div className="feed-body">
                    <div className="feed-title">{req.subject || "Request"}</div>
                    <div className="feed-sub muted">
                      {req.certificate_type || "Service Request"} •{" "}
                      {new Date(req.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div
                    className={`feed-status ${(
                      req.status ||
                      req.request_status ||
                      "pending"
                    )
                      .toLowerCase()
                      .replace(/[_ ]/g, "-")}`}
                  >
                    {req.status || req.request_status || "Pending"}
                  </div>
                </div>
              ))
            ) : (
              <div className="feed-item">
                <div className="feed-body">
                  <div className="feed-title">No requests yet</div>
                  <div className="feed-sub muted">
                    Requests will appear here
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function CasesOverviewView({
  requests = [],
  complaints = [],
  mediations = [],
  allRequests = [],
  allComplaints = [],
  allMediations = [],
  timeFilter = "month",
  setTimeFilter = () => {},
}) {
  const navigate = useNavigate();
  const [showInsights, setShowInsights] = useState(false);

  const getRequestStatus = (item) =>
    normalizeStatus(item.status || item.request_status);
  const getComplaintStatus = (item) =>
    normalizeStatus(item.status || item.complaint_status);

  const finishedRequests = requests.filter((r) =>
    isFinishedStatus(getRequestStatus(r)),
  ).length;
  const finishedComplaints = complaints.filter((c) =>
    isFinishedStatus(getComplaintStatus(c)),
  ).length;

  const unfinishedRequests = requests.length - finishedRequests;
  const unfinishedComplaints = complaints.length - finishedComplaints;

  const totalCases = requests.length + complaints.length;
  const totalFinished = finishedRequests + finishedComplaints;
  const completionRate =
    totalCases > 0 ? ((totalFinished / totalCases) * 100).toFixed(0) : 0;

  const requestStatusCounts = {
    pending: requests.filter(
      (r) => normalizeStatus(r.status || r.request_status) === "pending",
    ).length,
    inProgress: requests.filter(
      (r) => normalizeStatus(r.status || r.request_status) === "in_progress",
    ).length,
    completed: requests.filter(
      (r) => normalizeStatus(r.status || r.request_status) === "completed",
    ).length,
    rejected: requests.filter(
      (r) => normalizeStatus(r.status || r.request_status) === "rejected",
    ).length,
  };

  const complaintStatusCounts = {
    forReview: complaints.filter(
      (c) => normalizeStatus(c.status || c.complaint_status) === "for_review",
    ).length,
    pending: complaints.filter(
      (c) => normalizeStatus(c.status || c.complaint_status) === "pending",
    ).length,
    resolved: complaints.filter(
      (c) => normalizeStatus(c.status || c.complaint_status) === "resolved",
    ).length,
    rejected: complaints.filter(
      (c) => normalizeStatus(c.status || c.complaint_status) === "rejected",
    ).length,
  };

  const complaintCategoryCounts = {
    blotter: complaints.filter((c) => normalizeStatus(c.category) === "blotter")
      .length,
    forMediation: complaints.filter(
      (c) => normalizeStatus(c.category) === "for_mediation",
    ).length,
    communityConcern: complaints.filter(
      (c) => normalizeStatus(c.category) === "community_concern",
    ).length,
    uncategorized: complaints.filter((c) => !normalizeStatus(c.category))
      .length,
  };

  const mediationAcceptedComplaints = complaints.filter((c) =>
    Boolean(c.mediation_accepted),
  ).length;
  const mediationRecords = mediations;
  const mediationStatusCounts = {
    scheduled: mediationRecords.filter(
      (m) => normalizeStatus(m.status) === "scheduled",
    ).length,
    rescheduled: mediationRecords.filter(
      (m) => normalizeStatus(m.status) === "rescheduled",
    ).length,
    resolved: mediationRecords.filter(
      (m) => normalizeStatus(m.status) === "resolved",
    ).length,
    unresolved: mediationRecords.filter(
      (m) => normalizeStatus(m.status) === "unresolved",
    ).length,
    rejected: mediationRecords.filter(
      (m) => normalizeStatus(m.status) === "rejected",
    ).length,
  };

  const insights = (() => {
    // Get items within period
    const requestsInPeriod = allRequests.filter((r) =>
      isWithinPeriod(r.created_at, timeFilter),
    );
    const complaintsInPeriod = allComplaints.filter((c) =>
      isWithinPeriod(c.created_at, timeFilter),
    );
    const mediationsInPeriod = allMediations.filter((m) =>
      isWithinPeriod(
        m.created_at || m.session_start || m.session_end,
        timeFilter,
      ),
    );

    const insightsList = [];

    // 1. CRITICAL RISK ALERT
    const criticalRisk = findCriticalRiskItems(
      requestsInPeriod,
      complaintsInPeriod,
    );
    if (criticalRisk.totalCritical > 0) {
      insightsList.push(
        `CRITICAL ALERT: ${criticalRisk.totalCritical} item${criticalRisk.totalCritical > 1 ? "s" : ""} critically aged. ${criticalRisk.agingRequests} request${criticalRisk.agingRequests > 1 ? "s" : ""} pending 7+ days, ${criticalRisk.highPriorityComplaints} high-priority complaint${criticalRisk.highPriorityComplaints > 1 ? "s" : ""} unresolved 5+ days. Immediate intervention required.`,
      );
    }

    // 2. AGING CASES
    const agingRequests = findAgingCases(requestsInPeriod, "request_status", 5);
    const agingComplaints = findAgingCases(complaintsInPeriod, "status", 7);
    if (agingRequests.length > 0 || agingComplaints.length > 0) {
      insightsList.push(
        `Backlog Alert: ${agingRequests.length} request${agingRequests.length > 1 ? "s" : ""} pending 5+ days, ${agingComplaints.length} complaint${agingComplaints.length > 1 ? "s" : ""} pending 7+ days. Recommend prioritization.`,
      );
    }

    // 3. HIGH-PRIORITY ITEMS
    const highPriorityRequests = findHighPriorityPending(requestsInPeriod);
    const highPriorityComplaints = findHighPriorityPending(complaintsInPeriod);
    if (highPriorityRequests.length > 0 || highPriorityComplaints.length > 0) {
      insightsList.push(
        `${highPriorityRequests.length + highPriorityComplaints.length} high-priority item${highPriorityRequests.length + highPriorityComplaints.length > 1 ? "s" : ""} require immediate attention. Review and reassign as necessary.`,
      );
    }

    // 4. BOTTLENECK ANALYSIS (Request Types)
    const requestBottlenecks = findBottleneckTypes(
      requestsInPeriod,
      "certificate_type",
      2,
    );
    if (requestBottlenecks.length > 0) {
      const bottleneckStr = requestBottlenecks
        .map((b) => `${b.type} (${b.pendingCount})`)
        .join(", ");
      insightsList.push(
        `Request Bottleneck Identified: ${bottleneckStr} have the highest pending volume. Consider process optimization.`,
      );
    }

    // 5. COMPLAINT BOTTLENECK
    const complaintBottlenecks = findBottleneckTypes(
      complaintsInPeriod,
      "complaint_type",
      1,
    );
    if (complaintBottlenecks.length > 0) {
      insightsList.push(
        `Complaint Category Concentration: ${complaintBottlenecks[0].type} accounts for ${complaintBottlenecks[0].pendingCount} pending cases. Recommend focused resolution strategy.`,
      );
    }

    // 6. RESOLUTION PERFORMANCE
    const avgResolutionDays = calculateAvgResolutionDays(requestsInPeriod);
    if (avgResolutionDays > 0) {
      const trend =
        avgResolutionDays > 7
          ? "increasing (slowing trend detected)"
          : "within acceptable range";
      insightsList.push(
        `Case Resolution Performance: Average ${avgResolutionDays} days to completion, currently ${trend}.`,
      );
    }

    // 7. FIRST RESPONSE TIME
    const avgFirstResponse = calculateAvgFirstResponseTime(complaintsInPeriod);
    if (avgFirstResponse) {
      insightsList.push(
        `Response Efficiency: Average assignment/initial response time is ${avgFirstResponse} from complaint submission.`,
      );
    }

    // 8. BUSIEST DAY PATTERN
    const busiestDay = findBusiestDay([
      ...requestsInPeriod,
      ...complaintsInPeriod,
    ]);
    if (busiestDay && busiestDay.count > 0) {
      insightsList.push(
        `Submission Pattern: ${busiestDay.name} records the highest volume with ${busiestDay.count} submissions. Monitor staffing on peak days.`,
      );
    }

    // 9. REPORTING DELAY (Complaints)
    const delayInsights = findReportingDelayInsights(complaintsInPeriod);
    if (delayInsights) {
      insightsList.push(
        `Reporting Lag Analysis: ${delayInsights.count} complaint${delayInsights.count > 1 ? "s" : ""} reported 3+ days after incident occurrence (average delay: ${delayInsights.avgDelay} days). Consider community awareness initiatives.`,
      );
    }

    // 10. COMPLETION RATE TREND
    const totalCases = requestsInPeriod.length + complaintsInPeriod.length;
    const completedRequests = requestsInPeriod.filter((r) =>
      FINISHED_STATUSES.has(normalizeStatus(r.status || r.request_status)),
    ).length;
    const completedComplaints = complaintsInPeriod.filter((c) =>
      FINISHED_STATUSES.has(normalizeStatus(c.status || c.complaint_status)),
    ).length;
    const completionRate =
      totalCases > 0
        ? Math.round(
            ((completedRequests + completedComplaints) / totalCases) * 100,
          )
        : 0;

    if (completionRate < 50) {
      insightsList.push(
        `Case Completion Rate: ${completionRate}% - Below target. Recommend acceleration measures and resource review.`,
      );
    } else if (completionRate > 75) {
      insightsList.push(
        `Case Completion Rate: ${completionRate}% - Exceeding targets. Current operational efficiency is strong.`,
      );
    }

    // 11. MEDIATION FUNNEL
    const complaintsForMediation = complaintsInPeriod.filter(
      (c) => normalizeStatus(c.category) === "for_mediation",
    ).length;
    const acceptedMediation = complaintsInPeriod.filter((c) =>
      Boolean(c.mediation_accepted),
    ).length;
    if (complaintsForMediation > 0 || acceptedMediation > 0) {
      insightsList.push(
        `Mediation Funnel: ${complaintsForMediation} complaints tagged for mediation, ${acceptedMediation} accepted by involved residents, ${mediationsInPeriod.length} mediation session records in this period.`,
      );
    }

    // 12. MEDIATION OUTCOME
    if (mediationsInPeriod.length > 0) {
      const resolvedCount = mediationsInPeriod.filter(
        (m) => normalizeStatus(m.status) === "resolved",
      ).length;
      const unresolvedCount = mediationsInPeriod.filter(
        (m) => normalizeStatus(m.status) === "unresolved",
      ).length;
      const resolutionRate = Math.round(
        (resolvedCount / mediationsInPeriod.length) * 100,
      );
      insightsList.push(
        `Mediation Outcome: ${resolvedCount}/${mediationsInPeriod.length} resolved (${resolutionRate}%), ${unresolvedCount} unresolved.`,
      );
    }

    // Default message if no insights
    if (insightsList.length === 0) {
      insightsList.push(
        "System Status: All operations within normal parameters. No critical issues detected.",
      );
    }

    return insightsList;
  })();

  const requestTypes = analyzeRequestsByType(requests).slice(0, 5);
  const complaintTypes = analyzeComplaintsByType(complaints).slice(0, 5);

  const trendMap = {};
  const addToTrend = (items, kind) => {
    items.forEach((item) => {
      if (!item.created_at) return;
      const dt = new Date(item.created_at);
      if (Number.isNaN(dt.getTime())) return;

      const key = `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
      if (!trendMap[key]) {
        trendMap[key] = {
          ts: new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime(),
          label: dt.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          requests: 0,
          complaints: 0,
        };
      }
      trendMap[key][kind] += 1;
    });
  };

  addToTrend(requests, "requests");
  addToTrend(complaints, "complaints");

  const trendRows = Object.values(trendMap)
    .sort((a, b) => a.ts - b.ts)
    .slice(-12);

  const trendLabels = trendRows.map((row) => row.label);
  const requestTrendData = trendRows.map((row) => row.requests);
  const complaintTrendData = trendRows.map((row) => row.complaints);

  return (
    <div className="admin-page">
      <section className="analytics">
        <div className="analytics-header">
          <h3>System Analytics Overview</h3>
          <p className="muted">
            Comprehensive barangay services and community insights
          </p>
        </div>

        <div className="stat-row" style={{ marginBottom: "2rem" }}>
          <div className="stat-box yellow">
            <span className="stat-icon">
              <FileText size={18} />
            </span>
            <div className="stat-label">Total Requests</div>
            <div className="stat-num">{requests.length}</div>
            <div className="stat-sub">
              {
                requests.filter(
                  (r) =>
                    normalizeStatus(r.status || r.request_status) ===
                    "completed",
                ).length
              }{" "}
              completed •{" "}
              {
                requests.filter(
                  (r) =>
                    normalizeStatus(r.status || r.request_status) === "pending",
                ).length
              }{" "}
              pending
            </div>
          </div>

          <div className="stat-box red">
            <span className="stat-icon">
              <AlertCircle size={18} />
            </span>
            <div className="stat-label">Complaints</div>
            <div className="stat-num">{complaints.length}</div>
            <div className="stat-sub">
              {
                complaints.filter(
                  (c) => normalizeStatus(c.status) === "resolved",
                ).length
              }{" "}
              resolved •{" "}
              {
                complaints.filter(
                  (c) =>
                    normalizeStatus(c.status) === "in_progress" ||
                    normalizeStatus(c.status) === "investigating",
                ).length
              }{" "}
              active
            </div>
          </div>

          <div className="stat-box blue">
            <span className="stat-icon">
              <Users size={18} />
            </span>
            <div className="stat-label">Accepted Mediations</div>
            <div className="stat-num">{mediationAcceptedComplaints}</div>
            <div className="stat-sub">
              Residents accepted mediation requests
            </div>
          </div>

          <div className="stat-box orange">
            <span className="stat-icon">
              <Megaphone size={18} />
            </span>
            <div className="stat-label">Mediation Sessions</div>
            <div className="stat-num">{mediations.length}</div>
            <div className="stat-sub">
              {mediationStatusCounts.scheduled} scheduled
            </div>
          </div>
        </div>

        <div className="stat-row">
          <div className="stat-box yellow">
            <span className="stat-icon">
              <Clock size={18} />
            </span>
            <div className="stat-label">Avg Response</div>
            <div className="stat-num">
              {calculateAverageResponseTime(requests)}h
            </div>
          </div>
          <div className="stat-box blue">
            <span className="stat-icon">
              <TrendingUp size={18} />
            </span>
            <div className="stat-label">Avg Resolution</div>
            <div className="stat-num">
              {calculateAverageResolutionTime(requests)}d
            </div>
          </div>
          <div className="stat-box green">
            <span className="stat-icon">
              <CheckCircle size={18} />
            </span>
            <div className="stat-label">Completed</div>
            <div className="stat-num">
              {
                requests.filter(
                  (r) =>
                    normalizeStatus(r.status || r.request_status) ===
                    "completed",
                ).length
              }
            </div>
          </div>
          <div className="stat-box red">
            <span className="stat-icon">
              <AlertCircle size={18} />
            </span>
            <div className="stat-label">Pending</div>
            <div className="stat-num">
              {requests.filter(
                (r) =>
                  normalizeStatus(r.status || r.request_status) === "pending",
              ).length +
                complaints.filter(
                  (c) => normalizeStatus(c.status) === "pending",
                ).length}
            </div>
          </div>
        </div>

        <div className="chart-card" style={{ marginBottom: "1rem" }}>
          <div className="chart-header" style={{ color: "#1e3a8a" }}>
            <FileText size={18} />
            Requests Section
          </div>

          <div className="charts-grid" style={{ marginTop: 0 }}>
            <div className="chart-card big">
              <div className="chart-header">
                <BarChart3 size={18} />
                Request Trend ({PERIOD_LABEL_MAP[timeFilter]})
              </div>
              <div className="chart-body">
                {trendRows.length > 0 ? (
                  <BarChart data={requestTrendData} labels={trendLabels} />
                ) : (
                  <div
                    style={{
                      padding: "2rem",
                      textAlign: "center",
                      color: "#999",
                    }}
                  >
                    No request trend data available
                  </div>
                )}
              </div>
            </div>

            <div className="chart-card big">
              <div className="chart-header">
                <TrendingUp size={18} />
                Request Status Distribution
              </div>
              <div className="chart-body donut">
                <DonutChart
                  segments={[
                    { value: requestStatusCounts.pending, color: "#f59e0b" },
                    { value: requestStatusCounts.inProgress, color: "#3b82f6" },
                    { value: requestStatusCounts.completed, color: "#10b981" },
                    { value: requestStatusCounts.rejected, color: "#ef4444" },
                  ]}
                  labels={["Pending", "In Progress", "Completed", "Rejected"]}
                />
              </div>
              <div className="status-legend chart-legend-grid">
                <div className="legend-item">
                  <span
                    className="legend-color"
                    style={{ background: "#f59e0b" }}
                  ></span>
                  <span className="legend-label">
                    Pending ({requestStatusCounts.pending})
                  </span>
                </div>
                <div className="legend-item">
                  <span
                    className="legend-color"
                    style={{ background: "#3b82f6" }}
                  ></span>
                  <span className="legend-label">
                    In Progress ({requestStatusCounts.inProgress})
                  </span>
                </div>
                <div className="legend-item">
                  <span
                    className="legend-color"
                    style={{ background: "#10b981" }}
                  ></span>
                  <span className="legend-label">
                    Completed ({requestStatusCounts.completed})
                  </span>
                </div>
                <div className="legend-item">
                  <span
                    className="legend-color"
                    style={{ background: "#ef4444" }}
                  ></span>
                  <span className="legend-label">
                    Rejected ({requestStatusCounts.rejected})
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="chart-card" style={{ marginTop: "1rem" }}>
            <div className="chart-header">
              <FileText size={18} />
              Popular Request Types
            </div>
            <div className="chart-body">
              {requestTypes.length > 0 ? (
                <div className="location-list">
                  {requestTypes.map((type, idx) => (
                    <div key={idx} className="location-item">
                      <div className="location-rank">#{idx + 1}</div>
                      <div className="location-name">{type.type}</div>
                      <div className="location-count">{type.count}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: "2rem",
                    textAlign: "center",
                    color: "#999",
                  }}
                >
                  No request data available
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="chart-card" style={{ marginBottom: "1rem" }}>
          <div className="chart-header" style={{ color: "#991b1b" }}>
            <MessageSquare size={18} />
            Complaints Section
          </div>

          <div className="stat-row" style={{ marginBottom: "1rem" }}>
            <div className="stat-box yellow">
              <span className="stat-icon">
                <Clock size={18} />
              </span>
              <div className="stat-label">For Review</div>
              <div className="stat-num">{complaintStatusCounts.forReview}</div>
            </div>
            <div className="stat-box blue">
              <span className="stat-icon">
                <AlertCircle size={18} />
              </span>
              <div className="stat-label">Pending</div>
              <div className="stat-num">{complaintStatusCounts.pending}</div>
            </div>
            <div className="stat-box green">
              <span className="stat-icon">
                <CheckCircle size={18} />
              </span>
              <div className="stat-label">Resolved</div>
              <div className="stat-num">{complaintStatusCounts.resolved}</div>
            </div>
            <div className="stat-box red">
              <span className="stat-icon">
                <AlertCircle size={18} />
              </span>
              <div className="stat-label">Rejected</div>
              <div className="stat-num">{complaintStatusCounts.rejected}</div>
            </div>
          </div>

          <div className="charts-grid" style={{ marginTop: 0 }}>
            <div className="chart-card big">
              <div className="chart-header">
                <BarChart3 size={18} />
                Complaint Trend ({PERIOD_LABEL_MAP[timeFilter]})
              </div>
              <div className="chart-body">
                {trendRows.length > 0 ? (
                  <LineChart data={complaintTrendData} labels={trendLabels} />
                ) : (
                  <div
                    style={{
                      padding: "2rem",
                      textAlign: "center",
                      color: "#999",
                    }}
                  >
                    No complaint trend data available
                  </div>
                )}
              </div>
            </div>

            <div className="chart-card big">
              <div className="chart-header">
                <TrendingUp size={18} />
                Complaint Categories
              </div>
              <div className="chart-body donut">
                <DonutChart
                  segments={[
                    {
                      value: complaintCategoryCounts.uncategorized,
                      color: "#94a3b8",
                    },
                    {
                      value: complaintCategoryCounts.blotter,
                      color: "#ef4444",
                    },
                    {
                      value: complaintCategoryCounts.forMediation,
                      color: "#0ea5e9",
                    },
                    {
                      value: complaintCategoryCounts.communityConcern,
                      color: "#10b981",
                    },
                  ]}
                  labels={[
                    "Uncategorized",
                    "Blotter",
                    "For Mediation",
                    "Community Concern",
                  ]}
                />
              </div>
              <div className="status-legend chart-legend-grid">
                <div className="legend-item">
                  <span
                    className="legend-color"
                    style={{ background: "#94a3b8" }}
                  ></span>
                  <span className="legend-label">
                    Uncategorized ({complaintCategoryCounts.uncategorized})
                  </span>
                </div>
                <div className="legend-item">
                  <span
                    className="legend-color"
                    style={{ background: "#ef4444" }}
                  ></span>
                  <span className="legend-label">
                    Blotter ({complaintCategoryCounts.blotter})
                  </span>
                </div>
                <div className="legend-item">
                  <span
                    className="legend-color"
                    style={{ background: "#0ea5e9" }}
                  ></span>
                  <span className="legend-label">
                    For Mediation ({complaintCategoryCounts.forMediation})
                  </span>
                </div>
                <div className="legend-item">
                  <span
                    className="legend-color"
                    style={{ background: "#10b981" }}
                  ></span>
                  <span className="legend-label">
                    Community Concern (
                    {complaintCategoryCounts.communityConcern})
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="charts-grid" style={{ marginTop: "1rem" }}>
            <div className="chart-card">
              <div className="chart-header">
                <MessageSquare size={18} />
                Popular Complaint Types
              </div>
              <div className="chart-body">
                {complaintTypes.length > 0 ? (
                  <div className="location-list">
                    {complaintTypes.map((type, idx) => (
                      <div key={idx} className="location-item">
                        <div className="location-rank">#{idx + 1}</div>
                        <div className="location-name">{type.type}</div>
                        <div className="location-count">{type.count}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "2rem",
                      textAlign: "center",
                      color: "#999",
                    }}
                  >
                    No complaint data available
                  </div>
                )}
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <Users size={18} />
                Mediation Overview
              </div>
              <div className="chart-body">
                <div className="mediation-overview-grid">
                  <div className="mediation-metric-card">
                    <div className="mediation-metric-label">
                      Accepted Complaints
                    </div>
                    <div className="mediation-metric-value">
                      {mediationAcceptedComplaints}
                    </div>
                  </div>
                  <div className="mediation-metric-card">
                    <div className="mediation-metric-label">Scheduled</div>
                    <div className="mediation-metric-value">
                      {mediationStatusCounts.scheduled}
                    </div>
                  </div>
                  <div className="mediation-metric-card">
                    <div className="mediation-metric-label">Resolved</div>
                    <div className="mediation-metric-value">
                      {mediationStatusCounts.resolved}
                    </div>
                  </div>
                  <div className="mediation-metric-card">
                    <div className="mediation-metric-label">Unresolved</div>
                    <div className="mediation-metric-value">
                      {mediationStatusCounts.unresolved}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function OfficialsView({
  officials = [],
  allOfficialsForAttendance = [],
  allRequests = [],
  allComplaints = [],
  allMediations = [],
  timeFilter = "month",
  setTimeFilter = () => {},
  attendanceFilter = "all",
  setAttendanceFilter = () => {},
}) {
  const [showInsights, setShowInsights] = useState(false);

  const officialsInsightData = getOfficialPeriodStats(
    officials,
    allRequests,
    allComplaints,
    timeFilter,
  );

  const officialsInsights = (() => {
    const insightsList = [];
    const officialsList = officials.filter((o) => o.stats?.totalCases > 0);
    const mediationsInPeriod = allMediations.filter((m) =>
      isWithinPeriod(
        m.created_at || m.session_start || m.session_end,
        timeFilter,
      ),
    );
    const trackedOfficialUids = new Set(officials.map((o) => o.auth_uid));
    const mediationForTrackedOfficials = mediationsInPeriod.filter((m) => {
      const assignedUid = m?.complaint?.assigned_official_id;
      return assignedUid && trackedOfficialUids.has(assignedUid);
    });

    // 1. WORKLOAD BALANCE ANALYSIS
    if (officialsList.length > 0) {
      const caseloads = officialsList.map((o) => o.stats?.totalCases || 0);
      const avgCaseload = Math.round(
        caseloads.reduce((a, b) => a + b, 0) / officialsList.length,
      );
      const maxCaseload = Math.max(...caseloads);
      const minCaseload = Math.min(...caseloads);
      const overloaded = officialsList.filter(
        (o) => (o.stats?.totalCases || 0) > avgCaseload * 1.5,
      );

      if (overloaded.length > 0) {
        insightsList.push(
          `Workload Imbalance Detected: ${overloaded.length} official${overloaded.length > 1 ? "s" : ""} carrying excess assignments (avg: ${avgCaseload}, max: ${maxCaseload}). Recommend case reassignment.`,
        );
      } else if (maxCaseload - minCaseload > avgCaseload * 0.5) {
        insightsList.push(
          `Workload Distribution: Case distribution variance detected (range: ${minCaseload} to ${maxCaseload}, avg: ${avgCaseload}). Monitor for optimization opportunities.`,
        );
      } else {
        insightsList.push(
          `Workload Distribution: Case assignments are well-balanced across ${officialsList.length} active officials (avg: ${avgCaseload} per official).`,
        );
      }
    }

    // 2. COMPLETION PERFORMANCE
    const overallCompletionRate = officialsInsightData.current.completionRate;
    if (overallCompletionRate < 40) {
      insightsList.push(
        `Completion Performance Alert: Only ${overallCompletionRate}% case completion rate. Investigate operational bottlenecks and provide necessary support.`,
      );
    } else if (overallCompletionRate > 80) {
      insightsList.push(
        `Completion Performance: ${overallCompletionRate}% completion rate demonstrates strong operational efficiency and target achievement.`,
      );
    } else {
      insightsList.push(
        `Completion Performance: ${overallCompletionRate}% on pace (${officialsInsightData.previous.completionRate}% in previous period).`,
      );
    }

    // 3. BUSIEST OFFICIAL
    if (officialsInsightData.current.busiestOfficial) {
      const busyOfficial = officialsInsightData.current.busiestOfficial;
      insightsList.push(
        `Highest Workload Assignment: ${busyOfficial.name} managing ${busyOfficial.total} case${busyOfficial.total > 1 ? "s" : ""}. Monitor for potential burnout and consider load redistribution.`,
      );
    }

    // 4. ACTIVE OFFICIALS ANALYSIS
    const activeCount = officialsInsightData.current.activeOfficials;
    const activeCountPrev = officialsInsightData.previous.activeOfficials;
    if (activeCount < officials.length * 0.5) {
      insightsList.push(
        `Staffing Utilization: Only ${activeCount} of ${officials.length} officials actively assigned to cases. Assess availability and case distribution.`,
      );
    } else {
      const change = activeCount - activeCountPrev;
      const changeStr =
        change > 0
          ? `increased by ${change}`
          : change < 0
            ? `decreased by ${Math.abs(change)}`
            : "stable";
      insightsList.push(
        `Active Staffing: ${activeCount}/${officials.length} officials engaged in case management (${changeStr} vs previous period).`,
      );
    }

    // 5. CASE VOLUME TREND
    const caseVolChange =
      officialsInsightData.current.totalCases -
      officialsInsightData.previous.totalCases;
    if (caseVolChange > 0) {
      insightsList.push(
        `Case Assignment Volume: ${officialsInsightData.current.totalCases} active assignments this period (increase of ${caseVolChange} vs previous period).`,
      );
    } else if (caseVolChange < 0) {
      insightsList.push(
        `Case Assignment Volume: ${officialsInsightData.current.totalCases} active assignments (decrease of ${Math.abs(caseVolChange)} vs previous period).`,
      );
    }

    // 6. REQUEST VS COMPLAINT HANDLING
    const requestRecords = officials.filter(
      (o) => (o.stats?.totalRequests || 0) > 0,
    ).length;
    const complaintRecords = officials.filter(
      (o) => (o.stats?.totalComplaints || 0) > 0,
    ).length;
    if (requestRecords > 0 || complaintRecords > 0) {
      insightsList.push(
        `Case Type Distribution: ${requestRecords} official${requestRecords > 1 ? "s" : ""} handling requests, ${complaintRecords} official${complaintRecords > 1 ? "s" : ""} handling complaints.`,
      );
    }

    // 7. UNDERPERFORMING OFFICIALS
    const underperforming = officialsList.filter((o) => {
      const rate = parseFloat(o.stats?.completionRate || 0);
      return rate < 50 && (o.stats?.totalCases || 0) > 0;
    });
    if (underperforming.length > 0) {
      const names = underperforming
        .map((o) => o.full_name || `${o.firstname} ${o.lastname}`)
        .join(", ");
      insightsList.push(
        `Performance Intervention Needed: ${names} showing below-target completion rates (<50%). Recommend performance review and coaching.`,
      );
    }

    // 8. PENDING CASES ANALYSIS
    const totalPending = officialsList.reduce(
      (sum, o) => sum + (o.stats?.pendingCases || 0),
      0,
    );
    if (totalPending > 0) {
      const avgPendingPerOfficial = Math.round(
        totalPending / officialsList.length,
      );
      insightsList.push(
        `Pending Workload: ${totalPending} cases in active progress across team (avg ${avgPendingPerOfficial} per official).`,
      );
    }

    // 9. MEDIATION LOAD
    const officialsWithMediationLoad = officials.filter(
      (o) => (o.stats?.mediationCases || 0) > 0,
    ).length;
    const totalMediationCases = officials.reduce(
      (sum, o) => sum + (o.stats?.mediationCases || 0),
      0,
    );
    if (totalMediationCases > 0) {
      insightsList.push(
        `Mediation Caseload: ${totalMediationCases} mediation-linked complaint assignment${totalMediationCases > 1 ? "s" : ""} across ${officialsWithMediationLoad} official${officialsWithMediationLoad > 1 ? "s" : ""}.`,
      );
    }

    // 10. MEDIATION OUTCOME
    if (mediationForTrackedOfficials.length > 0) {
      const resolved = mediationForTrackedOfficials.filter(
        (m) => normalizeStatus(m.status) === "resolved",
      ).length;
      const unresolved = mediationForTrackedOfficials.filter(
        (m) => normalizeStatus(m.status) === "unresolved",
      ).length;
      const resolutionRate = Math.round(
        (resolved / mediationForTrackedOfficials.length) * 100,
      );
      insightsList.push(
        `Mediation Performance: ${resolved}/${mediationForTrackedOfficials.length} resolved (${resolutionRate}%), ${unresolved} unresolved under current official assignments.`,
      );
    }

    // Default message
    if (insightsList.length === 0) {
      insightsList.push(
        "Official Performance: Team metrics within normal parameters. Operations functioning as expected.",
      );
    }

    return insightsList;
  })();

  const totalCases = officials.reduce(
    (sum, o) => sum + (o.stats?.totalCases || 0),
    0,
  );
  const attendancePopulation =
    allOfficialsForAttendance.length > 0
      ? allOfficialsForAttendance
      : officials;
  const totalOfficials = attendancePopulation.length;
  const presentTodayCount = attendancePopulation.filter(
    (o) => o.isPresentToday,
  ).length;
  const timedOutTodayCount = attendancePopulation.filter(
    (o) => o.isTimedOutToday,
  ).length;
  const absentTodayCount =
    totalOfficials - presentTodayCount - timedOutTodayCount;
  const totalMediationCases = attendancePopulation.reduce(
    (sum, o) => sum + (o.stats?.mediationCases || 0),
    0,
  );
  const totalCompleted = officials.reduce(
    (sum, o) => sum + (o.stats?.completedCases || 0),
    0,
  );
  const avgCompletionRate =
    officials.length > 0
      ? (
          officials.reduce(
            (sum, o) => sum + parseFloat(o.stats?.completionRate || 0),
            0,
          ) / officials.length
        ).toFixed(1)
      : 0;

  return (
    <div className="admin-page">
      <div
        className="analytics-header"
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h3>Official Performance Analytics</h3>
          <p className="muted">
            Track workload distribution and performance metrics (
            {PERIOD_LABEL_MAP[timeFilter]})
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
          <button
            onClick={() => setShowInsights((prev) => !prev)}
            style={{
              border: "1px solid #d1d5db",
              backgroundColor: showInsights ? "#eff6ff" : "#ffffff",
              color: "#1f2937",
              borderRadius: "0.5rem",
              padding: "0.5rem 0.75rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {showInsights ? "Hide Insights" : "View Insights"}
          </button>
          <div style={{ minWidth: "180px" }}>
            <label
              htmlFor="official-attendance-filter"
              style={{
                display: "block",
                fontSize: "0.75rem",
                color: "#6b7280",
                marginBottom: "0.25rem",
                fontWeight: 600,
              }}
            >
              Attendance Filter
            </label>
            <select
              id="official-attendance-filter"
              className="official-status-filter-select"
              value={attendanceFilter}
              onChange={(e) => setAttendanceFilter(e.target.value)}
            >
              <option value="all">All Officials</option>
              <option value="present">Present Today</option>
              <option value="timed_out">Timed Out Today</option>
              <option value="absent">Absent Today</option>
            </select>
          </div>
          <TimeFilterDropdown
            timeFilter={timeFilter}
            setTimeFilter={setTimeFilter}
          />
        </div>
      </div>

      {showInsights && (
        <div
          className="chart-card"
          style={{
            marginBottom: "1rem",
            background: "#f8fafc",
            border: "1px solid #dbeafe",
          }}
        >
          <div className="chart-header" style={{ color: "#1d4ed8" }}>
            Insights ({PERIOD_LABEL_MAP[timeFilter]})
          </div>
          <div className="chart-body">
            <div
              style={{
                display: "grid",
                gap: "0.5rem",
                color: "#334155",
                fontSize: "0.92rem",
              }}
            >
              {officialsInsights.map((line, idx) => (
                <div key={idx}>• {line}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {/* choose color for avg completion based on percent */}
      {(() => {
        let avgClass = "yellow";
        if (avgCompletionRate >= 75) avgClass = "green";
        else if (avgCompletionRate < 50) avgClass = "red";
        return (
          <div className="stat-row">
            <div className="stat-box blue">
              <span className="stat-icon">
                <Users size={18} />
              </span>
              <div className="stat-label">Total Officials</div>
              <div className="stat-num">{totalOfficials}</div>
            </div>
            <div className="stat-box green">
              <span className="stat-icon">
                <CheckCircle size={18} />
              </span>
              <div className="stat-label">Present Today</div>
              <div className="stat-num">
                {presentTodayCount}/{totalOfficials}
              </div>
            </div>
            <div className="stat-box red">
              <span className="stat-icon">
                <AlertCircle size={18} />
              </span>
              <div className="stat-label">Absent Today</div>
              <div className="stat-num">{absentTodayCount}</div>
            </div>
            <div className="stat-box yellow">
              <span className="stat-icon">
                <Clock size={18} />
              </span>
              <div className="stat-label">Timed Out Today</div>
              <div className="stat-num">{timedOutTodayCount}</div>
            </div>
            <div className="stat-box">
              <span className="stat-icon">
                <FileText size={18} />
              </span>
              <div className="stat-label">Total Cases</div>
              <div className="stat-num">{totalCases}</div>
            </div>
            <div className="stat-box blue">
              <span className="stat-icon">
                <Users size={18} />
              </span>
              <div className="stat-label">Mediation Cases</div>
              <div className="stat-num">{totalMediationCases}</div>
            </div>
            <div className="stat-box green">
              <span className="stat-icon">
                <CheckCircle size={18} />
              </span>
              <div className="stat-label">Completed</div>
              <div className="stat-num">{totalCompleted}</div>
            </div>
            <div className={`stat-box ${avgClass}`}>
              <span className="stat-icon">
                <TrendingUp size={18} />
              </span>
              <div className="stat-label">Avg Completion</div>
              <div className="stat-num">{avgCompletionRate}%</div>
            </div>
          </div>
        );
      })()}

      {/* Officials Performance Cards */}
      <div className="officials-grid">
        {officials.length > 0 ? (
          officials.map((official) => (
            <div className="official-card" key={official.id}>
              <div className="official-header">
                <div className="official-avatar">
                  {official.firstname?.charAt(0)}
                  {official.lastname?.charAt(0)}
                </div>
                <div className="official-info">
                  <div className="official-name">
                    {official.full_name ||
                      `${official.firstname} ${official.lastname}`}
                  </div>
                  <div className="official-role">
                    {official.role || "Official"}
                  </div>
                  <div
                    className={`official-attendance-chip ${
                      official.isPresentToday
                        ? "present"
                        : official.isTimedOutToday
                          ? "timed-out"
                          : "absent"
                    }`}
                  >
                    {official.isPresentToday
                      ? "Present Today"
                      : official.isTimedOutToday
                        ? "Timed Out Today"
                        : "Absent Today"}
                  </div>
                </div>
              </div>
              <div className="official-stats">
                <div className="official-stat">
                  <div className="stat-value">
                    {official.stats?.totalCases || 0}
                  </div>
                  <div className="stat-label-small">Total Cases</div>
                </div>
                <div className="official-stat">
                  <div className="stat-value">
                    {official.stats?.totalRequests || 0}
                  </div>
                  <div className="stat-label-small">Requests</div>
                </div>
                <div className="official-stat">
                  <div className="stat-value">
                    {official.stats?.totalComplaints || 0}
                  </div>
                  <div className="stat-label-small">Complaints</div>
                </div>
                <div className="official-stat">
                  <div className="stat-value">
                    {official.stats?.completedCases || 0}
                  </div>
                  <div className="stat-label-small">Completed</div>
                </div>
                <div className="official-stat">
                  <div className="stat-value">
                    {official.stats?.pendingCases || 0}
                  </div>
                  <div className="stat-label-small">Pending</div>
                </div>
                {(() => {
                  const rate = parseFloat(official.stats?.completionRate || 0);
                  let cls = "highlight";
                  if (rate >= 75) cls += " good";
                  else if (rate >= 50) cls += " warning";
                  else cls += " bad";
                  return (
                    <div className={`official-stat ${cls}`}>
                      <div className="stat-value">{rate}%</div>
                      <div className="stat-label-small">Completion Rate</div>
                    </div>
                  );
                })()}
              </div>
            </div>
          ))
        ) : (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "#999",
              gridColumn: "1 / -1",
            }}
          >
            <p>No officials data available</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [active, setActive] = useState("Cases");
  const [timeFilter, setTimeFilter] = useState("month");
  const [requests, setRequests] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [mediations, setMediations] = useState([]);
  const [officials, setOfficials] = useState([]);
  const [officialAttendanceToday, setOfficialAttendanceToday] = useState({
    attendanceDate: null,
    recordsByOfficialId: {},
    presentOfficialIds: [],
  });
  const [officialAttendanceFilter, setOfficialAttendanceFilter] =
    useState("all");
  const [announcements, setAnnouncements] = useState([]);
  const [residentStats, setResidentStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sample data for demonstration when DB is empty
  const SAMPLE_REQUESTS = [
    {
      id: 1,
      subject: "Certificate of Indigency Request",
      certificate_type: "Indigency Certificate",
      request_status: "in_progress",
      requester_name: "Maria Santos",
      created_at: "2026-02-10T10:30:00",
      description: "Poverty certification",
    },
    {
      id: 2,
      subject: "Barangay Clearance Application",
      certificate_type: "Barangay Clearance",
      request_status: "completed",
      requester_name: "Juan Dela Cruz",
      created_at: "2026-02-15T14:20:00",
      description: "Employment requirement",
    },
    {
      id: 3,
      subject: "Business Permit Application",
      certificate_type: "Business Permit",
      request_status: "pending",
      requester_name: "Ana Garcia",
      created_at: "2026-02-18T09:15:00",
      description: "Small business registration",
    },
    {
      id: 4,
      subject: "Certificate of Residency",
      certificate_type: "Residency Certificate",
      request_status: "in_progress",
      requester_name: "Pedro Montoya",
      created_at: "2026-02-12T16:45:00",
      description: "Proof of residency",
    },
    {
      id: 5,
      subject: "Barangay ID Application",
      certificate_type: "Barangay ID",
      request_status: "completed",
      requester_name: "Rosa Magsaysay",
      created_at: "2026-02-08T11:00:00",
      description: "ID request",
    },
  ];

  const SAMPLE_COMPLAINTS = [
    {
      id: 1,
      complainant_name: "Jose Rizal",
      complaint_type: "Noise Complaint",
      incident_location: "Purok 1, Main Street",
      status: "pending",
      priority_level: "high",
      created_at: "2026-02-20T08:00:00",
    },
    {
      id: 2,
      complainant_name: "Andres Bonifacio",
      complaint_type: "Illegal Dumping",
      incident_location: "Purok 2, Riverside",
      status: "investigating",
      priority_level: "medium",
      created_at: "2026-02-19T14:30:00",
    },
    {
      id: 3,
      complainant_name: "Emilio Aguinaldo",
      complaint_type: "Street Light Out",
      incident_location: "Purok 1, Corner Street",
      status: "resolved",
      priority_level: "low",
      created_at: "2026-02-18T19:00:00",
    },
    {
      id: 4,
      complainant_name: "Apolinario Mabini",
      complaint_type: "Stray Animals",
      incident_location: "Purok 3, Market Area",
      status: "in_progress",
      priority_level: "medium",
      created_at: "2026-02-17T10:00:00",
    },
  ];

  // Fetch all data on component mount
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch requests using analytics function
        const requestsResult = await getAllRequests();
        if (
          requestsResult.success &&
          Array.isArray(requestsResult.data) &&
          requestsResult.data.length > 0
        ) {
          setRequests(requestsResult.data);
        } else {
          setRequests(SAMPLE_REQUESTS);
        }

        // Fetch complaints
        const complaintsResult = await getAllComplaints();
        if (
          complaintsResult.success &&
          Array.isArray(complaintsResult.data) &&
          complaintsResult.data.length > 0
        ) {
          setComplaints(complaintsResult.data);
        } else {
          setComplaints(SAMPLE_COMPLAINTS);
        }

        // Fetch officials with stats
        const officialsResult = await getOfficialsWithStats();
        if (officialsResult.success && Array.isArray(officialsResult.data)) {
          setOfficials(officialsResult.data);
        }

        // Fetch mediations
        const mediationsResult = await getAllMediations();
        if (mediationsResult.success && Array.isArray(mediationsResult.data)) {
          setMediations(mediationsResult.data);
        } else {
          setMediations([]);
        }

        // Fetch today's official attendance
        const attendanceResult = await getOfficialsAttendanceToday();
        if (attendanceResult.success && attendanceResult.data) {
          setOfficialAttendanceToday(attendanceResult.data);
        } else {
          setOfficialAttendanceToday({
            attendanceDate: null,
            recordsByOfficialId: {},
            presentOfficialIds: [],
          });
        }

        // Fetch resident stats
        const residentStatsResult = await getResidentStats();
        if (residentStatsResult.success) {
          setResidentStats(residentStatsResult.data);
        }

        // Fetch announcements
        const announcementsResult = await getAnnouncements();
        if (
          announcementsResult.success &&
          Array.isArray(announcementsResult.data)
        ) {
          setAnnouncements(announcementsResult.data);
        } else {
          setAnnouncements([]);
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Error loading dashboard data");
        setRequests(SAMPLE_REQUESTS);
        setComplaints(SAMPLE_COMPLAINTS);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  const filteredRequests = requests.filter((request) =>
    isWithinPeriod(request.created_at, timeFilter),
  );

  const filteredComplaints = complaints.filter((complaint) =>
    isWithinPeriod(complaint.created_at, timeFilter),
  );

  const filteredMediations = mediations.filter((mediation) =>
    isWithinPeriod(
      mediation.created_at || mediation.session_start || mediation.session_end,
      timeFilter,
    ),
  );

  const filteredOfficials = officials.map((official) => {
    const officialRequests = filteredRequests.filter(
      (request) => request.assigned_official_id === official.auth_uid,
    );
    const officialComplaints = filteredComplaints.filter(
      (complaint) => complaint.assigned_official_id === official.auth_uid,
    );

    const totalRequests = officialRequests.length;
    const totalComplaints = officialComplaints.length;
    const totalCases = totalRequests + totalComplaints;

    const completedRequests = officialRequests.filter(
      (request) =>
        request.status === "completed" ||
        request.request_status === "completed",
    ).length;
    const completedComplaints = officialComplaints.filter(
      (complaint) =>
        complaint.status === "resolved" || complaint.status === "completed",
    ).length;
    const completedCases = completedRequests + completedComplaints;

    const pendingRequests = officialRequests.filter(
      (request) =>
        request.status === "pending" || request.request_status === "pending",
    ).length;
    const pendingComplaints = officialComplaints.filter(
      (complaint) => complaint.status === "pending",
    ).length;
    const pendingCases = pendingRequests + pendingComplaints;

    const mediationCaseIds = new Set(
      filteredMediations
        .filter((mediation) => {
          const mediationAssignedUid =
            mediation?.complaint?.assigned_official_id;
          if (mediationAssignedUid) {
            return mediationAssignedUid === official.auth_uid;
          }

          const sourceComplaint = complaints.find(
            (c) => c.id === mediation?.complaint_id,
          );
          return sourceComplaint?.assigned_official_id === official.auth_uid;
        })
        .map((mediation) => mediation?.complaint_id)
        .filter(Boolean),
    );
    const mediationCases = mediationCaseIds.size;

    const officialId = official.official_id || official.id;
    const attendanceRecord =
      officialAttendanceToday.recordsByOfficialId?.[officialId];
    const hasTimeIn = Boolean(attendanceRecord?.time_in);
    const hasTimeOut = Boolean(attendanceRecord?.time_out);
    const isPresentToday = hasTimeIn && !hasTimeOut;
    const isTimedOutToday = hasTimeIn && hasTimeOut;

    return {
      ...official,
      stats: {
        totalRequests,
        totalComplaints,
        mediationCases,
        totalCases,
        completedCases,
        pendingCases,
        completionRate:
          totalCases > 0 ? ((completedCases / totalCases) * 100).toFixed(1) : 0,
      },
      attendanceRecord,
      isPresentToday,
      isTimedOutToday,
    };
  });

  const attendanceFilteredOfficials = filteredOfficials.filter((official) => {
    if (officialAttendanceFilter === "present") {
      return official.isPresentToday;
    }
    if (officialAttendanceFilter === "timed_out") {
      return official.isTimedOutToday;
    }
    if (officialAttendanceFilter === "absent") {
      return !official.isPresentToday && !official.isTimedOutToday;
    }
    return true;
  });

  // Render appropriate view based on active tab
  let Content = null;
  if (active === "Cases") {
    Content = (
      <CasesOverviewView
        requests={filteredRequests}
        complaints={filteredComplaints}
        mediations={filteredMediations}
        allRequests={requests}
        allComplaints={complaints}
        allMediations={mediations}
        timeFilter={timeFilter}
        setTimeFilter={setTimeFilter}
      />
    );
  } else if (active === "Officials") {
    Content = (
      <OfficialsView
        officials={attendanceFilteredOfficials}
        allOfficialsForAttendance={filteredOfficials}
        allRequests={requests}
        allComplaints={complaints}
        allMediations={mediations}
        timeFilter={timeFilter}
        setTimeFilter={setTimeFilter}
        attendanceFilter={officialAttendanceFilter}
        setAttendanceFilter={setOfficialAttendanceFilter}
      />
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="admin-dashboard-wrapper">
        <HorizontalTabs active={active} setActive={setActive} />
        <div className="admin-content">
          <div style={{ padding: "4rem", textAlign: "center" }}>
            <div className="loading-wrap">
              <div className="loading-spinner" aria-hidden="true"></div>
              <div className="loading-text">Loading...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-wrapper">
      <HorizontalTabs active={active} setActive={setActive} />
      <div className="admin-content">{Content}</div>
    </div>
  );
}

// Horizontal Tabs Component
function HorizontalTabs({ active, setActive }) {
  const tabs = [
    { name: "Cases", icon: BarChart3 },
    { name: "Officials", icon: Users },
  ];

  return (
    <div className="horizontal-tabs">
      <div className="tabs-container">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.name}
              className={`tab-item ${active === tab.name ? "active" : ""}`}
              onClick={() => setActive(tab.name)}
            >
              <span className="tab-icon">
                <Icon size={18} />
              </span>
              <span className="tab-label">{tab.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
