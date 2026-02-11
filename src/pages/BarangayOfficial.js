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
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Calendar, CheckCircle2, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import '../styles/BarangayOfficial.css';

/**
 * BarangayOfficial Dashboard Component
 * 
 * This is the main dashboard page for barangay officials.
 * It displays:
 * - Task overview cards (total, pending, in-progress, completed counts)
 * - Task distribution bar chart by type (Certificates, Complaints, Business)
 * - Status breakdown donut/pie chart with color legend
 * - Recent tasks list with status and action buttons
 * - Daily schedule reminder widget
 * 
 * Data Flow:
 * - Currently uses mock data (sample task counts and lists)
 * - TODO: Replace with real data from Supabase database queries
 * - Should fetch tasks from requests table and calculate aggregations
 * - Update counts dynamically when user assigns/manages requests
 * 
 * Performance Notes:
 * - Uses Recharts library for chart rendering
 * - Charts are responsive and auto-scale based on container size
 * - Consider pagination for recent tasks if list grows large
 */
const BarangayOfficial = () => {
  /**
   * Task Statistics State
   * 
   * Tracks overall task counts for the official
   * TODO: Fetch from Supabase: SELECT COUNT(*) ... GROUP BY status
   * Example query:
   * const { data } = await supabase
   *   .from('requests')
   *   .select('status')
   *   .order('created_at', { ascending: false })
   */
  const [tasks, setTasks] = useState({
    total: 2,        // Total assigned requests
    pending: 0,      // Not yet started
    inProgress: 1,   // Currently being processed
    completed: 1,    // Finished/approved
  });

  /**
   * Task Distribution Data
   * 
   * Chart data showing number of requests by type
   * TODO: Calculate from database grouping requests by type
   * Query example:
   * SELECT type, COUNT(*) as value FROM requests GROUP BY type
   */
  const [taskDistribution] = useState([
    { name: 'Certificates', value: 2 },
    { name: 'Complaints', value: 0 },
    { name: 'Business', value: 0 },
  ]);

  /**
   * Status Breakdown Data
   * 
   * Pie chart data showing task distribution by status
   * Each entry needs: name, value (count), color (hex)
   * TODO: Replace with live data from database
   */
  const [statusBreakdown] = useState([
    { name: 'Pending', value: 0, color: '#FDB750' },        // Yellow - not started
    { name: 'In Progress', value: 1, color: '#4A90E2' },   // Blue - being processed
    { name: 'Completed', value: 1, color: '#50C878' },     // Green - done
    { name: 'Rejected', value: 0, color: '#EF4444' },      // Red - denied
  ]);

  /**
   * Recent Tasks List
   * 
   * Shows most recent requests assigned to this official
   * TODO: Fetch from database and sort by updated_at DESC with LIMIT 5
   * Query example:
   * SELECT * FROM requests WHERE assigned_to = user_id
   *   ORDER BY updated_at DESC LIMIT 5
   */
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

  /**
   * Stat Cards Configuration
   * 
   * Array of card objects for displaying task statistics at the top of dashboard
   * Each card shows:
   * - label: What the stat represents
   * - value: Numeric count from tasks state
   * - icon: Lucide icon component to display
   * - bgColor: Light background color for icon container
   * - iconColor: Color of the icon
   */
  const statCards = [
    {
      label: 'My Total Tasks',        // Card label
      value: tasks.total,              // Number from tasks.total
      icon: TrendingUp,                // Icon component
      bgColor: '#F0F9FF',              // Light blue background
      iconColor: '#50C878',            // Green icon
    },
    {
      label: 'Pending',
      value: tasks.pending,
      icon: AlertCircle,
      bgColor: '#FFFBF0',              // Light orange background
      iconColor: '#FDB750',            // Orange icon
    },
    {
      label: 'In Progress',
      value: tasks.inProgress,
      icon: Clock,
      bgColor: '#F0F4FF',              // Light blue background
      iconColor: '#4A90E2',            // Blue icon
    },
    {
      label: 'Completed',
      value: tasks.completed,
      icon: CheckCircle2,
      bgColor: '#F0FDF4',              // Light green background
      iconColor: '#50C878',            // Green icon
    },
  ];

  return (
    <div className="barangay-official-container">
      {/* Dashboard Header - Welcome message */}
      <div className="dashboard-header">
        <h1>Welcome, Barangay Official</h1>
        <p>Your personal task overview and analytics</p>
      </div>

      {/* Stats Grid - displays 4 stat cards horizontally */}
      <div className="stats-grid">
        {/* Map through statCards array and render each card */}
        {statCards.map((card, index) => {
          // Get the icon component from the card object
          const Icon = card.icon;
          return (
            <div key={index} className="stat-card">
              {/* Left side - label and value */}
              <div className="stat-content">
                <p className="stat-label">{card.label}</p>
                <h2 className="stat-value">{card.value}</h2>
              </div>
              {/* Right side - icon with colored background */}
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

      {/* Charts Section - contains bar and pie charts */}
      <div className="charts-section">
        {/* BAR CHART - Shows task distribution by type */}
        <div className="chart-card">
          <div className="chart-header">
            <TrendingUp size={20} color="#50C878" />
            <h3>Task Distribution by Type</h3>
          </div>
          {/* Recharts BarChart component for displaying taskDistribution data */}
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={taskDistribution}>
              {/* Grid background lines */}
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              {/* X-axis showing request types */}
              <XAxis dataKey="name" stroke="#6B7280" />
              {/* Y-axis showing counts */}
              <YAxis stroke="#6B7280" />
              {/* Tooltip that appears on hover */}
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                }}
              />
              {/* Bar component - renders green bars for each request type */}
              <Bar dataKey="value" fill="#50C878" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* PIE CHART - Shows status distribution in donut/pie format */}
        <div className="chart-card">
          <div className="chart-header">
            <TrendingUp size={20} color="#4A90E2" />
            <h3>Status Breakdown</h3>
          </div>
          {/* Pie chart container */}
          <div className="pie-chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                {/* Pie rendering statusBreakdown data */}
                <Pie
                  data={statusBreakdown}
                  cx="50%"                    // Center X position
                  cy="50%"                    // Center Y position
                  innerRadius={80}            // Inner radius for donut effect
                  outerRadius={110}           // Outer radius
                  dataKey="value"             // Data key to use for values
                  startAngle={90}             // Start angle
                  endAngle={450}              // End angle (full circle)
                >
                  {/* Color each pie slice based on statusBreakdown colors */}
                  {statusBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Legend showing status names and counts */}
          <div className="status-legend">
            {statusBreakdown.map((status, index) => (
              <div key={index} className="legend-item">
                {/* Color swatch for legend */}
                <span
                  className="legend-color"
                  style={{ backgroundColor: status.color }}
                ></span>
                {/* Legend label with status name and count */}
                <span className="legend-label">
                  {status.name}: {status.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION - Recent tasks and daily schedule widgets */}
      <div className="bottom-section">
        {/* RECENT TASKS CARD - Shows latest requests */}
        <div className="recent-tasks-card">
          <div className="card-header">
            <TrendingUp size={20} color="#50C878" />
            <h3>Recent Tasks</h3>
          </div>
          {/* List of recent tasks */}
          <div className="tasks-list">
            {recentTasks.map((task) => (
              <div key={task.id} className="task-item">
                {/* Task icon (checkmark) */}
                <div className="task-icon">
                  <CheckCircle2 size={20} color="#50C878" />
                </div>
                {/* Task details - title and submitter */}
                <div className="task-details">
                  <h4 className="task-title">{task.title}</h4>
                  <p className="task-submitted">Submitted by: {task.submittedBy}</p>
                </div>
                {/* Status badge with dynamic color */}
                <span
                  className="task-status"
                  style={{ backgroundColor: task.statusColor }}
                >
                  {task.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* DAILY SCHEDULE CARD - Reminder widget */}
        <div className="daily-schedule-card">
          {/* Calendar icon */}
          <Calendar size={24} color="#FFFFFF" />
          <h3>Daily Schedule</h3>
          {/* Reminder message */}
          <p>Don't forget to check all pending requests before the end of your shift today.</p>
          {/* Button to view full schedule (TODO: implement navigation) */}
          <button className="schedule-button">View Full Schedule</button>
        </div>
      </div>
    </div>
  );
};

export default BarangayOfficial;
