import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { getOfficialPerformanceMetrics, getAllOfficialsPerformance } from "../../supabse_db/official/officialPerformance";
import { Bar, Doughnut, Pie } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend } from "chart.js";
import "../../styles/BarangayOfficial.css";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

const OfficialDashboard = () => {
  const { user } = useAuth();
  const [timeFilter, setTimeFilter] = useState("all");
  const [dashboardData, setDashboardData] = useState(null);
  const [teamPerformance, setTeamPerformance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [timeFilter]);

  const fetchData = async () => {
    setLoading(true);
    const [dataResult, teamResult] = await Promise.all([
      getOfficialPerformanceMetrics(user?.id, timeFilter),
      getAllOfficialsPerformance(timeFilter)
    ]);

    if (dataResult.success) setDashboardData(dataResult.data);
    if (teamResult.success) setTeamPerformance(teamResult.data);
    setLoading(false);
  };

  const getTimeFilterLabel = () => {
    const labels = { "7d": "Last 7 Days", "30d": "Last 30 Days", "90d": "Last 90 Days", "all": "All Time" };
    return labels[timeFilter] || "All Time";
  };

  const claimedUnclaimedRequestsData = dashboardData ? {
    labels: ["Unclaimed", "Claimed"],
    datasets: [{
      data: [dashboardData.unclaimedRequests, dashboardData.claimedRequests],
      backgroundColor: ["rgba(239, 68, 68, 0.6)", "rgba(34, 197, 94, 0.6)"],
      borderColor: ["rgba(239, 68, 68, 1)", "rgba(34, 197, 94, 1)"],
      borderWidth: 1
    }]
  } : null;

  const claimedUnclaimedComplaintsData = dashboardData ? {
    labels: ["Unclaimed", "Claimed"],
    datasets: [{
      data: [dashboardData.unclaimedComplaints, dashboardData.claimedComplaints],
      backgroundColor: ["rgba(239, 68, 68, 0.6)", "rgba(34, 197, 94, 0.6)"],
      borderColor: ["rgba(239, 68, 68, 1)", "rgba(34, 197, 94, 1)"],
      borderWidth: 1
    }]
  } : null;

  const complaintTypesData = dashboardData?.complaints ? (() => {
    const typeCounts = {};
    dashboardData.complaints.forEach(c => {
      let type = c.complaint_type || "Uncategorized";
      if (type.toLowerCase().startsWith("others:")) {
        type = "Others";
      }
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    return {
      labels: Object.keys(typeCounts),
      datasets: [{
        data: Object.values(typeCounts),
        backgroundColor: ["rgba(255, 99, 132, 0.6)", "rgba(54, 162, 235, 0.6)", "rgba(255, 206, 86, 0.6)", "rgba(75, 192, 192, 0.6)", "rgba(153, 102, 255, 0.6)", "rgba(255, 159, 64, 0.6)"],
        borderWidth: 1
      }]
    };
  })() : null;

  const complaintCategoriesData = dashboardData?.complaints ? (() => {
    const categoryCounts = {};
    dashboardData.complaints.forEach(c => {
      const category = c.category || "Uncategorized";
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    return {
      labels: Object.keys(categoryCounts),
      datasets: [{
        data: Object.values(categoryCounts),
        backgroundColor: ["rgba(16, 185, 129, 0.6)", "rgba(14, 165, 233, 0.6)", "rgba(239, 68, 68, 0.6)", "rgba(139, 92, 246, 0.6)", "rgba(156, 163, 175, 0.6)"],
        borderWidth: 1
      }]
    };
  })() : null;

  const certificateTypesData = dashboardData?.requests ? (() => {
    const typeCounts = {};
    dashboardData.requests.forEach(r => {
      const type = r.certificate_type || "Uncategorized";
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    return {
      labels: Object.keys(typeCounts),
      datasets: [{
        data: Object.values(typeCounts),
        backgroundColor: ["rgba(59, 130, 246, 0.6)", "rgba(16, 185, 129, 0.6)", "rgba(245, 158, 11, 0.6)", "rgba(236, 72, 153, 0.6)", "rgba(139, 92, 246, 0.6)"],
        borderWidth: 1
      }]
    };
  })() : null;

  const requestStatusData = dashboardData?.requests ? (() => {
    const statusCounts = {};
    dashboardData.requests.forEach(r => {
      const status = r.request_status || "Unknown";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    return {
      labels: Object.keys(statusCounts),
      datasets: [{
        label: "Requests",
        data: Object.values(statusCounts),
        backgroundColor: ["rgba(245, 158, 11, 0.6)", "rgba(139, 92, 246, 0.6)", "rgba(37, 99, 235, 0.6)", "rgba(14, 165, 233, 0.6)", "rgba(20, 184, 166, 0.6)", "rgba(16, 185, 129, 0.6)", "rgba(239, 68, 68, 0.6)"],
        borderColor: ["rgba(245, 158, 11, 1)", "rgba(139, 92, 246, 1)", "rgba(37, 99, 235, 1)", "rgba(14, 165, 233, 1)", "rgba(20, 184, 166, 1)", "rgba(16, 185, 129, 1)", "rgba(239, 68, 68, 1)"],
        borderWidth: 1
      }]
    };
  })() : null;

  const teamComparisonData = teamPerformance.length > 0 ? {
    labels: teamPerformance.slice(0, 10).map(o => o.name),
    datasets: [{
      label: "Total Actions",
      data: teamPerformance.slice(0, 10).map(o => o.totalActions),
      backgroundColor: "rgba(75, 192, 192, 0.6)",
      borderColor: "rgba(75, 192, 192, 1)",
      borderWidth: 1
    }]
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      title: { display: false }
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-state">Loading dashboard data...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Official Dashboard</h1>
        <div className="time-filter-buttons">
          <button className={timeFilter === "7d" ? "active" : ""} onClick={() => setTimeFilter("7d")}>Last 7 Days</button>
          <button className={timeFilter === "30d" ? "active" : ""} onClick={() => setTimeFilter("30d")}>Last 30 Days</button>
          <button className={timeFilter === "90d" ? "active" : ""} onClick={() => setTimeFilter("90d")}>Last 90 Days</button>
          <button className={timeFilter === "all" ? "active" : ""} onClick={() => setTimeFilter("all")}>All Time</button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="section">
        <h2>Summary Statistics - {getTimeFilterLabel()}</h2>
        <div className="stats-grid">
          <div className="stat-box">
            <h3>{dashboardData?.unclaimedRequests || 0}</h3>
            <p>Unclaimed Requests</p>
          </div>
          <div className="stat-box">
            <h3>{dashboardData?.claimedRequests || 0}</h3>
            <p>Claimed Requests</p>
          </div>
          <div className="stat-box">
            <h3>{dashboardData?.unclaimedComplaints || 0}</h3>
            <p>Unclaimed Complaints</p>
          </div>
          <div className="stat-box">
            <h3>{dashboardData?.claimedComplaints || 0}</h3>
            <p>Claimed Complaints</p>
          </div>
        </div>

        <div className="charts-row">
          <div className="chart-container">
            <h3>Requests: Claimed vs Unclaimed</h3>
            <div style={{ height: "300px" }}>
              {claimedUnclaimedRequestsData && <Pie data={claimedUnclaimedRequestsData} options={chartOptions} />}
            </div>
          </div>
          <div className="chart-container">
            <h3>Complaints: Claimed vs Unclaimed</h3>
            <div style={{ height: "300px" }}>
              {claimedUnclaimedComplaintsData && <Pie data={claimedUnclaimedComplaintsData} options={chartOptions} />}
            </div>
          </div>
        </div>
      </div>

      {/* Complaints Section */}
      <div className="section">
        <h2>Complaints Analytics</h2>
        <div className="charts-row">
          <div className="chart-container">
            <h3>Complaint Types Distribution</h3>
            <div style={{ height: "300px" }}>
              {complaintTypesData && <Doughnut data={complaintTypesData} options={chartOptions} />}
            </div>
          </div>
          <div className="chart-container">
            <h3>Complaint Categories Distribution</h3>
            <div style={{ height: "300px" }}>
              {complaintCategoriesData && <Doughnut data={complaintCategoriesData} options={chartOptions} />}
            </div>
          </div>
        </div>
      </div>

      {/* Requests Section */}
      <div className="section">
        <h2>Requests Analytics</h2>
        <div className="charts-row">
          <div className="chart-container">
            <h3>Certificate Types Distribution</h3>
            <div style={{ height: "300px" }}>
              {certificateTypesData && <Pie data={certificateTypesData} options={chartOptions} />}
            </div>
          </div>
          <div className="chart-container">
            <h3>Request Status Distribution</h3>
            <div style={{ height: "300px" }}>
              {requestStatusData && <Bar data={requestStatusData} options={chartOptions} />}
            </div>
          </div>
        </div>
      </div>

      {/* Team Comparison */}
      <div className="section">
        <h2>Team Performance Comparison</h2>
        <div className="charts-row">
          <div className="chart-container" style={{ gridColumn: "1 / -1" }}>
            <h3>Top 10 Officials by Total Actions (History)</h3>
            <div style={{ height: "400px" }}>
              {teamComparisonData && <Bar data={teamComparisonData} options={chartOptions} />}
            </div>
          </div>
        </div>

        <div className="leaderboard-table">
          <h3>Officials Leaderboard</h3>
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Name</th>
                <th>Position</th>
                <th>Total Actions</th>
                <th>Request Actions</th>
                <th>Complaint Actions</th>
              </tr>
            </thead>
            <tbody>
              {teamPerformance.map((official, index) => (
                <tr key={official.uid} className={official.uid === user?.id ? "highlight-row" : ""}>
                  <td>{index + 1}</td>
                  <td>{official.name}</td>
                  <td>{official.position}</td>
                  <td>{official.totalActions}</td>
                  <td>{official.totalRequestActions}</td>
                  <td>{official.totalComplaintActions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OfficialDashboard;
