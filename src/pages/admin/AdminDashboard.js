import React, { useState, useRef, useEffect } from "react";
import { Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import '../../styles/BarangayAdmin.css';
import { getRequests } from '../../supabse_db/request/request';
import { getAnnouncements } from '../../supabse_db/announcement/announcement';
import { getAllOfficials, getAllResidents } from '../../supabse_db/superadmin/superadmin';

// Simple inline BarChart using SVG so we don't add dependencies
function BarChart({ data = [], labels = [] }) {
  const max = Math.max(...data, 1);
  const w = 360;
  const h = 160;
  const padding = 20;
  const bw = (w - padding * 2) / data.length - 10;
  const ref = useRef();
  const [tip, setTip] = useState({ visible: false, x: 0, y: 0, label: '', value: 0 });

  const onBarEnter = (e, v, i) => {
    const box = ref.current.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top - 10;
    setTip({ visible: true, x, y, label: labels[i] || '', value: v });
  };

  const onBarLeave = () => setTip({ visible: false, x: 0, y: 0, label: '', value: 0 });

  return (
    <div className="chart-wrapper" ref={ref}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%">
        {/* grid lines */}
        {[0,1,2,3,4].map((i)=>{
          const y = padding + (h - padding*2) * (i/4);
          return <line key={i} x1={padding} x2={w-padding} y1={y} y2={y} stroke="#eef2f7" />
        })}
        {data.map((v,i)=>{
          const x = padding + i*(bw+12);
          const barH = ((h - padding*2) * v) / max;
          const y = h - padding - barH;
          return (
            <g key={i}>
              <rect x={x} y={y} width={bw} height={barH} rx="6" fill="#10b981"
                onMouseEnter={(e)=>onBarEnter(e,v,i)} onMouseMove={(e)=>onBarEnter(e,v,i)} onMouseLeave={onBarLeave} />
              <text x={x + bw/2} y={h - 6} fontSize="11" textAnchor="middle" fill="#4b5563">{labels[i]}</text>
            </g>
          )
        })}
      </svg>
      {tip.visible && (
        <div className="chart-tooltip" style={{left: tip.x, top: tip.y}}>
          <div className="tt-label">{tip.label}</div>
          <div className="tt-value">requests : {tip.value}</div>
        </div>
      )}
    </div>
  )
}

// Minimal DonutChart SVG
function DonutChart({ segments = [], labels = ['Pending','In Progress','Completed','Rejected'] }){
  const total = segments.reduce((s,seg)=>s+seg.value,0) || 1;
  const size = 160;
  const r = 52;
  let angle = -90;
  const cx = size/2;
  const cy = size/2;
  const ref = useRef();
  const [tip, setTip] = useState({visible:false,x:0,y:0,label:'',value:0});

  const arcs = segments.map((seg,idx)=>{
    const frac = seg.value / total;
    const start = angle;
    const end = angle + frac*360;
    angle = end;
    const large = (end - start) > 180 ? 1 : 0;
    const sx = cx + r * Math.cos((Math.PI/180)*start);
    const sy = cy + r * Math.sin((Math.PI/180)*start);
    const ex = cx + r * Math.cos((Math.PI/180)*end);
    const ey = cy + r * Math.sin((Math.PI/180)*end);
    const d = `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`;
    return {d, color: seg.color||'#ccc', value: seg.value, label: labels[idx] || ''};
  })

  const onSegEnter = (e, seg) => {
    const box = ref.current.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top - 10;
    setTip({visible:true,x,y,label:seg.label,value:seg.value});
  }
  const onSegLeave = ()=> setTip({visible:false,x:0,y:0,label:'',value:0});

  return (
    <div className="chart-wrapper" ref={ref}>
      <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="100%">
        <g transform={`translate(0,0)`}>{
          arcs.map((a,i)=>(
            <path key={i} d={a.d} stroke={a.color} strokeWidth={18} fill="none" strokeLinecap="round"
              onMouseEnter={(e)=>onSegEnter(e,a)} onMouseMove={(e)=>onSegEnter(e,a)} onMouseLeave={onSegLeave} />
          ))
        }</g>
      </svg>
      {tip.visible && (
        <div className="chart-tooltip" style={{left: tip.x, top: tip.y}}>
          <div className="tt-label">{tip.label}</div>
          <div className="tt-value">{tip.value}</div>
        </div>
      )}
    </div>
  )
}

function DashboardView({ requests = [], announcements = [] }) {
  // Calculate status counts from requests
  const pendingCount = requests.filter(r => r.status === 'Pending').length;
  const inProgressCount = requests.filter(r => r.status === 'In Progress').length;
  const completedCount = requests.filter(r => r.status === 'Completed').length;
  const rejectedCount = requests.filter(r => r.status === 'Rejected').length;
  const totalRequests = requests.length;

  console.log('DashboardView: Requests array:', requests);
  console.log('DashboardView: Status counts:', { pendingCount, inProgressCount, completedCount, rejectedCount, totalRequests });

  // Get recent 2 requests for live feed
  const recentRequests = requests.slice(0, 2);

  return (
    <div className="admin-page">
      <section className="analytics">
        <div className="analytics-header">
          <h3>System Analytics</h3>
          <p className="muted">Overview of barangay services and activities</p>
        </div>
        <div className="top-cards">
          <div className="large-card">
            <div className="large-card-left">
              <div className="large-card-title">Total Requests</div>
              <div className="large-card-number">{totalRequests}</div>
              <div className="large-card-sub">Active service requests</div>
            </div>
            <div className="large-card-icon">
              <div className="icon-pill">📄</div>
            </div>
          </div>

          <div className="large-card">
            <div className="large-card-left">
              <div className="large-card-title">Public Announcements</div>
              <div className="large-card-number">{announcements.length}</div>
              <div className="large-card-sub">Community updates</div>
            </div>
            <div className="large-card-icon">
              <div className="icon-pill orange">📣</div>
            </div>
          </div>
        </div>

        <div className="stat-row">
          <div className="stat-box yellow">
            <span className="stat-icon"><Clock size={18} /></span>
            <div className="stat-label">Pending</div>
            <div className="stat-num">{pendingCount}</div>
          </div>
          <div className="stat-box blue">
            <span className="stat-icon"><AlertCircle size={18} /></span>
            <div className="stat-label">Progress</div>
            <div className="stat-num">{inProgressCount}</div>
          </div>
          <div className="stat-box green">
            <span className="stat-icon"><CheckCircle size={18} /></span>
            <div className="stat-label">Done</div>
            <div className="stat-num">{completedCount}</div>
          </div>
          <div className="stat-box red">
            <span className="stat-icon"><XCircle size={18} /></span>
            <div className="stat-label">Rejected</div>
            <div className="stat-num">{rejectedCount}</div>
          </div>
        </div>

        <div className="charts-grid">
          <div className="chart-card big">
            <div className="chart-header">Submission Trends</div>
            <div className="chart-body">
              <BarChart data={[12,18,14,22,18,2]} labels={["Sep","Oct","Nov","Dec","Jan","Feb"]} />
            </div>
          </div>

          <div className="chart-card big">
            <div className="chart-header">Service Distribution</div>
            <div className="chart-body donut">
              <DonutChart segments={[
                {value:pendingCount,color:'#f59e0b'},
                {value:inProgressCount,color:'#0ea5e9'},
                {value:completedCount,color:'#10b981'},
                {value:rejectedCount,color:'#ef4444'}
              ]} />
            </div>
            <div className="status-legend">
              <div className="legend-item"><span className="legend-color" style={{background:'#f59e0b'}}></span><span className="legend-label">Pending</span></div>
              <div className="legend-item"><span className="legend-color" style={{background:'#0ea5e9'}}></span><span className="legend-label">In Progress</span></div>
              <div className="legend-item"><span className="legend-color" style={{background:'#10b981'}}></span><span className="legend-label">Completed</span></div>
              <div className="legend-item"><span className="legend-color" style={{background:'#ef4444'}}></span><span className="legend-label">Rejected</span></div>
            </div>
          </div>
        </div>

        <div className="live-feed">
          <div className="live-header">Live Request Feed <span className="badge">REAL-TIME</span></div>
          <div className="feed-list">
            {recentRequests.length > 0 ? (
              recentRequests.map((req) => (
                <div className="feed-item" key={req.id}>
                  <div className="feed-icon">📄</div>
                  <div className="feed-body">
                    <div className="feed-title">{req.subject || 'Request'}</div>
                    <div className="feed-sub muted">{req.certificate_type || 'Service Request'} • {new Date(req.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className={`feed-status ${req.status?.toLowerCase().replace(' ', '-')}`}>{req.status || 'Pending'}</div>
                </div>
              ))
            ) : (
              <div className="feed-item">
                <div className="feed-body">
                  <div className="feed-title">No requests yet</div>
                  <div className="feed-sub muted">Requests will appear here</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function AnnouncementsView({ announcements = [] }) {
  return (
    <div className="admin-page">
      <div className="page-actions">
        <h3>Manage Announcements</h3>
        <button className="btn-primary">+ New Announcement</button>
      </div>

      <div className="list">
        {announcements.length > 0 ? (
          announcements.map((it) => (
            <div className="list-item" key={it.id}>
              <div className="list-item-left">
                <img src="https://via.placeholder.com/160x100" alt="ann" />
              </div>
              <div className="list-item-body">
                <h4>{it.title}</h4>
                <p className="muted">Posted on {new Date(it.created_at).toLocaleDateString()}</p>
              </div>
              <div className="list-item-actions">
                <button className="btn">Edit</button>
                <button className="btn danger">Delete</button>
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
            <p>No announcements yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

function RequestsView({ requests = [] }) {
  return (
    <div className="admin-page">
      <h3>System-wide Requests</h3>
      <div className="table">
        <div className="table-row table-head">
          <div>ID</div>
          <div>Requester</div>
          <div>Type</div>
          <div>Status</div>
          <div>Date</div>
          <div>Action</div>
        </div>
        {requests.length > 0 ? (
          requests.map((r) => (
            <div className="table-row" key={r.id}>
              <div>#{r.id}</div>
              <div>{r.requester_name || 'Unknown'}</div>
              <div>{r.certificate_type || 'Service Request'}</div>
              <div><span className={`status ${r.status?.toLowerCase().replace(' ', '_')}`}>{r.status || 'Pending'}</span></div>
              <div>{new Date(r.created_at).toLocaleDateString()}</div>
              <div>
                <button className="btn">View</button>
                <button className="btn">Approve</button>
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
            <p>No requests yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

function UsersView({ officials = [], residents = [] }) {
  const allUsers = [
    ...officials.map(o => ({
      id: o.id,
      name: o.full_name || `${o.firstname} ${o.lastname}`,
      role: "Official",
      status: "Active"
    })),
    ...residents.slice(0, 3).map(r => ({
      id: r.id,
      name: r.full_name || `${r.firstname} ${r.lastname}`,
      role: "Resident",
      status: "Active"
    }))
  ];

  return (
    <div className="admin-page">
      <h3>User Management</h3>
      <div className="table">
        <div className="table-row table-head">
          <div>Name</div>
          <div>Role</div>
          <div>Status</div>
          <div>Action</div>
        </div>
        {allUsers.length > 0 ? (
          allUsers.map((u) => (
            <div className="table-row" key={u.id}>
              <div>{u.name}</div>
              <div>{u.role}</div>
              <div>{u.status}</div>
              <div>
                <button className="btn">Edit</button>
                <button className="btn danger">Delete</button>
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
            <p>No users found</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [active, setActive] = useState("Dashboard");
  const [requests, setRequests] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [officials, setOfficials] = useState([]);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sample data for demonstration
  const SAMPLE_REQUESTS = [
    { id: 1, subject: 'Certificate of Indigency Request', certificate_type: 'Indigency Certificate', status: 'In Progress', requester_name: 'Maria Santos', created_at: '2026-02-10T10:30:00', description: 'Poverty certification' },
    { id: 2, subject: 'Barangay Clearance Application', certificate_type: 'Barangay Clearance', status: 'Completed', requester_name: 'Juan Dela Cruz', created_at: '2026-02-15T14:20:00', description: 'Employment requirement' },
    { id: 3, subject: 'Business Permit Application', certificate_type: 'Business Permit', status: 'Pending', requester_name: 'Ana Garcia', created_at: '2026-02-18T09:15:00', description: 'Small business registration' },
    { id: 4, subject: 'Complaint: Illegal Dumping', certificate_type: 'Complaint', status: 'In Progress', requester_name: 'Pedro Montoya', created_at: '2026-02-12T16:45:00', description: 'Environmental concern' },
    { id: 5, subject: 'Street Repair Request', certificate_type: 'Infrastructure', status: 'Rejected', requester_name: 'Rosa Magsaysay', created_at: '2026-02-08T11:00:00', description: 'Road maintenance' },
  ];

  const SAMPLE_ANNOUNCEMENTS = [
    { id: 1, title: 'Community Clean-Up Drive', content: 'Join us for a community clean-up event', created_at: '2026-02-15', priority: 'high' },
    { id: 2, title: 'Garbage Collection Schedule Change', content: 'New schedule announced', created_at: '2026-02-14', priority: 'medium' },
  ];

  // Fetch all data on component mount
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch requests
        const requestsResult = await getRequests();
        console.log('Dashboard: Requests result:', requestsResult);
        if (requestsResult.success && Array.isArray(requestsResult.data)) {
          console.log('Dashboard: Requests data:', requestsResult.data);
          console.log('Dashboard: Request count:', requestsResult.data.length);
          if (requestsResult.data.length > 0) {
            console.log('Dashboard: First request sample:', requestsResult.data[0]);
            console.log('Dashboard: Status values in data:', requestsResult.data.map(r => r.status));
            setRequests(requestsResult.data);
          } else {
            console.log('Dashboard: No requests in database, using sample data');
            setRequests(SAMPLE_REQUESTS);
          }
        } else {
          setRequests(SAMPLE_REQUESTS);
        }

        // Fetch announcements
        const announcementsResult = await getAnnouncements();
        console.log('Dashboard: Announcements result:', announcementsResult);
        if (announcementsResult.success && Array.isArray(announcementsResult.data)) {
          if (announcementsResult.data.length > 0) {
            setAnnouncements(announcementsResult.data);
          } else {
            setAnnouncements(SAMPLE_ANNOUNCEMENTS);
          }
        } else {
          setAnnouncements(SAMPLE_ANNOUNCEMENTS);
        }

        // Fetch officials
        const officialsResult = await getAllOfficials();
        if (officialsResult.success && Array.isArray(officialsResult.data)) {
          setOfficials(officialsResult.data);
        }

        // Fetch residents
        const residentResult = await getAllResidents();
        if (residentResult.success && Array.isArray(residentResult.data)) {
          setResidents(residentResult.data);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Error loading dashboard data');
        setRequests(SAMPLE_REQUESTS);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  let Content = null;
  if (active === "Dashboard") Content = <DashboardView requests={requests} announcements={announcements} />;
  if (active === "Announcements") Content = <AnnouncementsView announcements={announcements} />;
  if (active === "Requests") Content = <RequestsView requests={requests} />;
  if (active === "Users") Content = <UsersView officials={officials} residents={residents} />;

  return (
    <div className="admin-root">
      <div className="admin-main">
        <main className="admin-content">{Content}</main>
      </div>
    </div>
  );
}
