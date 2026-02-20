import React, { useState, useEffect } from 'react';
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
} from 'recharts';
import { CheckCircle2, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { getAssignedComplaints, getAssignedRequests } from '../../supabse_db/official/official';
import '../../styles/BarangayOfficial.css';

const OfficialDashboard = () => {
  const [tasks, setTasks] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  });

  const [taskDistribution, setTaskDistribution] = useState([
    { name: 'Certificates', value: 0 },
    { name: 'Complaints', value: 0 },
    { name: 'Business', value: 0 },
  ]);

  const [statusBreakdown, setStatusBreakdown] = useState([
    { name: 'Pending', value: 0, color: '#FDB750' },
    { name: 'In Progress', value: 1, color: '#4A90E2' },
    { name: 'Completed', value: 1, color: '#50C878' },
    { name: 'Rejected', value: 0, color: '#EF4444' },
  ]);

  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const complaintsResult = await getAssignedComplaints();
      const requestsResult = await getAssignedRequests();

      console.log('Dashboard - Complaints Result:', complaintsResult);
      console.log('Dashboard - Requests Result:', requestsResult);

      // Handle error responses from database functions
      if (!complaintsResult.success || !requestsResult.success) {
        console.error('Failed to fetch dashboard data:', {
          complaintsError: complaintsResult.message,
          requestsError: requestsResult.message
        });
        setLoading(false);
        return;
      }

      // Unwrap data from successful responses
      const complaints = complaintsResult.data || [];
      const requests = requestsResult.data || [];

      console.log('Dashboard - Unwrapped Complaints:', complaints);
      console.log('Dashboard - Unwrapped Requests:', requests);

      // Combine both complaints and requests
      const allTasks = [...complaints, ...requests];

      // Helper function to normalize status to uppercase for comparison
      const getNormalizedStatus = (task) => {
        const status = task.request_status || task.status || 'PENDING';
        return status.toUpperCase();
      };

      // Calculate task statistics with normalized status
      const total = allTasks.length;
      const pending = allTasks.filter(task => 
        getNormalizedStatus(task) === 'PENDING'
      ).length;
      const inProgress = allTasks.filter(task => 
        getNormalizedStatus(task) === 'IN_PROGRESS'
      ).length;
      const completed = allTasks.filter(task => 
        getNormalizedStatus(task) === 'COMPLETED'
      ).length;
      const rejected = allTasks.filter(task => 
        getNormalizedStatus(task) === 'REJECTED'
      ).length;

      console.log('Dashboard Statistics:', { total, pending, inProgress, completed, rejected });

      setTasks({
        total,
        pending,
        inProgress,
        completed,
      });

      // Calculate task distribution by type
      console.log('Calculating task distribution...');
      console.log('All requests array:', requests);
      
      if (requests && requests.length > 0) {
        console.log('First request certificate_type:', requests[0].certificate_type);
        requests.forEach((req, index) => {
          console.log(`Request ${index}:`, {
            id: req.id,
            certificate_type: req.certificate_type,
          });
        });
      }
      
      const certificatesCount = (requests || []).filter(r => {
        const type = r.certificate_type ? r.certificate_type.toUpperCase() : 'UNKNOWN';
        const isCertificate = type.includes('CERTIFICATE') || type.includes('BARANGAY') || type.includes('INDIGENCY') || type.includes('CLEARANCE');
        console.log('Certificate check - Type:', r.certificate_type, 'Normalized:', type, 'Is Certificate:', isCertificate);
        return isCertificate;
      }).length;
      
      const complaintsCount = (complaints || []).length;
      
      const complaintsFromRequests = (requests || []).filter(r => {
        const type = r.certificate_type ? r.certificate_type.toUpperCase() : 'UNKNOWN';
        const isComplaint = type.includes('COMPLAINT') || type.includes('NOISE');
        console.log('Complaint check - Type:', r.certificate_type, 'Normalized:', type, 'Is Complaint:', isComplaint);
        return isComplaint;
      }).length;
      
      const otherServicesCount = (requests || []).filter(r => {
        const type = r.certificate_type ? r.certificate_type.toUpperCase() : 'UNKNOWN';
        const isCertificate = type.includes('CERTIFICATE') || type.includes('BARANGAY') || type.includes('INDIGENCY') || type.includes('CLEARANCE');
        const isComplaint = type.includes('COMPLAINT') || type.includes('NOISE');
        const isOther = !isCertificate && !isComplaint;
        console.log('Other services check - Type:', r.certificate_type, 'Is Other:', isOther);
        return isOther;
      }).length;

      const totalComplaints = complaintsCount + complaintsFromRequests;

      console.log('FINAL Task Distribution:', { 
        certificatesCount, 
        complaintsCount: totalComplaints, 
        otherServicesCount, 
        totalRequests: requests.length, 
        totalComplaints: complaints.length 
      });

      setTaskDistribution([
        { name: 'Certificates', value: certificatesCount },
        { name: 'Complaints', value: totalComplaints },
        { name: 'Other Services', value: otherServicesCount },
      ]);

      // Calculate status breakdown with normalized values
      setStatusBreakdown([
        { name: 'Pending', value: pending, color: '#FDB750' },
        { name: 'In Progress', value: inProgress, color: '#4A90E2' },
        { name: 'Completed', value: completed, color: '#50C878' },
        { name: 'Rejected', value: rejected, color: '#EF4444' },
      ]);

      // Format recent tasks (combine and limit to latest 10)
      const formattedRecentTasks = allTasks.slice(0, 10).map(task => {
        const isRequest = !!task.certificate_type;
        const normalizedStatus = getNormalizedStatus(task);
        
        let statusColor = '#4A90E2';
        if (normalizedStatus === 'COMPLETED') statusColor = '#50C878';
        else if (normalizedStatus === 'PENDING') statusColor = '#FDB750';
        else if (normalizedStatus === 'REJECTED') statusColor = '#EF4444';
        else if (normalizedStatus === 'IN_PROGRESS') statusColor = '#4A90E2';

        return {
          id: task.id,
          title: isRequest ? `${task.certificate_type} Request` : `Complaint: ${task.nature_of_complaint || 'Untitled'}`,
          submittedBy: task.requester_name || task.resident_name || 'User',
          status: normalizedStatus,
          statusColor: statusColor,
        };
      });

      console.log('Dashboard - Formatted Recent Tasks:', formattedRecentTasks);

      setRecentTasks(formattedRecentTasks);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const statCards = [
    {
      label: 'My Total Tasks',
      value: tasks.total,
      icon: TrendingUp,
      bgColor: '#F0F9FF',
      iconColor: '#50C878',
    },
    {
      label: 'Pending',
      value: tasks.pending,
      icon: AlertCircle,
      bgColor: '#FFFBF0',
      iconColor: '#FDB750',
    },
    {
      label: 'In Progress',
      value: tasks.inProgress,
      icon: Clock,
      bgColor: '#F0F4FF',
      iconColor: '#4A90E2',
    },
    {
      label: 'Completed',
      value: tasks.completed,
      icon: CheckCircle2,
      bgColor: '#F0FDF4',
      iconColor: '#50C878',
    },
  ];

  return (
    <div className="barangay-official-container">
      <div className="dashboard-header">
        <h1>Welcome, Barangay Official</h1>
        <p>Your personal task overview and analytics</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Loading dashboard data...</p>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            {statCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <div key={index} className="stat-card">
                  <div className="stat-content">
                    <p className="stat-label">{card.label}</p>
                    <h2 className="stat-value">{card.value}</h2>
                  </div>
                  <div className="stat-icon" style={{ backgroundColor: card.bgColor }}>
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
                <h3>Task Distribution by Type</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={taskDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" fill="#50C878" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <TrendingUp size={20} color="#4A90E2" />
                <h3>Status Breakdown</h3>
              </div>
              <div className="pie-chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      dataKey="value"
                      startAngle={90}
                      endAngle={450}
                    >
                      {statusBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="status-legend">
                {statusBreakdown.map((status, index) => (
                  <div key={index} className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: status.color }}></span>
                    <span className="legend-label">{status.name}: {status.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bottom-section">
            <div className="recent-tasks-card">
              <div className="card-header">
                <TrendingUp size={20} color="#50C878" />
                <h3>Recent Tasks</h3>
              </div>
              <div className="tasks-list">
                {recentTasks.length > 0 ? (
                  recentTasks.map((task) => (
                    <div key={task.id} className="task-item">
                      <div className="task-icon">
                        <CheckCircle2 size={20} color="#50C878" />
                      </div>
                      <div className="task-details">
                        <h4 className="task-title">{task.title}</h4>
                        <p className="task-submitted">Submitted by: {task.submittedBy}</p>
                      </div>
                      <span className="task-status" style={{ backgroundColor: task.statusColor }}>{task.status}</span>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#6B7280' }}>No recent tasks yet.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default OfficialDashboard;
