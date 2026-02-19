import React, { useState } from 'react';
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
import '../../styles/BarangayOfficial.css';

const OfficialDashboard = () => {
  const [tasks] = useState({
    total: 2,
    pending: 0,
    inProgress: 1,
    completed: 1,
  });

  const [taskDistribution] = useState([
    { name: 'Certificates', value: 2 },
    { name: 'Complaints', value: 0 },
    { name: 'Business', value: 0 },
  ]);

  const [statusBreakdown] = useState([
    { name: 'Pending', value: 0, color: '#FDB750' },
    { name: 'In Progress', value: 1, color: '#4A90E2' },
    { name: 'Completed', value: 1, color: '#50C878' },
    { name: 'Rejected', value: 0, color: '#EF4444' },
  ]);

  const [recentTasks] = useState([
    {
      id: 1,
      title: 'Certificate of Indigency Request',
      submittedBy: 'user',
      status: 'IN-PROGRESS',
      statusColor: '#4A90E2',
    },
    {
      id: 2,
      title: 'Barangay Clearance Request',
      submittedBy: 'user',
      status: 'COMPLETED',
      statusColor: '#50C878',
    },
  ]);

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
            {recentTasks.map((task) => (
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
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfficialDashboard;
