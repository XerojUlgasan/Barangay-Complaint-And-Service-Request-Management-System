import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  getAllRequests,
  getOfficialsWithStats,
  getResidentStats,
  analyzeComplaintsByLocation,
  analyzeComplaintsByType,
  analyzeRequestsByType,
  calculateAverageResponseTime,
  calculateAverageResolutionTime,
} from "../../supabse_db/analytics/analytics";
import { getAnnouncements } from "../../supabse_db/announcement/announcement";

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

  const arcs = segments.map((seg, idx) => {
    const frac = seg.value / total;
    const start = angle;
    const end = angle + frac * 360;
    angle = end;
    const large = end - start > 180 ? 1 : 0;
    const sx = cx + r * Math.cos((Math.PI / 180) * start);
    const sy = cy + r * Math.sin((Math.PI / 180) * start);
    const ex = cx + r * Math.cos((Math.PI / 180) * end);
    const ey = cy + r * Math.sin((Math.PI / 180) * end);
    const d = `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`;
    return {
      d,
      color: seg.color || "#ccc",
      value: seg.value,
      label: labels[idx] || "",
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

function ComplaintsView({
  complaints = [],
  allComplaints = [],
  timeFilter = "month",
  setTimeFilter = () => {},
}) {
  const [showInsights, setShowInsights] = useState(false);

  const locationStats = analyzeComplaintsByLocation(complaints);
  const typeStats = analyzeComplaintsByType(complaints);

  const complaintInsights = (() => {
    const windows = getComparisonWindows(timeFilter);

    const currentTotal = countItemsInRange(
      allComplaints,
      windows.currentStart,
      windows.currentEnd,
    );
    const previousTotal = countItemsInRange(
      allComplaints,
      windows.previousStart,
      windows.previousEnd,
    );

    const currentResolved = allComplaints.filter((c) => {
      const date = new Date(c.created_at);
      if (Number.isNaN(date.getTime())) return false;
      const resolved = c.status === "resolved" || c.status === "completed";
      return (
        resolved && date >= windows.currentStart && date <= windows.currentEnd
      );
    }).length;

    const previousResolved = allComplaints.filter((c) => {
      const date = new Date(c.created_at);
      if (Number.isNaN(date.getTime())) return false;
      const resolved = c.status === "resolved" || c.status === "completed";
      return (
        resolved && date >= windows.previousStart && date <= windows.previousEnd
      );
    }).length;

    const currentPending = allComplaints.filter((c) => {
      const date = new Date(c.created_at);
      if (Number.isNaN(date.getTime())) return false;
      return (
        c.status === "pending" &&
        date >= windows.currentStart &&
        date <= windows.currentEnd
      );
    }).length;

    return [
      formatDeltaText(
        currentTotal,
        previousTotal,
        "complaints",
        windows.previousLabel,
      ),
      formatDeltaText(
        currentResolved,
        previousResolved,
        "resolved complaints",
        windows.previousLabel,
      ),
      currentPending > 0
        ? `${currentPending} complaint${currentPending > 1 ? "s" : ""} are still pending in this period.`
        : "No pending complaints in this period.",
    ];
  })();

  // Aggregate complaints by date for line chart
  const complaintsByDate = complaints.reduce((acc, complaint) => {
    const dateStr = new Date(complaint.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const existing = acc.find((item) => item.date === dateStr);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ date: dateStr, count: 1 });
    }
    return acc;
  }, []);

  // Sort by date and get last 12 dates
  const sortedByDate = complaintsByDate
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-12);

  const pendingCount = complaints.filter((c) => c.status === "pending").length;
  const activeCount = complaints.filter(
    (c) => c.status === "in_progress" || c.status === "investigating",
  ).length;
  const resolvedCount = complaints.filter(
    (c) => c.status === "resolved" || c.status === "completed",
  ).length;

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
          <h3>Complaints Analytics</h3>
          <p className="muted">
            Monitor and analyze community complaints (
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
              {complaintInsights.map((line, idx) => (
                <div key={idx}>• {line}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="stat-row">
        <div className="stat-box yellow">
          <span className="stat-icon">
            <Clock size={18} />
          </span>
          <div className="stat-label">Pending</div>
          <div className="stat-num">{pendingCount}</div>
        </div>
        <div className="stat-box blue">
          <span className="stat-icon">
            <AlertCircle size={18} />
          </span>
          <div className="stat-label">Active</div>
          <div className="stat-num">{activeCount}</div>
        </div>
        <div className="stat-box green">
          <span className="stat-icon">
            <CheckCircle size={18} />
          </span>
          <div className="stat-label">Resolved</div>
          <div className="stat-num">{resolvedCount}</div>
        </div>
        <div className="stat-box">
          <span className="stat-icon">
            <MessageSquare size={18} />
          </span>
          <div className="stat-label">Total</div>
          <div className="stat-num">{complaints.length}</div>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="charts-grid">
        <div className="chart-card big">
          <div className="chart-header">
            <BarChart3 size={18} />
            Complaints Over Time
          </div>
          <div className="chart-body">
            {sortedByDate.length > 0 ? (
              <LineChart
                data={sortedByDate.map((d) => d.count)}
                labels={sortedByDate.map((d) => d.date)}
              />
            ) : (
              <div
                style={{ padding: "2rem", textAlign: "center", color: "#999" }}
              >
                No complaint data available
              </div>
            )}
          </div>
        </div>

        <div className="chart-card big">
          <div className="chart-header">
            <BarChart3 size={18} />
            Complaints by Type Distribution
          </div>
          <div className="chart-body donut">
            {typeStats.length > 0 ? (
              <DonutChart
                segments={typeStats.slice(0, 4).map((t, idx) => ({
                  value: t.count,
                  color: ["#f59e0b", "#0ea5e9", "#10b981", "#ef4444"][idx],
                }))}
                labels={typeStats.slice(0, 4).map((t) => t.type)}
              />
            ) : (
              <div
                style={{ padding: "2rem", textAlign: "center", color: "#999" }}
              >
                No data
              </div>
            )}
          </div>
          {typeStats.length > 0 && (
            <div className="status-legend">
              {typeStats.slice(0, 4).map((t, idx) => (
                <div key={idx} className="legend-item">
                  <span
                    className="legend-color"
                    style={{
                      background: ["#f59e0b", "#0ea5e9", "#10b981", "#ef4444"][
                        idx
                      ],
                    }}
                  ></span>
                  <span className="legend-label">
                    {t.type} ({t.count})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Complaints Feed */}
      <div className="live-feed">
        <div
          className="live-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div>
            All Complaints <span className="badge">REAL-TIME</span>
          </div>
          <Link
            to="/BarangayAdmin/complaints"
            style={{
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "#2563eb",
              textDecoration: "none",
            }}
          >
            View More
          </Link>
        </div>
        <div className="feed-list">
          {complaints.length > 0 ? (
            complaints.slice(0, 10).map((c) => (
              <div className="feed-item" key={c.id}>
                <div className="feed-icon">🚨</div>
                <div className="feed-body">
                  <div className="feed-title">
                    {c.complaint_type || "Complaint"}
                  </div>
                  <div className="feed-sub muted">
                    {c.incident_location || "Unknown Location"} •{" "}
                    {new Date(c.created_at).toLocaleDateString()}
                  </div>
                  <div
                    className="feed-sub"
                    style={{
                      marginTop: "0.25rem",
                      fontSize: "0.85rem",
                      color: "#666",
                    }}
                  >
                    {c.complainant_name || "Unknown"}
                  </div>
                </div>
                <div
                  className={`feed-status ${(c.status || "pending")
                    .toLowerCase()
                    .replace(/[_ ]/g, "-")}`}
                >
                  {c.status || "Pending"}
                </div>
              </div>
            ))
          ) : (
            <div className="feed-item">
              <div className="feed-body">
                <div className="feed-title">No complaints yet</div>
                <div className="feed-sub muted">
                  Complaints will appear here
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RequestsView({
  requests = [],
  complaints = [],
  allRequests = [],
  allComplaints = [],
  timeFilter = "month",
  setTimeFilter = () => {},
  feedSearch = "",
  setFeedSearch = () => {},
  feedFilterType = "all",
  setFeedFilterType = () => {},
  feedFilterStatus = "all",
  setFeedFilterStatus = () => {},
  feedSortBy = "newest",
  setFeedSortBy = () => {},
}) {
  const navigate = useNavigate();
  const [showInsights, setShowInsights] = useState(false);

  const requestInsights = (() => {
    const windows = getComparisonWindows(timeFilter);

    const currentTotal = countItemsInRange(
      allRequests,
      windows.currentStart,
      windows.currentEnd,
    );
    const previousTotal = countItemsInRange(
      allRequests,
      windows.previousStart,
      windows.previousEnd,
    );

    const currentCompleted = allRequests.filter((r) => {
      const date = new Date(r.created_at);
      if (Number.isNaN(date.getTime())) return false;
      const completed =
        r.status === "completed" || r.request_status === "completed";
      return (
        completed && date >= windows.currentStart && date <= windows.currentEnd
      );
    }).length;

    const previousCompleted = allRequests.filter((r) => {
      const date = new Date(r.created_at);
      if (Number.isNaN(date.getTime())) return false;
      const completed =
        r.status === "completed" || r.request_status === "completed";
      return (
        completed &&
        date >= windows.previousStart &&
        date <= windows.previousEnd
      );
    }).length;

    const currentPending = allRequests.filter((r) => {
      const date = new Date(r.created_at);
      if (Number.isNaN(date.getTime())) return false;
      const pending = r.status === "pending" || r.request_status === "pending";
      return (
        pending && date >= windows.currentStart && date <= windows.currentEnd
      );
    }).length;

    return [
      formatDeltaText(
        currentTotal,
        previousTotal,
        "requests",
        windows.previousLabel,
      ),
      formatDeltaText(
        currentCompleted,
        previousCompleted,
        "completed requests",
        windows.previousLabel,
      ),
      currentPending > 0
        ? `${currentPending} request${currentPending > 1 ? "s" : ""} are still pending in this period.`
        : "No pending requests in this period.",
    ];
  })();

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

  // Calculate performance metrics
  const avgResponseTime = calculateAverageResponseTime(requests);
  const avgResolutionTime = calculateAverageResolutionTime(requests);

  // Get request types breakdown
  const requestTypes = analyzeRequestsByType(requests).slice(0, 5);

  // Combined feed: requests and complaints
  const combinedFeed = [
    ...requests.map((item) => ({
      ...item,
      type: "request",
      title: item.subject || "Request",
      subtype: item.certificate_type || "Service Request",
      status: item.status || item.request_status || "pending",
      date: item.created_at,
    })),
    ...complaints.map((item) => ({
      ...item,
      type: "complaint",
      title: item.subject || "Complaint",
      subtype: item.complaint_type || "General Complaint",
      status: item.status || item.complaint_status || "pending",
      date: item.created_at,
    })),
  ].sort((a, b) => {
    const da = new Date(a.date).getTime() || 0;
    const db = new Date(b.date).getTime() || 0;
    return db - da;
  });

  const filteredFeed = combinedFeed
    .filter((item) => {
      const search = feedSearch.trim().toLowerCase();
      if (feedFilterType !== "all" && item.type !== feedFilterType) {
        return false;
      }
      if (feedFilterStatus !== "all" && item.status.toLowerCase() !== feedFilterStatus.toLowerCase()) {
        return false;
      }
      if (!search) return true;
      return [item.title, item.subtype, item.status]
        .join(" ")
        .toLowerCase()
        .includes(search);
    })
    .sort((a, b) => {
      if (feedSortBy === "oldest") {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

  const liveFeedItems = filteredFeed.slice(0, 5);

  // Build monthly trend chart from currently filtered requests
  const monthlyTrendsMap = requests.reduce((acc, request) => {
    if (!request.created_at) return acc;

    const createdAt = new Date(request.created_at);
    if (Number.isNaN(createdAt.getTime())) return acc;

    const key = `${createdAt.getFullYear()}-${createdAt.getMonth()}`;
    const label = createdAt.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });

    if (!acc[key]) {
      acc[key] = { label, count: 0, ts: createdAt.getTime() };
    }
    acc[key].count += 1;
    return acc;
  }, {});

  const monthlyTrends = Object.values(monthlyTrendsMap)
    .sort((a, b) => a.ts - b.ts)
    .slice(-6);

  const trendLabels = monthlyTrends.map((t) => t.label);
  const trendData = monthlyTrends.map((t) => t.count);

  // Aggregate requests by date for line chart
  const requestsByDate = requests.reduce((acc, request) => {
    const dateStr = new Date(request.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const existing = acc.find((item) => item.date === dateStr);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ date: dateStr, count: 1 });
    }
    return acc;
  }, []);

  const sortedByDate = requestsByDate
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-12);

  return (
    <div className="admin-page">
      <section className="analytics">
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
            <h3>Requests Analytics</h3>
            <p className="muted">
              Monitor and analyze service requests (
              {PERIOD_LABEL_MAP[timeFilter]})
            </p>
          </div>
          <div
            style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}
          >
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
                {requestInsights.map((line, idx) => (
                  <div key={idx}>• {line}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Summary Stats */}
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

          <div className="stat-box blue">
            <span className="stat-icon">
              <Clock size={18} />
            </span>
            <div className="stat-label">Pending</div>
            <div className="stat-num">{pendingCount}</div>
            <div className="stat-sub">Awaiting processing</div>
          </div>

          <div className="stat-box orange">
            <span className="stat-icon">
              <AlertCircle size={18} />
            </span>
            <div className="stat-label">In Progress</div>
            <div className="stat-num">{inProgressCount}</div>
            <div className="stat-sub">Currently being processed</div>
          </div>

          <div className="stat-box green">
            <span className="stat-icon">
              <CheckCircle size={18} />
            </span>
            <div className="stat-label">Completed</div>
            <div className="stat-num">{completedCount}</div>
            <div className="stat-sub">Successfully fulfilled</div>
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
            <div className="stat-label">Completion Rate</div>
            <div className="stat-num">
              {totalRequests > 0
                ? ((completedCount / totalRequests) * 100).toFixed(0)
                : 0}
              %
            </div>
          </div>
          <div className="stat-box red">
            <span className="stat-icon">
              <AlertCircle size={18} />
            </span>
            <div className="stat-label">Rejected</div>
            <div className="stat-num">{rejectedCount}</div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="charts-grid">
          <div className="chart-card big">
            <div className="chart-header">
              <FileText size={18} />
              Request Submission Trends
            </div>
            <div className="chart-body">
              {trendData.length > 0 ? (
                <BarChart data={trendData} labels={trendLabels} />
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

        {/* Time Series and Request Types */}
        <div className="charts-grid">
          <div className="chart-card big">
            <div className="chart-header">
              <BarChart3 size={18} />
              Requests Over Time (Last 12 Days)
            </div>
            <div className="chart-body">
              {sortedByDate.length > 0 ? (
                <LineChart
                  data={sortedByDate.map((d) => d.count)}
                  labels={sortedByDate.map((d) => d.date)}
                />
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

        {/* Live Requests and Complaints */}
        <div className="live-feed">
          <div
            className="live-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div>
              Live Requests and Complaints <span className="badge">REAL-TIME</span>
            </div>
            {/* Search, Filter, Sort Controls */}
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Search..."
                value={feedSearch}
                onChange={(e) => setFeedSearch(e.target.value)}
                style={{
                  padding: "0.5rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                  width: "150px",
                }}
              />
              <select
                value={feedFilterType}
                onChange={(e) => setFeedFilterType(e.target.value)}
                style={{
                  padding: "0.5rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                }}
              >
                <option value="all">All Types</option>
                <option value="request">Requests</option>
                <option value="complaint">Complaints</option>
              </select>
              <select
                value={feedFilterStatus}
                onChange={(e) => setFeedFilterStatus(e.target.value)}
                style={{
                  padding: "0.5rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                }}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
              <select
                value={feedSortBy}
                onChange={(e) => setFeedSortBy(e.target.value)}
                style={{
                  padding: "0.5rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>
          <div className="feed-list">
            {liveFeedItems.length > 0 ? (
              liveFeedItems.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="feed-item"
                  onClick={() => {
                    const path =
                      item.type === "request"
                        ? "/BarangayAdmin/requests"
                        : "/BarangayAdmin/complaints";
                    navigate(path, {
                      state: { selectedItemId: item.id },
                    });
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <div className="feed-icon">
                    {item.type === "request" ? "📄" : "⚠️"}
                  </div>
                  <div className="feed-body">
                    <div className="feed-title">{item.title}</div>
                    <div className="feed-sub muted">
                      {item.subtype} •{" "}
                      {new Date(item.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div
                    className={`feed-status ${item.status
                      .toLowerCase()
                      .replace(/[_ ]/g, "-")}`}
                  >
                    {item.status}
                  </div>
                </div>
              ))
            ) : (
              <div className="feed-item">
                <div className="feed-body">
                  <div className="feed-title">No items found</div>
                  <div className="feed-sub muted">
                    Try adjusting your search or filters
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

function OfficialsView({
  officials = [],
  allRequests = [],
  allComplaints = [],
  timeFilter = "month",
  setTimeFilter = () => {},
}) {
  const [showInsights, setShowInsights] = useState(false);

  const officialsInsightData = getOfficialPeriodStats(
    officials,
    allRequests,
    allComplaints,
    timeFilter,
  );

  const officialsInsights = [
    formatDeltaText(
      officialsInsightData.current.totalCases,
      officialsInsightData.previous.totalCases,
      "total assigned cases",
      officialsInsightData.previousLabel,
    ),
    formatDeltaText(
      officialsInsightData.current.activeOfficials,
      officialsInsightData.previous.activeOfficials,
      "active officials handling cases",
      officialsInsightData.previousLabel,
    ),
    `Completion rate is ${officialsInsightData.current.completionRate}% this period (${officialsInsightData.previous.completionRate}% in ${officialsInsightData.previousLabel}).`,
    officialsInsightData.current.busiestOfficial
      ? `${officialsInsightData.current.busiestOfficial.name} has the highest workload with ${officialsInsightData.current.busiestOfficial.total} case${officialsInsightData.current.busiestOfficial.total > 1 ? "s" : ""}.`
      : "No assigned official workload recorded for this period.",
  ];

  const totalCases = officials.reduce(
    (sum, o) => sum + (o.stats?.totalCases || 0),
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
              <div className="stat-num">{officials.length}</div>
            </div>
            <div className="stat-box">
              <span className="stat-icon">
                <FileText size={18} />
              </span>
              <div className="stat-label">Total Cases</div>
              <div className="stat-num">{totalCases}</div>
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
  const [active, setActive] = useState("Requests");
  const [timeFilter, setTimeFilter] = useState("month");
  const [requests, setRequests] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [officials, setOfficials] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [residentStats, setResidentStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [feedSearch, setFeedSearch] = useState("");
  const [feedFilterType, setFeedFilterType] = useState("all");
  const [feedFilterStatus, setFeedFilterStatus] = useState("all");
  const [feedSortBy, setFeedSortBy] = useState("newest");

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

    return {
      ...official,
      stats: {
        totalRequests,
        totalComplaints,
        totalCases,
        completedCases,
        pendingCases,
        completionRate:
          totalCases > 0 ? ((completedCases / totalCases) * 100).toFixed(1) : 0,
      },
    };
  });

  // Render appropriate view based on active tab
  let Content = null;
  if (active === "Requests") {
    Content = (
      <RequestsView
        requests={requests}
        complaints={complaints}
        allRequests={requests}
        allComplaints={complaints}
        timeFilter={timeFilter}
        setTimeFilter={setTimeFilter}
        feedSearch={feedSearch}
        setFeedSearch={setFeedSearch}
        feedFilterType={feedFilterType}
        setFeedFilterType={setFeedFilterType}
        feedFilterStatus={feedFilterStatus}
        setFeedFilterStatus={setFeedFilterStatus}
        feedSortBy={feedSortBy}
        setFeedSortBy={setFeedSortBy}
      />
    );
  } else if (active === "Complaints") {
    Content = (
      <ComplaintsView
        complaints={filteredComplaints}
        allComplaints={complaints}
        timeFilter={timeFilter}
        setTimeFilter={setTimeFilter}
      />
    );
  } else if (active === "Officials") {
    Content = (
      <OfficialsView
        officials={filteredOfficials}
        allRequests={requests}
        allComplaints={complaints}
        timeFilter={timeFilter}
        setTimeFilter={setTimeFilter}
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
    { name: "Requests", icon: FileText },
    { name: "Complaints", icon: AlertCircle },
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
