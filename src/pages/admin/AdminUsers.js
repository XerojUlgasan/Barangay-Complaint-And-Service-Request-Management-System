import React from 'react';
import { Users, User, CheckCircle, Clock, XCircle } from 'lucide-react';
import '../../styles/BarangayAdmin.css';

export default function AdminUsers() {
  const officials = [
    { id: 1, name: 'Maria Santos', username: 'msantos', status: 'Available', assigned: 12 },
    { id: 2, name: 'Pedro Gonzales', username: 'pgonzales', status: 'Busy', assigned: 5 },
    { id: 3, name: 'Ana Reyes', username: 'areyes', status: 'Offline', assigned: 0 },
    { id: 4, name: 'Carlos Dela Cruz', username: 'cdelacruz', status: 'Available', assigned: 8 },
  ];

  const residents = [
    { id: 1, household: 'BRG-2026-001234', name: 'Juan Dela Cruz', username: 'juandel', address: '123 Mabini St.', registered: '2025-11-03', total: 3 },
    { id: 2, household: 'BRG-2026-001235', name: 'Maria Clara', username: 'mclarah', address: '56 Rizal Ave.', registered: '2025-12-11', total: 1 },
    { id: 3, household: 'BRG-2026-001236', name: 'Pedro Santos', username: 'pedros', address: '77 Mabini St.', registered: '2026-01-02', total: 2 },
    { id: 4, household: 'BRG-2026-001237', name: 'Ana Lopez', username: 'analopez', address: '8 Bonifacio Rd.', registered: '2026-01-15', total: 0 },
    { id: 5, household: 'BRG-2026-001238', name: 'Liza Perez', username: 'lperz', address: '12 Del Pilar', registered: '2026-02-01', total: 4 },
  ];

  const badgeFor = (status) => {
    if (status === 'Available') return { className: 'status-badge available', icon: <CheckCircle size={14} /> };
    if (status === 'Busy') return { className: 'status-badge busy', icon: <Clock size={14} /> };
    return { className: 'status-badge offline', icon: <XCircle size={14} /> };
  };

  return (
    <div className="admin-page users-page">
      <div className="page-actions" style={{alignItems:'flex-start', marginBottom: 12}}>
        <div>
          <h3>User Management</h3>
          <p className="muted">Monitor all system users and their activity</p>
        </div>
      </div>

      <div className="users-grid">
        <section className="users-card">
          <div className="card-header">
            <div className="card-header-left"><Users size={20} /> <span>Barangay Officials</span></div>
            <div className="card-header-right muted">{officials.length} officials</div>
          </div>

          <div className="table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Official</th>
                  <th>Username</th>
                  <th>Status</th>
                  <th>Assigned Requests</th>
                </tr>
              </thead>
              <tbody>
                {officials.map((o) => {
                  const b = badgeFor(o.status);
                  return (
                    <tr key={o.id}>
                      <td className="td-user"><User size={18} className="td-avatar" /> <div>
                        <div className="u-name">{o.name}</div>
                      </div></td>
                      <td>@{o.username}</td>
                      <td><span className={b.className}>{b.icon}<span className="badge-label">{o.status}</span></span></td>
                      <td>{o.assigned}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="users-card">
          <div className="card-header">
            <div className="card-header-left"><Users size={20} /> <span>Registered Residents</span></div>
            <div className="card-header-right muted">{residents.length} residents</div>
          </div>

          <div className="table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Household ID</th>
                  <th>Full Name</th>
                  <th>Username</th>
                  <th>Address</th>
                  <th>Registered</th>
                  <th>Total Requests</th>
                </tr>
              </thead>
              <tbody>
                {residents.map((r) => (
                  <tr key={r.id}>
                    <td className="mono">{r.household}</td>
                    <td>{r.name}</td>
                    <td>@{r.username}</td>
                    <td>{r.address}</td>
                    <td className="muted">{r.registered}</td>
                    <td>{r.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
