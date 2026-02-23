import React, { useState, useRef, useEffect } from "react";
import {
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  TrendingUp,
  MapPin,
  Users,
  FileText,
  MessageSquare,
  BarChart3,
} from "lucide-react";
import "../../styles/BarangayAdmin.css";
import {
  getAllComplaints,
  getAllRequests,
  getOfficialsWithStats,
  getRequestTrends,
  getComplaintTrends,
  getResidentStats,
  analyzeComplaintsByLocation,
  analyzeComplaintsByType,
  analyzeRequestsByType,
  calculateAverageResponseTime,
  calculateAverageResolutionTime,
} from "../../supabse_db/analytics/analytics";
import { getAnnouncements } from "../../supabse_db/announcement/announcement";

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

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

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
        <path d={pathD} stroke="#3b82f6" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
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

        {/* Top Summary Cards */}
        <div className="top-cards">
          <div className="large-card">
            <div className="large-card-left">
              <div className="large-card-title">Total Requests</div>
              <div className="large-card-number">{totalRequests}</div>
              <div className="large-card-sub">
                {completedCount} completed • {pendingCount} pending
              </div>
            </div>
            <div className="large-card-icon">
              <div className="icon-pill">📄</div>
            </div>
          </div>

          <div className="large-card">
            <div className="large-card-left">
              <div className="large-card-title">Complaints</div>
              <div className="large-card-number">{totalComplaints}</div>
              <div className="large-card-sub">
                {resolvedComplaints} resolved • {activeComplaints} active
              </div>
            </div>
            <div className="large-card-icon">
              <div className="icon-pill red">⚠️</div>
            </div>
          </div>

          <div className="large-card">
            <div className="large-card-left">
              <div className="large-card-title">Active Residents</div>
              <div className="large-card-number">
                {residentStats.activeResidents || 0}
              </div>
              <div className="large-card-sub">
                {residentStats.totalHouseholds || 0} households registered
              </div>
            </div>
            <div className="large-card-icon">
              <div className="icon-pill blue">👥</div>
            </div>
          </div>

          <div className="large-card">
            <div className="large-card-left">
              <div className="large-card-title">Announcements</div>
              <div className="large-card-number">{announcements.length}</div>
              <div className="large-card-sub">Community updates</div>
            </div>
            <div className="large-card-icon">
              <div className="icon-pill orange">📣</div>
            </div>
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
                    className={`feed-status ${(req.status || req.request_status || "pending").toLowerCase().replace(" ", "-")}`}
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

function ComplaintsView({ complaints = [] }) {
  const locationStats = analyzeComplaintsByLocation(complaints);
  const typeStats = analyzeComplaintsByType(complaints);

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
    .sort(
      (a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    )
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
      <div className="analytics-header">
        <h3>Complaints Analytics</h3>
        <p className="muted">Monitor and analyze community complaints</p>
      </div>

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

      {/* Complaints Table */}
      <div style={{ marginTop: "2rem" }}>
        <h4>All Complaints</h4>
        <div className="table" style={{ overflowX: "auto" }}>
          <div
            className="table-row table-head"
            style={{ gridTemplateColumns: "repeat(7, 1fr)" }}
          >
            <div>ID</div>
            <div>Complainant</div>
            <div>Type</div>
            <div>Location</div>
            <div>Status</div>
            <div>Priority</div>
            <div>Date</div>
          </div>
          {complaints.length > 0 ? (
            complaints.map((c) => (
              <div
                className="table-row"
                key={c.id}
                style={{ gridTemplateColumns: "repeat(7, 1fr)" }}
              >
                <div>#{c.id}</div>
                <div
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.complainant_name || "Unknown"}
                </div>
                <div
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.complaint_type || "General"}
                </div>
                <div
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {(c.incident_location || "Unknown").substring(0, 20)}
                </div>
                <div>
                  <span
                    className={`status ${(c.status || "pending").toLowerCase().replace(" ", "_")}`}
                  >
                    {c.status || "Pending"}
                  </span>
                </div>
                <div style={{ textAlign: "center" }}>
                  {c.priority_level || "Normal"}
                </div>
                <div style={{ textAlign: "center" }}>
                  {new Date(c.created_at).toLocaleDateString()}
                </div>
              </div>
            ))
          ) : (
            <div
              style={{ padding: "2rem", textAlign: "center", color: "#999" }}
            >
              <p>No complaints yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OfficialsView({ officials = [] }) {
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
      <div className="analytics-header">
        <h3>Official Performance Analytics</h3>
        <p className="muted">
          Track workload distribution and performance metrics
        </p>
      </div>

      {/* Summary Stats */}
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
        <div className="stat-box yellow">
          <span className="stat-icon">
            <TrendingUp size={18} />
          </span>
          <div className="stat-label">Avg Completion</div>
          <div className="stat-num">{avgCompletionRate}%</div>
        </div>
      </div>

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
                <div className="official-stat highlight">
                  <div className="stat-value">
                    {official.stats?.completionRate || 0}%
                  </div>
                  <div className="stat-label-small">Completion Rate</div>
                </div>
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

      {/* Performance Table */}
      <div style={{ marginTop: "2rem" }}>
        <h4>Performance Summary Table</h4>
        <div className="table" style={{ overflowX: "auto" }}>
          <div
            className="table-row table-head"
            style={{ gridTemplateColumns: "repeat(8, 1fr)" }}
          >
            <div>Name</div>
            <div>Role</div>
            <div>Requests</div>
            <div>Complaints</div>
            <div>Total Cases</div>
            <div>Completed</div>
            <div>Pending</div>
            <div>Completion Rate</div>
          </div>
          {officials.map((o) => (
            <div
              className="table-row"
              key={o.id}
              style={{ gridTemplateColumns: "repeat(8, 1fr)" }}
            >
              <div
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {o.full_name || `${o.firstname} ${o.lastname}`}
              </div>
              <div style={{ textAlign: "center" }}>{o.role || "Official"}</div>
              <div style={{ textAlign: "center" }}>
                {o.stats?.totalRequests || 0}
              </div>
              <div style={{ textAlign: "center" }}>
                {o.stats?.totalComplaints || 0}
              </div>
              <div style={{ textAlign: "center" }}>
                {o.stats?.totalCases || 0}
              </div>
              <div style={{ textAlign: "center" }}>
                {o.stats?.completedCases || 0}
              </div>
              <div style={{ textAlign: "center" }}>
                {o.stats?.pendingCases || 0}
              </div>
              <div style={{ textAlign: "center" }}>
                <span
                  className={`status ${parseFloat(o.stats?.completionRate || 0) > 70 ? "completed" : "pending"}`}
                >
                  {o.stats?.completionRate || 0}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [active, setActive] = useState("Overview");
  const [requests, setRequests] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [officials, setOfficials] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [residentStats, setResidentStats] = useState({});
  const [requestTrends, setRequestTrends] = useState([]);
  const [complaintTrends, setComplaintTrends] = useState([]);
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

        // Fetch resident stats
        const residentStatsResult = await getResidentStats();
        if (residentStatsResult.success) {
          setResidentStats(residentStatsResult.data);
        }

        // Fetch trends
        const reqTrendsResult = await getRequestTrends(6);
        if (reqTrendsResult.success) {
          setRequestTrends(reqTrendsResult.data);
        }

        const compTrendsResult = await getComplaintTrends(6);
        if (compTrendsResult.success) {
          setComplaintTrends(compTrendsResult.data);
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

  // Render appropriate view based on active tab
  let Content = null;
  if (active === "Overview") {
    Content = (
      <DashboardView
        requests={requests}
        complaints={complaints}
        announcements={announcements}
        residentStats={residentStats}
        requestTrends={requestTrends}
        complaintTrends={complaintTrends}
      />
    );
  } else if (active === "Complaints") {
    Content = <ComplaintsView complaints={complaints} />;
  } else if (active === "Officials") {
    Content = <OfficialsView officials={officials} />;
  }

  // Loading state
  if (loading) {
    return (
      <div className="admin-dashboard-wrapper">
        <HorizontalTabs active={active} setActive={setActive} />
        <div className="admin-content">
          <div style={{ padding: "4rem", textAlign: "center" }}>
            <div className="loading-spinner">Loading...</div>
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
    { name: "Overview", icon: "📊" },
    { name: "Complaints", icon: "⚠️" },
    { name: "Officials", icon: "👥" },
  ];

  return (
    <div className="horizontal-tabs">
      <div className="tabs-container">
        {tabs.map((tab) => (
          <button
            key={tab.name}
            className={`tab-item ${active === tab.name ? "active" : ""}`}
            onClick={() => setActive(tab.name)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
