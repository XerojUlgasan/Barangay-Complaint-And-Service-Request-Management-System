import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  checkIfPasswordChangeRequired,
  updatePasswordAndSetFlag,
} from "../../supabse_db/auth/auth";
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
  TrendingUp,
  FileText,
  MessageSquare,
  XCircle,
  Search,
} from "lucide-react";
import {
  getAssignedComplaints,
  getAssignedRequests,
} from "../../supabse_db/official/official";
import "../../styles/BarangayOfficial.css";
import PasswordChangeModal from "../../components/PasswordChangeModal";
import Sidebar from "../../components/Sidebar";

const STATUS_ORDER = [
  "pending",
  "in_progress",
  "for_compliance",
  "resident_complied",
  "for_validation",
  "completed",
  "rejected",
  "non_compliant",
];

const STATUS_META = {
  pending: { label: "Pending", color: "#F59E0B" },
  in_progress: { label: "In Progress", color: "#0EA5E9" },
  for_compliance: { label: "For Compliance", color: "#8B5CF6" },
  resident_complied: { label: "Resident Complied", color: "#14B8A6" },
  for_validation: { label: "For Validation", color: "#06B6D4" },
  completed: { label: "Completed", color: "#10B981" },
  rejected: { label: "Rejected", color: "#EF4444" },
  non_compliant: { label: "Non Compliant", color: "#EC4899" },
};

const FINISHED_STATUSES = new Set(["completed", "rejected", "non_compliant"]);

const OfficialDashboard = () => {
  // Sidebar open state for overlay logic
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { userName, userLoading, authUser } = useAuth();
  const [requests, setRequests] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("latest"); // latest, oldest
  const [filterByType, setFilterByType] = useState("all"); // all, requests, complaints

  // Password change modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (userLoading || !authUser) return;
    const checkPasswordAndFetchData = async () => {
      const needsPasswordChange = await checkIfPasswordChangeRequired();
      setShowPasswordModal(needsPasswordChange);
      fetchDashboardData();
    };
    checkPasswordAndFetchData();
  }, [authUser, userLoading]);

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

  // Handle password change
  const handlePasswordChange = useCallback(
    async (e) => {
      e.preventDefault();
      if (newPassword !== confirmPassword) {
        setPasswordError("Passwords do not match.");
        return;
      }
      if (newPassword.length < 6) {
        setPasswordError("Password must be at least 6 characters.");
        return;
      }
      setPasswordLoading(true);
      const result = await updatePasswordAndSetFlag(newPassword);
      setPasswordLoading(false);
      if (result.success) {
        setShowPasswordModal(false);
        setNewPassword("");
        setConfirmPassword("");
        setPasswordError("");
      } else {
        setPasswordError(result.message);
      }
    },
    [newPassword, confirmPassword],
  );

  const assignedRequests = authUser
    ? requests.filter((request) => request.assigned_official_id === authUser.id)
    : [];

  const assignedComplaints = authUser
    ? complaints.filter(
        (complaint) => complaint.assigned_official_id === authUser.id,
      )
    : [];

  const completedRequests = assignedRequests.filter((request) =>
    FINISHED_STATUSES.has(request.request_status),
  ).length;

  const completedComplaints = assignedComplaints.filter((complaint) =>
    FINISHED_STATUSES.has(complaint.status),
  ).length;

  const unfinishedRequests = assignedRequests.length - completedRequests;
  const unfinishedComplaints = assignedComplaints.length - completedComplaints;

  const statusMatrixData = STATUS_ORDER.map((status) => ({
    status,
    name: STATUS_META[status]?.label || status,
    requests: assignedRequests.filter(
      (request) => request.request_status === status,
    ).length,
    complaints: assignedComplaints.filter(
      (complaint) => complaint.status === status,
    ).length,
  }));

  const overallStatusData = statusMatrixData
    .map((entry) => ({
      name: entry.name,
      value: entry.requests + entry.complaints,
      color: STATUS_META[entry.status]?.color || "#9CA3AF",
    }))
    .filter((entry) => entry.value > 0);

  // Get recent items for active tab with search, sort, filter by type and status
  const getRecentItems = () => {
    // Determine which items to include based on filterByType
    let items = [];
    const allRequests = requests.map((r) => ({ ...r, itemType: "request" }));
    const allComplaints = complaints.map((c) => ({
      ...c,
      itemType: "complaint",
    }));

    if (filterByType === "requests") {
      items = allRequests;
    } else if (filterByType === "complaints") {
      items = allComplaints;
    } else {
      items = [...allRequests, ...allComplaints];
    }

    const statusColors = Object.fromEntries(
      Object.entries(STATUS_META).map(([key, value]) => [key, value.color]),
    );

    // Filter items
    let filtered = items.filter((item) => {
      const title = (
        item.certificate_type ||
        item.complaint_type ||
        ""
      ).toLowerCase();
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

      return matchesSearch;
    });

    // Sort items
    filtered = filtered.sort((a, b) => {
      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      return sortBy === "latest" ? dateB - dateA : dateA - dateB;
    });

    return filtered.slice(0, 5).map((item) => {
      const statusField =
        item.itemType === "request" ? "request_status" : "status";
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
        statusLabel: STATUS_META[item[statusField]]?.label || item[statusField],
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

  const recentItems = getRecentItems();

  return (
    <div className="barangay-official-container">
      {/* SIDEBAR COMPONENT */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="dashboard-header">
        <h1>
          Welcome, {userLoading ? "..." : userName || "Barangay Official"}
        </h1>
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
          {/* COMPACT STATS ROW */}
          <div className="stat-row">
            <div className="stat-box yellow">
              <span className="stat-icon">
                <Clock size={18} />
              </span>
              <div className="stat-label">Unfinished Requests</div>
              <div className="stat-num">{unfinishedRequests}</div>
            </div>

            <div className="stat-box blue">
              <span className="stat-icon">
                <MessageSquare size={18} />
              </span>
              <div className="stat-label">Unfinished Complaints</div>
              <div className="stat-num">{unfinishedComplaints}</div>
            </div>

            <div className="stat-box green">
              <span className="stat-icon">
                <FileText size={18} />
              </span>
              <div className="stat-label">Completed Requests</div>
              <div className="stat-num">{completedRequests}</div>
            </div>

            <div className="stat-box red">
              <span className="stat-icon">
                <CheckCircle2 size={18} />
              </span>
              <div className="stat-label">Completed Complaints</div>
              <div className="stat-num">{completedComplaints}</div>
            </div>
          </div>

          {/* CHARTS SECTION */}
          <div className="charts-section">
            <div className="chart-card">
              <div className="chart-header">
                <TrendingUp size={20} color="#0EA5E9" />
                <h3>Status Distribution by Case Type</h3>
              </div>
              <p className="chart-note">
                Requests and complaints are grouped by shared status values.
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={statusMatrixData}
                  margin={{ top: 6, right: 10, left: -10, bottom: 54 }}
                >
                  <CartesianGrid strokeDasharray="4 4" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="name"
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    height={70}
                  />
                  <YAxis allowDecimals={false} tick={{ fill: "#6B7280" }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "10px",
                      border: "1px solid #E5E7EB",
                      boxShadow: "0 8px 16px rgba(0,0,0,0.08)",
                    }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Bar
                    dataKey="requests"
                    name="Requests"
                    fill="#3B82F6"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="complaints"
                    name="Complaints"
                    fill="#10B981"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <CheckCircle2 size={20} color="#14B8A6" />
                <h3>Overall Status Share</h3>
              </div>
              <p className="chart-note">
                Finished statuses: completed, rejected, non compliant.
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={overallStatusData}
                    dataKey="value"
                    cx="50%"
                    cy="48%"
                    innerRadius={62}
                    outerRadius={94}
                    paddingAngle={2}
                  >
                    {overallStatusData.map((entry, index) => (
                      <Cell key={`status-share-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value} item(s)`, "Count"]}
                    contentStyle={{
                      borderRadius: "10px",
                      border: "1px solid #E5E7EB",
                      boxShadow: "0 8px 16px rgba(0,0,0,0.08)",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    height={36}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
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
                  placeholder="Search requests and complaints..."
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
              </div>
            </div>

            {/* RESULTS COUNT */}
            <div className="recent-results-count">
              Showing {recentItems.length} of{" "}
              {filterByType === "all"
                ? requests.length + complaints.length
                : filterByType === "requests"
                  ? requests.length
                  : complaints.length}{" "}
              {filterByType === "all"
                ? "items"
                : filterByType === "requests"
                  ? "requests"
                  : "complaints"}
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
                        item.itemType === "request" ? "request" : "complaint",
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
                      {item.statusLabel}
                    </span>
                  </div>
                ))
              ) : (
                <p className="recent-empty-message">
                  No{" "}
                  {filterByType === "all"
                    ? "items"
                    : filterByType === "requests"
                      ? "requests"
                      : "complaints"}{" "}
                  found with current filters.
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* PASSWORD CHANGE MODAL (First-time Login) */}
      <PasswordChangeModal
        open={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSubmit={handlePasswordChange}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        showNewPassword={showNewPassword}
        setShowNewPassword={setShowNewPassword}
        showConfirmPassword={showConfirmPassword}
        setShowConfirmPassword={setShowConfirmPassword}
        passwordError={passwordError}
        passwordLoading={passwordLoading}
      />
    </div>
  );
};

export default OfficialDashboard;
