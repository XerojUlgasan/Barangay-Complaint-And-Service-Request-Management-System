import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Search,
  ChevronDown,
} from "lucide-react";
import {
  getAssignedComplaints,
  getAssignedRequests,
} from "../../supabse_db/official/official";
import "../../styles/BarangayOfficial.css";

const OfficialDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("requests"); // "requests" or "complaints"
  const [requests, setRequests] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("latest"); // latest, oldest
  const [filterByStatus, setFilterByStatus] = useState("all");
  const [filterByType, setFilterByType] = useState("all"); // all, requests, complaints

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

  // Get recent items for active tab with search, sort, filter by type and status
  const getRecentItems = () => {
    // Determine which items to include based on filterByType
    let items = [];
    const allRequests = requests.map(r => ({ ...r, itemType: 'request' }));
    const allComplaints = complaints.map(c => ({ ...c, itemType: 'complaint' }));
    
    if (filterByType === "requests") {
      items = allRequests;
    } else if (filterByType === "complaints") {
      items = allComplaints;
    } else {
      items = [...allRequests, ...allComplaints];
    }

    const statusColors = {
      pending: "#F59E0B",
      in_progress: "#0EA5E9",
      completed: "#10B981",
      rejected: "#EF4444",
      for_compliance: "#8B5CF6",
      non_compliant: "#EC4899",
      for_validation: "#06B6D4",
    };

    // Filter items
    let filtered = items.filter((item) => {
      const title = (item.certificate_type || item.complaint_type || "").toLowerCase();
      const submitter = (
        item.profiles?.full_name ||
        item.profiles?.email ||
        item.requester_name ||
        item.complainant_name ||
        ""
      ).toLowerCase();
      const description = (item.description || "").toLowerCase();

      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        title.includes(searchQuery.toLowerCase()) ||
        submitter.includes(searchQuery.toLowerCase()) ||
        description.includes(searchQuery.toLowerCase());

      // Status filter
      const statusField = item.itemType === "request" ? "request_status" : "status";
      const status = item[statusField];
      const matchesStatus = filterByStatus === "all" || status === filterByStatus;

      return matchesSearch && matchesStatus;
    });

    // Sort items
    filtered = filtered.sort((a, b) => {
      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      return sortBy === "latest" ? dateB - dateA : dateA - dateB;
    });

    return filtered.slice(0, 5).map((item) => {
      const statusField = item.itemType === "request" ? "request_status" : "status";
      return {
        id: item.id,
        title: item.certificate_type || item.complaint_type || "Untitled",
        submittedBy:
          item.profiles?.full_name ||
          item.profiles?.email ||
          item.requester_name ||
          item.complainant_name ||
          "Unknown",
        status: item[statusField],
        statusColor: statusColors[item[statusField]] || "#9CA3AF",
        itemType: item.itemType,
        rawData: item,
      };
    });
  };

  const handleItemClick = (item, type) => {
    if (type === "request") {
      navigate("/BarangayOfficial/requests", {
        state: { selectedRequestId: item.id, openModal: true },
      });
    } else if (type === "complaint") {
      navigate("/BarangayOfficial/complaints", {
        state: { selectedComplaintId: item.id, openModal: true },
      });
    }
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
          <div className="loading-wrap">
            <div className="loading-spinner" aria-hidden="true"></div>
            <div className="loading-text">Loading dashboard data...</div>
          </div>
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
          <div className="stat-row">
            <div className="stat-box yellow">
              <span className="stat-icon">
                <TrendingUp size={18} />
              </span>
              <div className="stat-label">Total</div>
              <div className="stat-num">{stats.total}</div>
            </div>

            <div className="stat-box blue">
              <span className="stat-icon">
                <Clock size={18} />
              </span>
              <div className="stat-label">Active</div>
              <div className="stat-num">{stats.active}</div>
            </div>

            <div className="stat-box green">
              <span className="stat-icon">
                <CheckCircle2 size={18} />
              </span>
              <div className="stat-label">Completed</div>
              <div className="stat-num">{stats.completed}</div>
            </div>

            <div className="stat-box red">
              <span className="stat-icon">
                <XCircle size={18} />
              </span>
              <div className="stat-label">Rejected</div>
              <div className="stat-num">{stats.rejected}</div>
            </div>

            {(() => {
              let compClass = "blue";
              if (stats.completionRate >= 75) compClass = "green";
              else if (stats.completionRate < 50) compClass = "red";
              else compClass = "yellow";
              return (
                <div className={`stat-box ${compClass}`}>
                  <span className="stat-icon">
                    <TrendingUp size={18} />
                  </span>
                  <div className="stat-label">Completion Rate</div>
                  <div className="stat-num">{stats.completionRate}%</div>
                </div>
              );
            })()}
          </div>

          {/* CHARTS SECTION */}
          <div className="charts-section">
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
              <h3>Recent Requests and Complaints</h3>
            </div>

            {/* SEARCH & FILTER BAR */}
            <div className="recent-controls">
              <div className="recent-search-wrap">
                <Search size={18} className="recent-search-icon" />
                <input
                  type="text"
                  placeholder={
                    activeTab === "requests"
                      ? "Search requests..."
                      : "Search complaints..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="recent-search-input"
                />
              </div>

              <div className="recent-filter-group">
                <div className="recent-filter-control">
                  <label className="recent-filter-label">Type:</label>
                  <select
                    value={filterByType}
                    onChange={(e) => setFilterByType(e.target.value)}
                    className="recent-filter-select"
                  >
                    <option value="all">All Types</option>
                    <option value="requests">Requests Only</option>
                    <option value="complaints">Complaints Only</option>
                  </select>
                </div>

                <div className="recent-filter-control">
                  <label className="recent-filter-label">Sort By:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="recent-filter-select"
                  >
                    <option value="latest">Latest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>

                <div className="recent-filter-control">
                  <label className="recent-filter-label">Status:</label>
                  <select
                    value={filterByStatus}
                    onChange={(e) => setFilterByStatus(e.target.value)}
                    className="recent-filter-select"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                    <option value="for_compliance">For Compliance</option>
                    <option value="non_compliant">Non Compliant</option>
                    <option value="for_validation">For Validation</option>
                  </select>
                </div>
              </div>
            </div>

            {/* RESULTS COUNT */}
            <div className="recent-results-count">
              Showing {recentItems.length} of{" "}
              {filterByType === "all" ? requests.length + complaints.length : filterByType === "requests" ? requests.length : complaints.length}{" "}
              {filterByType === "all" ? "items" : filterByType === "requests" ? "requests" : "complaints"}
            </div>

            {/* TASKS LIST */}
            <div className="tasks-list">
              {recentItems.length > 0 ? (
                recentItems.map((item) => (
                  <div
                    key={item.id}
                    className="task-item"
                    onClick={() =>
                      handleItemClick(
                        item.rawData,
                        item.itemType === "request" ? "request" : "complaint"
                      )
                    }
                  >
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
                <p className="recent-empty-message">
                  No {filterByType === "all" ? "items" : filterByType === "requests" ? "requests" : "complaints"}{" "}
                  found with current filters.
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
