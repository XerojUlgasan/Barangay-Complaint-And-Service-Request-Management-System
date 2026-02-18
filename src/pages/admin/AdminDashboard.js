import React, { useState, useRef } from "react";
import { Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import '../../styles/BarangayAdmin.css';

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

function DashboardView() {
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
              <div className="large-card-number">2</div>
              <div className="large-card-sub">Active residents</div>
            </div>
            <div className="large-card-icon">
              <div className="icon-pill">📄</div>
            </div>
          </div>

          <div className="large-card">
            <div className="large-card-left">
              <div className="large-card-title">Public Announcements</div>
              <div className="large-card-number">2</div>
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
            <div className="stat-num">0</div>
          </div>
          <div className="stat-box blue">
            <span className="stat-icon"><AlertCircle size={18} /></span>
            <div className="stat-label">Progress</div>
            <div className="stat-num">1</div>
          </div>
          <div className="stat-box green">
            <span className="stat-icon"><CheckCircle size={18} /></span>
            <div className="stat-label">Done</div>
            <div className="stat-num">1</div>
          </div>
          <div className="stat-box red">
            <span className="stat-icon"><XCircle size={18} /></span>
            <div className="stat-label">Rejected</div>
            <div className="stat-num">0</div>
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
              <DonutChart segments={[{value:2,color:'#f59e0b'},{value:1,color:'#0ea5e9'},{value:1,color:'#10b981'},{value:0,color:'#ef4444'}]} />
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
            <div className="feed-item">
              <div className="feed-icon">📄</div>
              <div className="feed-body">
                <div className="feed-title">Certificate of Indigency Request</div>
                <div className="feed-sub muted">Certificate of Indigency • 2/6/2026</div>
              </div>
              <div className="feed-status in-progress">IN PROGRESS</div>
            </div>

            <div className="feed-item">
              <div className="feed-icon">📄</div>
              <div className="feed-body">
                <div className="feed-title">Barangay Clearance Request</div>
                <div className="feed-sub muted">Barangay Clearance • 2/3/2026</div>
              </div>
              <div className="feed-status completed">COMPLETED</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function AnnouncementsView() {
  const items = [
    { id: 1, title: "Community Clean-Up Drive", date: "2/7/2026" },
    { id: 2, title: "Garbage Collection Schedule Change", date: "2/6/2026" },
  ];

  return (
    <div className="admin-page">
      <div className="page-actions">
        <h3>Manage Announcements</h3>
        <button className="btn-primary">+ New Announcement</button>
      </div>

      <div className="list">
        {items.map((it) => (
          <div className="list-item" key={it.id}>
            <div className="list-item-left">
              <img src="https://via.placeholder.com/160x100" alt="ann" />
            </div>
            <div className="list-item-body">
              <h4>{it.title}</h4>
              <p className="muted">Posted on {it.date}</p>
            </div>
            <div className="list-item-actions">
              <button className="btn">Edit</button>
              <button className="btn danger">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RequestsView() {
  const rows = [
    { id: 1, name: "Juan Dela Cruz", type: "Certificate", status: "IN_PROGRESS", date: "2/6/2026" },
    { id: 2, name: "Maria Santos", type: "Clearance", status: "COMPLETED", date: "2/3/2026" },
  ];

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
        {rows.map((r) => (
          <div className="table-row" key={r.id}>
            <div>#{r.id}</div>
            <div>{r.name}</div>
            <div>{r.type}</div>
            <div><span className={`status ${r.status.toLowerCase()}`}>{r.status}</span></div>
            <div>{r.date}</div>
            <div>
              <button className="btn">View</button>
              <button className="btn">Approve</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsersView() {
  const users = [
    { id: 1, name: "Maria Santos", role: "Official", status: "Available" },
    { id: 2, name: "Pedro Gonzales", role: "Official", status: "Busy" },
    { id: 3, name: "Ana Reyes", role: "Resident", status: "Available" },
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
        {users.map((u) => (
          <div className="table-row" key={u.id}>
            <div>{u.name}</div>
            <div>{u.role}</div>
            <div>{u.status}</div>
            <div>
              <button className="btn">Edit</button>
              <button className="btn danger">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [active, setActive] = useState("Dashboard");

  let Content = null;
  if (active === "Dashboard") Content = <DashboardView />;
  if (active === "Announcements") Content = <AnnouncementsView />;
  if (active === "Requests") Content = <RequestsView />;
  if (active === "Users") Content = <UsersView />;

  return (
    <div className="admin-root">
      <div className="admin-main">
        <main className="admin-content">{Content}</main>
      </div>
    </div>
  );
}
