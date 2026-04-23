import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import supabase from "../../supabse_db/supabase_client";
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
  "for review",
  "recorded",
  "resolved",
  "rejected",
];

const COMPLAINT_STATUS_META = {
  "for review": { label: "For Review", color: "#F59E0B" },
  pending: { label: "Pending", color: "#F97316" },
  recorded: { label: "Recorded", color: "#0EA5E9" },
  resolved: { label: "Resolved", color: "#10B981" },
  rejected: { label: "Rejected", color: "#EF4444" },
};

const COMPLAINT_CATEGORY_ORDER = [
  "community concern",
  "barangay complaint",
  "community dispute",
  "personal complaint",
];

const COMPLAINT_CATEGORY_META = {
  "community concern": { label: "Community Concern", color: "#10B981" },
  "barangay complaint": { label: "Barangay Complaint", color: "#0EA5E9" },
  "community dispute": { label: "Community Dispute", color: "#EF4444" },
  "personal complaint": { label: "Personal Complaint", color: "#8B5CF6" },
};

const MEDIATION_STATUS_ORDER = [
  "scheduled",
  "rescheduled",
  "unresolved",
  "resolved",
  "rejected",
];

const MEDIATION_STATUS_META = {
  scheduled: { label: "Scheduled", color: "#0EA5E9" },
  rescheduled: { label: "Rescheduled", color: "#14B8A6" },
  unresolved: { label: "Unresolved", color: "#F59E0B" },
  resolved: { label: "Resolved", color: "#10B981" },
  rejected: { label: "Rejected", color: "#EF4444" },
};

const REQUEST_STATUS_ORDER = [
  "pending",
  "in_progress",
  "for_compliance",
  "resident_complied",
  "for_validation",
  "completed",
  "rejected",
  "non_compliant",
];

const REQUEST_STATUS_META = {
  pending: { label: "Pending", color: "#F59E0B" },
  in_progress: { label: "In Progress", color: "#3B82F6" },
  for_compliance: { label: "For Compliance", color: "#8B5CF6" },
  resident_complied: { label: "Resident Complied", color: "#14B8A6" },
  for_validation: { label: "For Validation", color: "#06B6D4" },
  completed: { label: "Completed", color: "#10B981" },
  rejected: { label: "Rejected", color: "#EF4444" },
  non_compliant: { label: "Non Compliant", color: "#EC4899" },
};

const FINISHED_COMPLAINT_STATUSES = new Set([
  "recorded",
  "resolved",
  "rejected",
]);

const ACTIVE_MEDIATION_STATUSES = new Set(["scheduled", "rescheduled"]);
const REQUEST_FINISHED_STATUSES = new Set([
  "completed",
  "rejected",
  "non_compliant",
]);
const REQUEST_PROGRESS_STATUSES = new Set([
  "for_compliance",
  "resident_complied",
  "for_validation",
]);

const normalizeValue = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");

const getMeta = (meta, value, fallbackLabel = "Unknown") => {
  const normalizedValue = normalizeValue(value);
  return (
    meta[normalizedValue] || {
      label: normalizedValue
        ? normalizedValue.replace(/\b\w/g, (char) => char.toUpperCase())
        : fallbackLabel,
      color: "#9CA3AF",
    }
  );
};

const buildStatusSeries = (rows, order, meta, valueKey) =>
  order
    .map((status) => ({
      status,
      name: getMeta(meta, status).label,
      value: rows.filter((row) => normalizeValue(row[valueKey]) === status)
        .length,
      color: getMeta(meta, status).color,
    }))
    .filter((entry) => entry.value > 0);

const buildCategorySeries = (rows) =>
  COMPLAINT_CATEGORY_ORDER.map((category) => ({
    category,
    name: getMeta(COMPLAINT_CATEGORY_META, category).label,
    value: rows.filter(
      (row) =>
        normalizeValue(row.category) === category ||
        (!row.category && category === "uncategorized"),
    ).length,
    color: getMeta(COMPLAINT_CATEGORY_META, category).color,
  })).filter((entry) => entry.value > 0);

const OfficialDashboard = () => {
  // Sidebar open state for overlay logic
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { userName, userLoading, authUser } = useAuth();
  const [requests, setRequests] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [mediations, setMediations] = useState([]);
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
        const complaintRows = complaintsResult.data || [];
        setComplaints(complaintRows);

        const complaintIds = complaintRows
          .map((complaint) => complaint.id)
          .filter(Boolean);

        if (complaintIds.length > 0) {
          const { data: mediationRows, error: mediationError } = await supabase
            .from("mediations_tbl")
            .select(
              "id, complaint_id, created_at, session_start, session_end, status",
            )
            .in("complaint_id", complaintIds)
            .order("created_at", { ascending: false })
            .order("id", { ascending: false });

          if (mediationError) {
            console.error("Error fetching mediation data:", mediationError);
            setMediations([]);
          } else {
            setMediations(mediationRows || []);
          }
        } else {
          setMediations([]);
        }
      } else {
        setComplaints([]);
        setMediations([]);
      }

      if (requestsResult.success) {
        setRequests(requestsResult.data || []);
      } else {
        setRequests([]);
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

  const assignedMediations = authUser
    ? mediations.filter((mediation) =>
        assignedComplaints.some(
          (complaint) =>
            String(complaint.id) === String(mediation.complaint_id),
        ),
      )
    : [];

  const completedRequestStatuses = assignedRequests.filter((request) =>
    REQUEST_FINISHED_STATUSES.has(normalizeValue(request.request_status)),
  ).length;

  const pendingRequests = assignedRequests.filter(
    (request) => normalizeValue(request.request_status) === "pending",
  ).length;

  const inProgressRequests = assignedRequests.filter(
    (request) => normalizeValue(request.request_status) === "in_progress",
  ).length;

  const requestProgressRequests = assignedRequests.filter((request) =>
    REQUEST_PROGRESS_STATUSES.has(normalizeValue(request.request_status)),
  ).length;

  const finishedComplaints = assignedComplaints.filter((complaint) =>
    FINISHED_COMPLAINT_STATUSES.has(normalizeValue(complaint.status)),
  ).length;

  const unfinishedComplaints = assignedComplaints.length - finishedComplaints;

  const complaintCategoryData = buildCategorySeries(assignedComplaints);
  const complaintStatusData = buildStatusSeries(
    assignedComplaints,
    STATUS_ORDER,
    COMPLAINT_STATUS_META,
    "status",
  );
  const requestStatusData = buildStatusSeries(
    assignedRequests,
    REQUEST_STATUS_ORDER,
    REQUEST_STATUS_META,
    "request_status",
  );
  const mediationStatusData = buildStatusSeries(
    assignedMediations,
    MEDIATION_STATUS_ORDER,
    MEDIATION_STATUS_META,
    "status",
  );

  const requestTypeData = Object.entries(
    assignedRequests.reduce((accumulator, request) => {
      const key = normalizeValue(request.certificate_type) || "uncategorized";
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {}),
  )
    .map(([certificateType, value]) => ({
      certificateType,
      name:
        certificateType === "uncategorized"
          ? "Uncategorized"
          : getMeta({}, certificateType).label,
      value,
      color: "#3B82F6",
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 6);

  const complaintCategoryCounts = {
    communityConcern: assignedComplaints.filter(
      (complaint) => normalizeValue(complaint.category) === "community concern",
    ).length,
    barangayComplaint: assignedComplaints.filter(
      (complaint) => normalizeValue(complaint.category) === "barangay complaint",
    ).length,
    communityDispute: assignedComplaints.filter(
      (complaint) => normalizeValue(complaint.category) === "community dispute",
    ).length,
    personalComplaint: assignedComplaints.filter(
      (complaint) => normalizeValue(complaint.category) === "personal complaint",
    ).length,
  };

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
      Object.entries(COMPLAINT_STATUS_META).map(([key, value]) => [
        key,
        value.color,
      ]),
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
      const categoryField =
        item.itemType === "complaint" ? item.category : null;
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
        statusLabel:
          item.itemType === "complaint"
            ? getMeta(COMPLAINT_STATUS_META, item[statusField]).label
            : item[statusField],
        statusColor: statusColors[item[statusField]] || "#9CA3AF",
        categoryLabel:
          item.itemType === "complaint"
            ? getMeta(COMPLAINT_CATEGORY_META, categoryField).label
            : null,
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
          <div className="recent-tasks-card">
            <div className="card-header">
              <MessageSquare size={20} color="#0EA5E9" />
              <h3>Complaints Overview</h3>
            </div>

            <div className="stat-row" style={{ padding: "1rem 24px 0" }}>
              <div className="stat-box blue">
                <span className="stat-icon">
                  <CheckCircle2 size={18} />
                </span>
                <div className="stat-label">Community Concern</div>
                <div className="stat-num">
                  {complaintCategoryCounts.communityConcern}
                </div>
              </div>

              <div className="stat-box green">
                <span className="stat-icon">
                  <Clock size={18} />
                </span>
                <div className="stat-label">Barangay Complaint</div>
                <div className="stat-num">
                  {complaintCategoryCounts.barangayComplaint}
                </div>
              </div>

              <div className="stat-box red">
                <span className="stat-icon">
                  <FileText size={18} />
                </span>
                <div className="stat-label">Community Dispute</div>
                <div className="stat-num">
                  {complaintCategoryCounts.communityDispute}
                </div>
              </div>

              <div className="stat-box purple">
                <span className="stat-icon">
                  <TrendingUp size={18} />
                </span>
                <div className="stat-label">Personal Complaint</div>
                <div className="stat-num">
                  {complaintCategoryCounts.personalComplaint}
                </div>
              </div>
            </div>

            <div className="charts-section" style={{ padding: "0 24px 24px" }}>
              <div className="chart-card">
                <div className="chart-header">
                  <TrendingUp size={20} color="#0EA5E9" />
                  <h3>Complaint Categories</h3>
                </div>
                <p className="chart-note">
                  Assigned complaints grouped by category.
                </p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={complaintCategoryData}
                    margin={{ top: 6, right: 10, left: -10, bottom: 18 }}
                  >
                    <CartesianGrid strokeDasharray="4 4" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="name"
                      interval={0}
                      tick={{ fontSize: 11, fill: "#6B7280" }}
                    />
                    <YAxis allowDecimals={false} tick={{ fill: "#6B7280" }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "10px",
                        border: "1px solid #E5E7EB",
                        boxShadow: "0 8px 16px rgba(0,0,0,0.08)",
                      }}
                    />
                    <Bar
                      dataKey="value"
                      name="Complaints"
                      radius={[6, 6, 0, 0]}
                    >
                      {complaintCategoryData.map((entry, index) => (
                        <Cell
                          key={`category-bar-${index}`}
                          fill={entry.color}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <div className="chart-header">
                  <CheckCircle2 size={20} color="#14B8A6" />
                  <h3>Complaint Status Share</h3>
                </div>
                <p className="chart-note">
                  Complaint statuses now use for review, pending, recorded,
                  resolved, and rejected.
                </p>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={complaintStatusData}
                      dataKey="value"
                      cx="50%"
                      cy="48%"
                      innerRadius={62}
                      outerRadius={94}
                      paddingAngle={2}
                    >
                      {complaintStatusData.map((entry, index) => (
                        <Cell
                          key={`status-share-${index}`}
                          fill={entry.color}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value} complaint(s)`, "Count"]}
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

              <div className="chart-card">
                <div className="chart-header">
                  <MessageSquare size={20} color="#8B5CF6" />
                  <h3>Mediation Status Share</h3>
                </div>
                <p className="chart-note">
                  Mediation rows linked to the assigned complaints.
                </p>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={mediationStatusData}
                      dataKey="value"
                      cx="50%"
                      cy="48%"
                      innerRadius={62}
                      outerRadius={94}
                      paddingAngle={2}
                    >
                      {mediationStatusData.map((entry, index) => (
                        <Cell
                          key={`mediation-share-${index}`}
                          fill={entry.color}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value} session(s)`, "Count"]}
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
          </div>

          <div className="recent-tasks-card">
            <div className="card-header">
              <FileText size={20} color="#3B82F6" />
              <h3>Requests Overview</h3>
            </div>

            <div className="stat-row" style={{ padding: "1rem 24px 0" }}>
              <div className="stat-box yellow">
                <span className="stat-icon">
                  <Clock size={18} />
                </span>
                <div className="stat-label">Pending Requests</div>
                <div className="stat-num">{pendingRequests}</div>
              </div>

              <div className="stat-box blue">
                <span className="stat-icon">
                  <TrendingUp size={18} />
                </span>
                <div className="stat-label">In Progress Requests</div>
                <div className="stat-num">{inProgressRequests}</div>
              </div>

              <div className="stat-box green">
                <span className="stat-icon">
                  <CheckCircle2 size={18} />
                </span>
                <div className="stat-label">Finished Requests</div>
                <div className="stat-num">{completedRequestStatuses}</div>
              </div>

              <div className="stat-box purple">
                <span className="stat-icon">
                  <MessageSquare size={18} />
                </span>
                <div className="stat-label">For Compliance / Validation</div>
                <div className="stat-num">{requestProgressRequests}</div>
              </div>
            </div>

            <div className="charts-section" style={{ padding: "0 24px 24px" }}>
              <div className="chart-card">
                <div className="chart-header">
                  <TrendingUp size={20} color="#3B82F6" />
                  <h3>Request Status Share</h3>
                </div>
                <p className="chart-note">
                  Assigned requests grouped by their current status.
                </p>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={requestStatusData}
                      dataKey="value"
                      cx="50%"
                      cy="48%"
                      innerRadius={62}
                      outerRadius={94}
                      paddingAngle={2}
                    >
                      {requestStatusData.map((entry, index) => (
                        <Cell
                          key={`request-status-share-${index}`}
                          fill={entry.color}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value} request(s)`, "Count"]}
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

              <div className="chart-card">
                <div className="chart-header">
                  <FileText size={20} color="#8B5CF6" />
                  <h3>Request Types</h3>
                </div>
                <p className="chart-note">
                  Top assigned request types by certificate category.
                </p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={requestTypeData}
                    margin={{ top: 6, right: 10, left: -10, bottom: 18 }}
                  >
                    <CartesianGrid strokeDasharray="4 4" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="name"
                      interval={0}
                      tick={{ fontSize: 11, fill: "#6B7280" }}
                    />
                    <YAxis allowDecimals={false} tick={{ fill: "#6B7280" }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "10px",
                        border: "1px solid #E5E7EB",
                        boxShadow: "0 8px 16px rgba(0,0,0,0.08)",
                      }}
                    />
                    <Bar dataKey="value" name="Requests" radius={[6, 6, 0, 0]}>
                      {requestTypeData.map((entry, index) => (
                        <Cell
                          key={`request-type-${index}`}
                          fill={entry.color}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
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
                      {item.itemType === "complaint" ? (
                        <p className="task-category">
                          Category: {item.categoryLabel || "Uncategorized"}
                        </p>
                      ) : null}
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
