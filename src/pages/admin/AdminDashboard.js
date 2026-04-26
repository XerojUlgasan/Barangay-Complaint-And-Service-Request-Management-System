import React, { useState, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar, Doughnut, Pie } from "react-chartjs-2";
import {
  getAllRequests,
  getAllComplaints,
  getAllSettlements,
  calculateCompletionTimeByType,
  analyzeRequestsByType,
  analyzeIncidentPatterns,
  analyzeComplaintsByType,
  analyzeSettlementSpeed,
  analyzeSettlementDays,
  compareSettlementTypes,
} from "../../supabse_db/analytics/analytics";
import "../../styles/BarangayAdmin.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState("all");
  const [requests, setRequests] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [settlements, setSettlements] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [reqResult, compResult, settResult] = await Promise.all([
      getAllRequests(),
      getAllComplaints(),
      getAllSettlements(),
    ]);

    if (reqResult.success) setRequests(reqResult.data);
    if (compResult.success) setComplaints(compResult.data);
    if (settResult.success) setSettlements(settResult.data);

    setLoading(false);
  };

  const filterByTime = (data, dateField = "created_at") => {
    if (timeFilter === "all") return data;

    const now = new Date();
    const filtered = data.filter((item) => {
      const itemDate = new Date(item[dateField]);
      if (timeFilter === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return itemDate >= weekAgo;
      }
      if (timeFilter === "month") {
        return (
          itemDate.getMonth() === now.getMonth() &&
          itemDate.getFullYear() === now.getFullYear()
        );
      }
      if (timeFilter === "year") {
        return itemDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
    return filtered;
  };

  const filteredRequests = filterByTime(requests);
  const filteredComplaints = filterByTime(complaints);
  const filteredSettlements = filterByTime(settlements);

  // CHART COLORS
  const chartColors = {
    primary: "#3b82f6",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    purple: "#8b5cf6",
    teal: "#14b8a6",
    pink: "#ec4899",
    indigo: "#6366f1",
  };

  // REQUEST METRICS
  const requestStats = {
    total: filteredRequests.length,
    pending: filteredRequests.filter((r) => r.request_status === "pending").length,
    inProgress: filteredRequests.filter((r) => r.request_status === "in_progress").length,
    completed: filteredRequests.filter((r) => r.request_status === "completed").length,
    rejected: filteredRequests.filter((r) => r.request_status === "rejected").length,
  };

  const completionTimeByType = calculateCompletionTimeByType(filteredRequests);
  const requestsByType = analyzeRequestsByType(filteredRequests);

  // Request trends by day
  const requestTrendData = () => {
    const grouped = {};
    filteredRequests.forEach((req) => {
      const date = new Date(req.created_at);
      let key;
      if (timeFilter === "week") {
        key = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      } else if (timeFilter === "month") {
        key = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      } else if (timeFilter === "year") {
        key = date.toLocaleDateString("en-US", { month: "short" });
      } else {
        key = date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
      }
      grouped[key] = (grouped[key] || 0) + 1;
    });
    return grouped;
  };

  const requestTrends = requestTrendData();

  // Day of week analysis
  const requestsByDayOfWeek = () => {
    const days = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
    filteredRequests.forEach((req) => {
      const day = new Date(req.created_at).toLocaleDateString("en-US", { weekday: "short" });
      days[day] = (days[day] || 0) + 1;
    });
    return days;
  };

  const dayOfWeekData = requestsByDayOfWeek();

  // COMPLAINT METRICS
  const complaintStats = {
    total: filteredComplaints.length,
    forReview: filteredComplaints.filter((c) => c.status === "for review").length,
    pending: filteredComplaints.filter((c) => c.status === "pending").length,
    resolved: filteredComplaints.filter((c) => c.status === "resolved").length,
    rejected: filteredComplaints.filter((c) => c.status === "rejected").length,
  };

  const incidentPatterns = analyzeIncidentPatterns(filteredComplaints);
  const complaintsByType = analyzeComplaintsByType(filteredComplaints);

  // Complaint trends by creation date
  const complaintTrendData = () => {
    const grouped = {};
    filteredComplaints.forEach((comp) => {
      const date = new Date(comp.created_at);
      let key;
      if (timeFilter === "week") {
        key = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      } else if (timeFilter === "month") {
        key = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      } else if (timeFilter === "year") {
        key = date.toLocaleDateString("en-US", { month: "short" });
      } else {
        key = date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
      }
      grouped[key] = (grouped[key] || 0) + 1;
    });
    return grouped;
  };

  const complaintTrends = complaintTrendData();

  const complaintTrendChart = {
    labels: Object.keys(complaintTrends),
    datasets: [
      {
        label: "Complaints",
        data: Object.values(complaintTrends),
        borderColor: chartColors.danger,
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // Complaint categories
  const complaintsByCategory = () => {
    const cats = {};
    filteredComplaints.forEach((c) => {
      const cat = c.category || "Unknown";
      cats[cat] = (cats[cat] || 0) + 1;
    });
    return cats;
  };

  const categoryData = complaintsByCategory();

  // SETTLEMENT METRICS
  const settlementStats = {
    total: filteredSettlements.length,
    resolved: filteredSettlements.filter((s) => s.status === "resolved").length,
    unresolved: filteredSettlements.filter((s) => s.status === "unresolved").length,
    scheduled: filteredSettlements.filter((s) => s.status === "scheduled").length,
    rescheduled: filteredSettlements.filter((s) => s.status === "rescheduled").length,
    conciliation: filteredSettlements.filter((s) => s.type === "conciliation").length,
    mediation: filteredSettlements.filter((s) => s.type === "mediation").length,
  };

  const settlementSpeed = analyzeSettlementSpeed(filteredSettlements);
  const settlementDays = analyzeSettlementDays(filteredSettlements);
  const settlementTypeComparison = compareSettlementTypes(filteredSettlements);

  // CHART CONFIGURATIONS
  const requestTrendChart = {
    labels: Object.keys(requestTrends),
    datasets: [
      {
        label: "Requests",
        data: Object.values(requestTrends),
        borderColor: chartColors.primary,
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const requestTypeChart = {
    labels: requestsByType.map((r) => r.type),
    datasets: [
      {
        label: "Count",
        data: requestsByType.map((r) => r.count),
        backgroundColor: [
          chartColors.primary,
          chartColors.success,
          chartColors.warning,
          chartColors.purple,
          chartColors.teal,
        ],
      },
    ],
  };

  const dayOfWeekChart = {
    labels: Object.keys(dayOfWeekData),
    datasets: [
      {
        label: "Requests",
        data: Object.values(dayOfWeekData),
        backgroundColor: chartColors.indigo,
      },
    ],
  };

  const completionTimeChart = {
    labels: completionTimeByType.map((c) => c.type),
    datasets: [
      {
        label: "Avg Days",
        data: completionTimeByType.map((c) => parseFloat(c.avgDays)),
        backgroundColor: chartColors.success,
      },
    ],
  };

  const incidentDayChart = {
    labels: Object.keys(incidentPatterns.dayOfWeek),
    datasets: [
      {
        label: "Incidents",
        data: Object.values(incidentPatterns.dayOfWeek),
        backgroundColor: chartColors.danger,
      },
    ],
  };

  const incidentTimeChart = {
    labels: Object.keys(incidentPatterns.timeOfDay),
    datasets: [
      {
        label: "Incidents",
        data: Object.values(incidentPatterns.timeOfDay),
        backgroundColor: [
          chartColors.warning,
          chartColors.primary,
          chartColors.purple,
          chartColors.indigo,
        ],
      },
    ],
  };

  const complaintCategoryChart = {
    labels: Object.keys(categoryData),
    datasets: [
      {
        data: Object.values(categoryData),
        backgroundColor: [
          chartColors.primary,
          chartColors.success,
          chartColors.warning,
          chartColors.danger,
        ],
      },
    ],
  };

  const settlementDayChart = {
    labels: Object.keys(settlementDays),
    datasets: [
      {
        label: "Sessions",
        data: Object.values(settlementDays),
        backgroundColor: chartColors.teal,
      },
    ],
  };

  const settlementTypeChart = {
    labels: ["Conciliation", "Mediation"],
    datasets: [
      {
        label: "Success Rate %",
        data: [
          parseFloat(settlementTypeComparison.conciliation.successRate),
          parseFloat(settlementTypeComparison.mediation.successRate),
        ],
        backgroundColor: [chartColors.success, chartColors.primary],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "top",
      },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        titleFont: { size: 14 },
        bodyFont: { size: 13 },
      },
    },
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading-state">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-dashboard">
        <div className="dashboard-header">
          <h1>Admin Dashboard</h1>
          <div className="time-filter">
          <button
            className={timeFilter === "week" ? "active" : ""}
            onClick={() => setTimeFilter("week")}
          >
            Week
          </button>
          <button
            className={timeFilter === "month" ? "active" : ""}
            onClick={() => setTimeFilter("month")}
          >
            Month
          </button>
          <button
            className={timeFilter === "year" ? "active" : ""}
            onClick={() => setTimeFilter("year")}
          >
            Year
          </button>
          <button
            className={timeFilter === "all" ? "active" : ""}
            onClick={() => setTimeFilter("all")}
          >
            All Time
          </button>
        </div>
      </div>

      {/* REQUEST SECTION */}
      <section className="dashboard-section">
        <h2>Service Requests</h2>
        
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{requestStats.total}</div>
            <div className="stat-label">Total Requests</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{requestStats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{requestStats.inProgress}</div>
            <div className="stat-label">In Progress</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{requestStats.completed}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>

        <div className="charts-grid">
          <div className="chart-card">
            <h3>Request Trends</h3>
            <div className="chart-container">
              <Line data={requestTrendChart} options={chartOptions} />
            </div>
          </div>

          <div className="chart-card">
            <h3>Most Requested Certificates</h3>
            <div className="chart-container">
              <Bar data={requestTypeChart} options={chartOptions} />
            </div>
          </div>

          <div className="chart-card">
            <h3>Requests by Day of Week</h3>
            <div className="chart-container">
              <Bar data={dayOfWeekChart} options={chartOptions} />
            </div>
          </div>

          <div className="chart-card">
            <h3>Average Completion Time by Type</h3>
            <div className="chart-container">
              <Bar data={completionTimeChart} options={chartOptions} />
            </div>
          </div>
        </div>

        <div className="insights-card">
          <h3>Completion Time Insights</h3>
          <div className="insights-grid">
            {completionTimeByType.map((item) => (
              <div key={item.type} className="insight-item">
                <div className="insight-type">{item.type}</div>
                <div className="insight-stats">
                  <span className="insight-value">{item.avgDays} days</span>
                  <span className="insight-detail">
                    {item.completed} completed, {item.rejected} rejected
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPLAINT SECTION */}
      <section className="dashboard-section">
        <h2>Complaints</h2>
        
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{complaintStats.total}</div>
            <div className="stat-label">Total Complaints</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{complaintStats.forReview}</div>
            <div className="stat-label">For Review</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{complaintStats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{complaintStats.resolved}</div>
            <div className="stat-label">Resolved</div>
          </div>
        </div>

        <div className="charts-grid">
          <div className="chart-card">
            <h3>Complaint Trends by Creation Date</h3>
            <div className="chart-container">
              <Line data={complaintTrendChart} options={chartOptions} />
            </div>
          </div>

          <div className="chart-card">
            <h3>Incidents by Day of Week</h3>
            <div className="chart-container">
              <Bar data={incidentDayChart} options={chartOptions} />
            </div>
          </div>

          <div className="chart-card">
            <h3>Incidents by Time of Day</h3>
            <div className="chart-container">
              <Bar data={incidentTimeChart} options={chartOptions} />
            </div>
          </div>

          <div className="chart-card">
            <h3>Complaint Categories</h3>
            <div className="chart-container">
              <Pie data={complaintCategoryChart} options={chartOptions} />
            </div>
          </div>

          <div className="chart-card">
            <h3>Complaint Types</h3>
            <div className="chart-container">
              <div className="type-list">
                {complaintsByType.slice(0, 10).map((item, idx) => (
                  <div key={idx} className="type-item">
                    <span className="type-name">{item.type}</span>
                    <span className="type-count">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SETTLEMENT SECTION */}
      <section className="dashboard-section">
        <h2>Settlements</h2>
        
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{settlementStats.total}</div>
            <div className="stat-label">Total Settlements</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{settlementStats.resolved}</div>
            <div className="stat-label">Resolved</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{settlementStats.conciliation}</div>
            <div className="stat-label">Conciliation</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{settlementStats.mediation}</div>
            <div className="stat-label">Mediation</div>
          </div>
        </div>

        <div className="charts-grid-2x2">
          <div className="chart-card">
            <h3>Preferred Settlement Days</h3>
            <div className="chart-container">
              <Bar data={settlementDayChart} options={chartOptions} />
            </div>
          </div>

          <div className="chart-card">
            <h3>Success Rate Comparison</h3>
            <div className="chart-container">
              <Bar data={settlementTypeChart} options={chartOptions} />
            </div>
          </div>

          <div className="chart-card">
            <h3>Settlement Speed by Complaint Type</h3>
            <div className="chart-container">
              <div className="type-list">
                {settlementSpeed.map((item, idx) => (
                  <div key={idx} className="type-item">
                    <span className="type-name">{item.type}</span>
                    <span className="type-count">{item.avgDays} days</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="chart-card">
            <h3>Type Comparison Details</h3>
            <div className="chart-container">
              <div className="comparison-grid-settlement-vertical">
                <div className="comparison-item">
                  <h4>Conciliation</h4>
                  <div className="comparison-stat">
                    <span>Success Rate</span>
                    <span className="stat-value">
                      {settlementTypeComparison.conciliation.successRate}%
                    </span>
                  </div>
                  <div className="comparison-stat">
                    <span>Avg Resolution Time</span>
                    <span className="stat-value">
                      {settlementTypeComparison.conciliation.avgDays} days
                    </span>
                  </div>
                  <div className="comparison-stat">
                    <span>Total Cases</span>
                    <span className="stat-value">
                      {settlementTypeComparison.conciliation.total}
                    </span>
                  </div>
                </div>
                <div className="comparison-divider"></div>
                <div className="comparison-item">
                  <h4>Mediation</h4>
                  <div className="comparison-stat">
                    <span>Success Rate</span>
                    <span className="stat-value">
                      {settlementTypeComparison.mediation.successRate}%
                    </span>
                  </div>
                  <div className="comparison-stat">
                    <span>Avg Resolution Time</span>
                    <span className="stat-value">
                      {settlementTypeComparison.mediation.avgDays} days
                    </span>
                  </div>
                  <div className="comparison-stat">
                    <span>Total Cases</span>
                    <span className="stat-value">
                      {settlementTypeComparison.mediation.total}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
