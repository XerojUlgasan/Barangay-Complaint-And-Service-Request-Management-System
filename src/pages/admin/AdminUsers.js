import React, { useState, useEffect } from 'react';
import { Users, User, CheckCircle, Clock, XCircle } from 'lucide-react';
import { getAllOfficials, getAllResidents } from '../../supabse_db/superadmin/superadmin';
import '../../styles/BarangayAdmin.css';

export default function AdminUsers() {
  const [officials, setOfficials] = useState([]);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch officials and residents on component mount
  useEffect(() => {
    fetchUsersData();
  }, []);

  const fetchUsersData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all officials
      const officialsResult = await getAllOfficials();
      if (officialsResult.success && Array.isArray(officialsResult.data)) {
        const formattedOfficials = officialsResult.data.map(official => ({
          id: official.id,
          name: official.full_name || 'Unknown',
          username: official.role || 'N/A',
          status: 'Available', // Default status (can be updated based on business logic)
          assigned: 0, // This would require joining with requests table
          email: official.email || 'N/A',
          role: official.role || 'Official',
        }));
        setOfficials(formattedOfficials);
        console.log('Officials loaded:', formattedOfficials);
      } else {
        console.error('Failed to fetch officials:', officialsResult.message);
      }

      // Fetch all residents
      const residentsResult = await getAllResidents();
      if (residentsResult.success && Array.isArray(residentsResult.data)) {
        const formattedResidents = residentsResult.data.map(resident => ({
          id: resident.id,
          household: resident.household?.id || 'N/A',
          name: resident.full_name || 'Unknown',
          username: resident.username || 'N/A',
          address: resident.address || 'N/A',
          registered: resident.created_at ? new Date(resident.created_at).toLocaleDateString() : 'N/A',
          total: 0, // This would require joining with requests table
          email: resident.email || 'N/A',
        }));
        setResidents(formattedResidents);
        console.log('Residents loaded:', formattedResidents);
      } else {
        console.error('Failed to fetch residents:', residentsResult.message);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching users data:', err);
      setError(err.message);
      setLoading(false);
    }
  };

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

      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          color: '#dc2626',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          <p><strong>Error:</strong> {error}</p>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="loading-wrap">
            <div className="loading-spinner" aria-hidden="true"></div>
            <div className="loading-text">Loading user data...</div>
          </div>
        </div>
      ) : (
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
                    <th>Role</th>
                    <th>Email</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {officials.length > 0 ? (
                    officials.map((o) => {
                      const b = badgeFor(o.status);
                      return (
                        <tr key={o.id}>
                          <td className="td-user"><User size={18} className="td-avatar" /> <div>
                            <div className="u-name">{o.name}</div>
                          </div></td>
                          <td>{o.role}</td>
                          <td>{o.email}</td>
                          <td><span className={b.className}>{b.icon}<span className="badge-label">{o.status}</span></span></td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: '#9ca3af' }}>No officials found</td>
                    </tr>
                  )}
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
                    <th>Full Name</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Address</th>
                    <th>Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {residents.length > 0 ? (
                    residents.map((r) => (
                      <tr key={r.id}>
                        <td>{r.name}</td>
                        <td>@{r.username}</td>
                        <td>{r.email}</td>
                        <td>{r.address}</td>
                        <td className="muted">{r.registered}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: '#9ca3af' }}>No residents found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
