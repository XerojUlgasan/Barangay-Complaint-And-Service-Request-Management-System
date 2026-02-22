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
} from "recharts";
import { CheckCircle2, Clock, AlertCircle, TrendingUp } from "lucide-react";
import {
  getAssignedComplaints,
  getAssignedRequests,
} from "../../supabse_db/official/official";
import "../../styles/BarangayOfficial.css";

const OfficialDashboard = () => {
  const [requestStats, setRequestStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  });

  const [complaintStats, setComplaintStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  });

  const [requestDistribution, setRequestDistribution] = useState([
    { name: "Certificates", value: 0 },
    { name: "Business", value: 0 },
    { name: "Other Services", value: 0 },
  ]);

  const [complaintStatusBreakdown, setComplaintStatusBreakdown] = useState([
    { name: "Pending", value: 0, color: "#FDB750" },
    { name: "In Progress", value: 1, color: "#4A90E2" },
    { name: "Completed", value: 1, color: "#50C878" },
    { name: "Rejected", value: 0, color: "#EF4444" },
  ]);

  const [requestStatusBreakdown, setRequestStatusBreakdown] = useState([
    { name: "Pending", value: 0, color: "#FDB750" },
    { name: "In Progress", value: 1, color: "#4A90E2" },
    { name: "Completed", value: 1, color: "#50C878" },
    { name: "Rejected", value: 0, color: "#EF4444" },
  ]);

  const [recentComplaints, setRecentComplaints] = useState([]);
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const complaintsResult = await getAssignedComplaints();
      const requestsResult = await getAssignedRequests();

      console.log("Dashboard - Complaints Result:", complaintsResult);
      console.log("Dashboard - Requests Result:", requestsResult);

      // Handle error responses from database functions
      if (!complaintsResult.success || !requestsResult.success) {
        console.error("Failed to fetch dashboard data:", {
          complaintsError: complaintsResult.message,
          requestsError: requestsResult.message,
        });
        setLoading(false);
        return;
      }

      // Unwrap data from successful responses
      const complaints = complaintsResult.data || [];
      const requests = requestsResult.data || [];

      console.log("Dashboard - Unwrapped Complaints:", complaints);
      console.log("Dashboard - Unwrapped Requests:", requests);

      // Calculate REQUESTS statistics
      const requestPending = requests.filter(
        (r) => r.status === "pending",
      ).length;
      const requestInProgress = requests.filter(
        (r) => r.status === "in_progress",
      ).length;
      const requestCompleted = requests.filter(
        (r) => r.status === "completed",
      ).length;
      const requestRejected = requests.filter(
        (r) => r.status === "rejected",
      ).length;

      setRequestStats({
        total: requests.length,
        pending: requestPending,
        inProgress: requestInProgress,
        completed: requestCompleted,
      });

      // Calculate COMPLAINTS statistics
      const complaintPending = complaints.filter(
        (c) => c.status === "pending",
      ).length;
      const complaintInProgress = complaints.filter(
        (c) => c.status === "in_progress",
      ).length;
      const complaintCompleted = complaints.filter(
        (c) => c.status === "completed",
      ).length;
      const complaintRejected = complaints.filter(
        (c) => c.status === "rejected",
      ).length;

      setComplaintStats({
        total: complaints.length,
        pending: complaintPending,
        inProgress: complaintInProgress,
        completed: complaintCompleted,
      });

      // Calculate request distribution by certificate type
      const certificatesCount = (requests || []).filter((r) => {
        const type = r.certificate_type
          ? r.certificate_type.toUpperCase()
          : "UNKNOWN";
        return (
          type.includes("CERTIFICATE") ||
          type.includes("BARANGAY") ||
          type.includes("INDIGENCY") ||
          type.includes("CLEARANCE")
        );
      }).length;

      const businessCount = (requests || []).filter((r) => {
        const type = r.certificate_type
          ? r.certificate_type.toUpperCase()
          : "UNKNOWN";
        return type.includes("BUSINESS") || type.includes("PERMIT");
      }).length;

      const otherServicesCount = (requests || []).filter((r) => {
        const type = r.certificate_type
          ? r.certificate_type.toUpperCase()
          : "UNKNOWN";
        const isCertificate =
          type.includes("CERTIFICATE") ||
          type.includes("BARANGAY") ||
          type.includes("INDIGENCY") ||
          type.includes("CLEARANCE");
        const isBusiness = type.includes("BUSINESS") || type.includes("PERMIT");
        return !isCertificate && !isBusiness;
      }).length;

      setRequestDistribution([
        { name: "Certificates", value: certificatesCount },
        { name: "Business", value: businessCount },
        { name: "Other Services", value: otherServicesCount },
      ]);

      // Request status breakdown
      setRequestStatusBreakdown([
        { name: "Pending", value: requestPending, color: "#F59E0B" },
        { name: "In Progress", value: requestInProgress, color: "#0EA5E9" },
        { name: "Completed", value: requestCompleted, color: "#10B981" },
        { name: "Rejected", value: requestRejected, color: "#EF4444" },
      ]);

      // Complaint status breakdown
      setComplaintStatusBreakdown([
        { name: "Pending", value: complaintPending, color: "#F59E0B" },
        { name: "In Progress", value: complaintInProgress, color: "#0EA5E9" },
        { name: "Completed", value: complaintCompleted, color: "#10B981" },
        { name: "Rejected", value: complaintRejected, color: "#EF4444" },
      ]);

      // Format recent requests
      const formattedRecentRequests = requests.slice(0, 5).map((request) => {
        let statusColor = "#0EA5E9";
        if (request.status === "completed") statusColor = "#10B981";
        else if (request.status === "pending") statusColor = "#F59E0B";
        else if (request.status === "rejected") statusColor = "#EF4444";

        return {
          id: request.id,
          title: `${request.certificate_type} Request`,
          submittedBy: request.requester_name || "User",
          status: request.status,
          statusColor: statusColor,
        };
      });

      // Format recent complaints
      const formattedRecentComplaints = complaints
        .slice(0, 5)
        .map((complaint) => {
          let statusColor = "#0EA5E9";
          if (complaint.status === "completed") statusColor = "#10B981";
          else if (complaint.status === "pending") statusColor = "#F59E0B";
          else if (complaint.status === "rejected") statusColor = "#EF4444";

          return {
            id: complaint.id,
            title: `Complaint: ${complaint.complaint_type || "Untitled"}`,
            submittedBy: complaint.complainant_name || "User",
            status: complaint.status,
            statusColor: statusColor,
          };
        });

      console.log(
        "Dashboard - Formatted Recent Requests:",
        formattedRecentRequests,
      );
      console.log(
        "Dashboard - Formatted Recent Complaints:",
        formattedRecentComplaints,
      );

      setRecentRequests(formattedRecentRequests);
      setRecentComplaints(formattedRecentComplaints);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setLoading(false);
    }
  };

  const requestStatCards = [
    {
      label: "Total Requests",
      value: requestStats.total,
      icon: TrendingUp,
      bgColor: "#F0F9FF",
      iconColor: "#50C878",
    },
    {
      label: "Pending",
      value: requestStats.pending,
      icon: AlertCircle,
      bgColor: "#FFFBF0",
      iconColor: "#FDB750",
    },
    {
      label: "In Progress",
      value: requestStats.inProgress,
      icon: Clock,
      bgColor: "#F0F4FF",
      iconColor: "#4A90E2",
    },
    {
      label: "Completed",
      value: requestStats.completed,
      icon: CheckCircle2,
      bgColor: "#F0FDF4",
      iconColor: "#50C878",
    },
  ];

  const complaintStatCards = [
    {
      label: "Total Complaints",
      value: complaintStats.total,
      icon: TrendingUp,
      bgColor: "#F0F9FF",
      iconColor: "#50C878",
    },
    {
      label: "Pending",
      value: complaintStats.pending,
      icon: AlertCircle,
      bgColor: "#FFFBF0",
      iconColor: "#FDB750",
    },
    {
      label: "In Progress",
      value: complaintStats.inProgress,
      icon: Clock,
      bgColor: "#F0F4FF",
      iconColor: "#4A90E2",
    },
    {
      label: "Completed",
      value: complaintStats.completed,
      icon: CheckCircle2,
      bgColor: "#F0FDF4",
      iconColor: "#50C878",
    },
  ];

  return (
    <div className="barangay-official-container">
      <div className="dashboard-header">
        <h1>Welcome, Barangay Official</h1>
        <p>Your personal requests and complaints overview</p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <p>Loading dashboard data...</p>
        </div>
      ) : (
        <>
          {/* REQUESTS SECTION */}
          <div className="dashboard-section">
            <h2 className="section-title">Service Requests</h2>

            <div className="stats-grid">
              {requestStatCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <div key={index} className="stat-card">
                    <div className="stat-content">
                      <p className="stat-label">{card.label}</p>
                      <h2 className="stat-value">{card.value}</h2>
                    </div>
                    <div
                      className="stat-icon"
                      style={{ backgroundColor: card.bgColor }}
                    >
                      <Icon size={24} color={card.iconColor} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="charts-section">
              <div className="chart-card">
                <div className="chart-header">
                  <TrendingUp size={20} color="#50C878" />
                  <h3>Request Distribution by Type</h3>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={requestDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" stroke="#6B7280" />
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

              <div className="chart-card">
                <div className="chart-header">
                  <TrendingUp size={20} color="#4A90E2" />
                  <h3>Request Status Breakdown</h3>
                </div>
                <div className="pie-chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={requestStatusBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={110}
                        dataKey="value"
                        startAngle={90}
                        endAngle={450}
                      >
                        {requestStatusBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="status-legend">
                  {requestStatusBreakdown.map((status, index) => (
                    <div key={index} className="legend-item">
                      <span
                        className="legend-color"
                        style={{ backgroundColor: status.color }}
                      ></span>
                      <span className="legend-label">
                        {status.name}: {status.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="recent-section">
              <div className="recent-tasks-card">
                <div className="card-header">
                  <TrendingUp size={20} color="#50C878" />
                  <h3>Recent Requests</h3>
                </div>
                <div className="tasks-list">
                  {recentRequests.length > 0 ? (
                    recentRequests.map((request) => (
                      <div key={request.id} className="task-item">
                        <div className="task-icon">
                          <CheckCircle2 size={20} color="#50C878" />
                        </div>
                        <div className="task-details">
                          <h4 className="task-title">{request.title}</h4>
                          <p className="task-submitted">
                            Submitted by: {request.submittedBy}
                          </p>
                        </div>
                        <span
                          className="task-status"
                          style={{ backgroundColor: request.statusColor }}
                        >
                          {request.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: "#6B7280" }}>No recent requests yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* COMPLAINTS SECTION */}
          <div className="dashboard-section">
            <h2 className="section-title">Complaints</h2>

            <div className="stats-grid">
              {complaintStatCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <div key={index} className="stat-card">
                    <div className="stat-content">
                      <p className="stat-label">{card.label}</p>
                      <h2 className="stat-value">{card.value}</h2>
                    </div>
                    <div
                      className="stat-icon"
                      style={{ backgroundColor: card.bgColor }}
                    >
                      <Icon size={24} color={card.iconColor} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="charts-section">
              <div className="chart-card">
                <div className="chart-header">
                  <TrendingUp size={20} color="#4A90E2" />
                  <h3>Complaint Status Breakdown</h3>
                </div>
                <div className="pie-chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={complaintStatusBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={110}
                        dataKey="value"
                        startAngle={90}
                        endAngle={450}
                      >
                        {complaintStatusBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="status-legend">
                  {complaintStatusBreakdown.map((status, index) => (
                    <div key={index} className="legend-item">
                      <span
                        className="legend-color"
                        style={{ backgroundColor: status.color }}
                      ></span>
                      <span className="legend-label">
                        {status.name}: {status.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="recent-section">
              <div className="recent-tasks-card">
                <div className="card-header">
                  <TrendingUp size={20} color="#50C878" />
                  <h3>Recent Complaints</h3>
                </div>
                <div className="tasks-list">
                  {recentComplaints.length > 0 ? (
                    recentComplaints.map((complaint) => (
                      <div key={complaint.id} className="task-item">
                        <div className="task-icon">
                          <CheckCircle2 size={20} color="#50C878" />
                        </div>
                        <div className="task-details">
                          <h4 className="task-title">{complaint.title}</h4>
                          <p className="task-submitted">
                            Submitted by: {complaint.submittedBy}
                          </p>
                        </div>
                        <span
                          className="task-status"
                          style={{ backgroundColor: complaint.statusColor }}
                        >
                          {complaint.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: "#6B7280" }}>
                      No recent complaints yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default OfficialDashboard;
