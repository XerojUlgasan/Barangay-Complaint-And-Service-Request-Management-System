import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  FileText,
  MessageSquare,
  XCircle,
} from "lucide-react";
import {
  getAssignedComplaints,
  getAssignedRequests,
} from "../../supabse_db/official/official";
import "../../styles/BarangayOfficial.css";

const OfficialDashboard = () => {
  const [activeTab, setActiveTab] = useState("requests"); // "requests" or "complaints"
  const [requests, setRequests] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [complaintsResult, requestsResult] = await Promise.all([
        getAssignedComplaints(),
        getAssignedRequests(),
      ]);

      if (complaintsResult.success) {
        setComplaints(complaintsResult.data || []);
      }

      if (requestsResult.success) {
        setRequests(requestsResult.data || []);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setLoading(false);
    }
  };

  // Calculate stats dynamically
  const getRequestStats = () => {
    const stats = {
      total: requests.length,
      pending: requests.filter((r) => r.request_status === "pending").length,
      inProgress: requests.filter((r) => r.request_status === "in_progress")
        .length,
      completed: requests.filter((r) => r.request_status === "completed")
        .length,
      rejected: requests.filter((r) => r.request_status === "rejected").length,
      forCompliance: requests.filter(
        (r) => r.request_status === "for_compliance",
      ).length,
      nonCompliant: requests.filter((r) => r.request_status === "non_compliant")
        .length,
      forValidation: requests.filter(
        (r) => r.request_status === "for_validation",
      ).length,
    };
    stats.active =
      stats.pending +
      stats.inProgress +
      stats.forCompliance +
      stats.forValidation;
    stats.completionRate =
      stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    return stats;
  };

  const getComplaintStats = () => {
    const stats = {
      total: complaints.length,
      pending: complaints.filter((c) => c.status === "pending").length,
      inProgress: complaints.filter((c) => c.status === "in_progress").length,
      completed: complaints.filter((c) => c.status === "completed").length,
      rejected: complaints.filter((c) => c.status === "rejected").length,
      forCompliance: complaints.filter((c) => c.status === "for_compliance")
        .length,
      nonCompliant: complaints.filter((c) => c.status === "non_compliant")
        .length,
      forValidation: complaints.filter((c) => c.status === "for_validation")
        .length,
    };
    stats.active =
      stats.pending +
      stats.inProgress +
      stats.forCompliance +
      stats.forValidation;
    stats.completionRate =
      stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    return stats;
  };

  const requestStats = getRequestStats();
  const complaintStats = getComplaintStats();
  const stats = activeTab === "requests" ? requestStats : complaintStats;

  // Get status breakdown data for active tab
  const getStatusBreakdownData = () => {
    const items = activeTab === "requests" ? requests : complaints;
    const statusField = activeTab === "requests" ? "request_status" : "status";

    const statusColors = {
      pending: "#F59E0B",
      in_progress: "#0EA5E9",
      completed: "#10B981",
      rejected: "#EF4444",
      for_compliance: "#8B5CF6",
      non_compliant: "#EC4899",
      for_validation: "#06B6D4",
    };

    const statusLabels = {
      pending: "Pending",
      in_progress: "In Progress",
      completed: "Completed",
      rejected: "Rejected",
      for_compliance: "For Compliance",
      non_compliant: "Non Compliant",
      for_validation: "For Validation",
    };

    const breakdown = {};
    items.forEach((item) => {
      const status = item[statusField];
      breakdown[status] = (breakdown[status] || 0) + 1;
    });

    return Object.entries(breakdown).map(([status, count]) => ({
      name: statusLabels[status] || status,
      value: count,
      color: statusColors[status] || "#9CA3AF",
    }));
  };

  // Get request type distribution (only for requests)
  const getRequestTypeDistribution = () => {
    if (activeTab !== "requests") return [];

    const typeCount = {};
    requests.forEach((req) => {
      const type = req.certificate_type || "Other";
      typeCount[type] = (typeCount[type] || 0) + 1;
    });

    return Object.entries(typeCount).map(([name, value]) => ({
      name,
      value,
    }));
  };

  // Get recent items for active tab
  const getRecentItems = () => {
    const items = activeTab === "requests" ? requests : complaints;
    const statusField = activeTab === "requests" ? "request_status" : "status";

    const statusColors = {
      pending: "#F59E0B",
      in_progress: "#0EA5E9",
      completed: "#10B981",
      rejected: "#EF4444",
      for_compliance: "#8B5CF6",
      non_compliant: "#EC4899",
      for_validation: "#06B6D4",
    };

    return items
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .map((item) => ({
        id: item.id,
        title: item.certificate_type || item.complaint_type || "Untitled",
        submittedBy:
          item.profiles?.full_name || item.profiles?.email || "Unknown",
        status: item[statusField],
        statusColor: statusColors[item[statusField]] || "#9CA3AF",
      }));
  };

  const statusBreakdown = getStatusBreakdownData();
  const requestTypeDistribution = getRequestTypeDistribution();
  const recentItems = getRecentItems();

  return (
    <div className="barangay-official-container">
      <div className="dashboard-header">
        <h1>Welcome, Barangay Official</h1>
        <p>Your personal dashboard overview</p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <p>Loading dashboard data...</p>
        </div>
      ) : (
        <>
          {/* TAB NAVIGATION */}
          <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
            <button
              onClick={() => setActiveTab("requests")}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor:
                  activeTab === "requests" ? "#50C878" : "#F3F4F6",
                color: activeTab === "requests" ? "#FFFFFF" : "#6B7280",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                transition: "all 0.2s",
              }}
            >
              <FileText size={18} />
              Service Requests
            </button>
            <button
              onClick={() => setActiveTab("complaints")}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor:
                  activeTab === "complaints" ? "#50C878" : "#F3F4F6",
                color: activeTab === "complaints" ? "#FFFFFF" : "#6B7280",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                transition: "all 0.2s",
              }}
            >
              <MessageSquare size={18} />
              Complaints
            </button>
          </div>

          {/* COMPACT STATS ROW */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "1rem",
              marginBottom: "2rem",
            }}
          >
            <div className="stat-card">
              <div className="stat-content">
                <p className="stat-label">Total</p>
                <h2 className="stat-value">{stats.total}</h2>
              </div>
              <div className="stat-icon" style={{ backgroundColor: "#F0F9FF" }}>
                <TrendingUp size={24} color="#50C878" />
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-content">
                <p className="stat-label">Active</p>
                <h2 className="stat-value">{stats.active}</h2>
              </div>
              <div className="stat-icon" style={{ backgroundColor: "#FEF3C7" }}>
                <Clock size={24} color="#F59E0B" />
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-content">
                <p className="stat-label">Completed</p>
                <h2 className="stat-value">{stats.completed}</h2>
              </div>
              <div className="stat-icon" style={{ backgroundColor: "#F0FDF4" }}>
                <CheckCircle2 size={24} color="#10B981" />
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-content">
                <p className="stat-label">Rejected</p>
                <h2 className="stat-value">{stats.rejected}</h2>
              </div>
              <div className="stat-icon" style={{ backgroundColor: "#FEE2E2" }}>
                <XCircle size={24} color="#EF4444" />
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-content">
                <p className="stat-label">Completion Rate</p>
                <h2 className="stat-value">{stats.completionRate}%</h2>
              </div>
              <div className="stat-icon" style={{ backgroundColor: "#E0E7FF" }}>
                <TrendingUp size={24} color="#6366F1" />
              </div>
            </div>
          </div>

          {/* CHARTS SECTION */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: activeTab === "requests" ? "1fr 1fr" : "1fr",
              gap: "1.5rem",
              marginBottom: "2rem",
            }}
          >
            {/* Status Breakdown Pie Chart */}
            <div className="chart-card">
              <div className="chart-header">
                <TrendingUp size={20} color="#4A90E2" />
                <h3>Status Breakdown</h3>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusBreakdown}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    startAngle={90}
                    endAngle={450}
                  >
                    {statusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Request Type Distribution (only for requests) */}
            {activeTab === "requests" && requestTypeDistribution.length > 0 && (
              <div className="chart-card">
                <div className="chart-header">
                  <FileText size={20} color="#50C878" />
                  <h3>Request Types</h3>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={requestTypeDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="name"
                      stroke="#6B7280"
                      angle={-15}
                      textAnchor="end"
                      height={80}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis stroke="#6B7280" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #E5E7EB",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="value" fill="#50C878" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* RECENT ITEMS */}
          <div className="recent-tasks-card">
            <div className="card-header">
              <TrendingUp size={20} color="#50C878" />
              <h3>
                Recent {activeTab === "requests" ? "Requests" : "Complaints"}
              </h3>
            </div>
            <div className="tasks-list">
              {recentItems.length > 0 ? (
                recentItems.map((item) => (
                  <div key={item.id} className="task-item">
                    <div className="task-icon">
                      <CheckCircle2 size={20} color="#50C878" />
                    </div>
                    <div className="task-details">
                      <h4 className="task-title">{item.title}</h4>
                      <p className="task-submitted">
                        Submitted by: {item.submittedBy}
                      </p>
                    </div>
                    <span
                      className="task-status"
                      style={{ backgroundColor: item.statusColor }}
                    >
                      {item.status.replace(/_/g, " ")}
                    </span>
                  </div>
                ))
              ) : (
                <p style={{ color: "#6B7280" }}>
                  No recent{" "}
                  {activeTab === "requests" ? "requests" : "complaints"} yet.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default OfficialDashboard;
