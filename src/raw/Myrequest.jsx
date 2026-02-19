import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRequests } from '../supabse_db/request/request';
import supabase from '../supabse_db/supabase_client';
import './userlanding.css';

const MyRequests = () => {
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [filter, setFilter] = useState('All Status');

  useEffect(() => {
    const fetchData = async () => {
      const { data: userData } = await supabase.auth.getUser();

      if (userData?.user) {
        const { data: memberData } = await supabase
          .from('sample_household_members_tbl')
          .select('firstname, lastname, middlename')
          .eq('auth_uid', userData.user.id)
          .single();

        if (memberData) {
          const fullName = [memberData.firstname, memberData.middlename, memberData.lastname]
            .filter(Boolean)
            .join(' ');
          setUserName(fullName);
        }
      }

      const result = await getRequests();
      if (result.success) setRequests(result.data);

      setLoading(false);
    };

    fetchData();
  }, []);

  const filtered = filter === 'All Status'
    ? requests
    : requests.filter(r => r.request_status === filter);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const getBadgeClass = (status) => {
    if (status === 'Completed')  return 'badge completed';
    if (status === 'In Progress') return 'badge progress';
    if (status === 'Pending')    return 'badge pending';
    if (status === 'Rejected')   return 'badge rejected';
    return 'badge';
  };

  return (
    <div className="user-landing-page">
      <div className="layout">

        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="logo-section">
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" className="shield-logo">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <h2>BARANGAYLINK</h2>
              <p>Resident Services Registry</p>
            </div>
          </div>

          <div className="menu">
            <h4>GENERAL</h4>
            <a href="/dashboard">
              <svg viewBox="0 0 24 24">
                <path d="M3 12l9-9 9 9"/><path d="M9 21V9h6v12"/>
              </svg>
              Dashboard
            </a>

            <h4>SERVICES</h4>
            <a href="/requests" className="active">
              <svg viewBox="0 0 24 24">
                <path d="M4 4h16v16H4z"/><path d="M8 2v4M16 2v4M4 10h16"/>
              </svg>
              My Requests
            </a>
            <a href="/announcements">
              <svg viewBox="0 0 24 24">
                <path d="M3 11l18-5v10l-18-5v4"/>
              </svg>
              Announcements
            </a>
          </div>
        </aside>

        {/* MAIN */}
        <main className="main">

          {/* TOPBAR */}
          <div className="topbar">
            <h3>My Requests</h3>
            <div className="user">
              <div className="user-text">
                <strong>{userName || 'Loading...'}</strong>
                <span>Resident</span>
              </div>
              <button onClick={() => navigate(-1)} className="back-button" title="Go back">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          </div>

          {/* CONTENT */}
          <div className="mr-content">
            <h1 className="mr-page-title">My Requests</h1>
            <p className="mr-page-sub">Track and manage your submitted requests</p>

            {/* FILTER BAR */}
            <div className="mr-filter-bar">
              <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" width="18" height="18">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
              <select
                className="mr-select"
                value={filter}
                onChange={e => setFilter(e.target.value)}
              >
                <option>All Status</option>
                <option>Pending</option>
                <option>In Progress</option>
                <option>Completed</option>
                <option>Rejected</option>
              </select>
              <span className="mr-count">{filtered.length} request{filtered.length !== 1 ? 's' : ''}</span>
            </div>

            {/* CARDS */}
            {loading ? (
              <p style={{ color: '#888' }}>Loading requests...</p>
            ) : filtered.length === 0 ? (
              <p style={{ color: '#888' }}>No requests found.</p>
            ) : (
              <div className="mr-grid">
                {filtered.map(req => (
                  <div className="mr-card" key={req.id}>
                    <div className="mr-card-header">
                      <div className="mr-card-title-block">
                        {req.request_status === 'Completed' ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" width="18" height="18">
                            <circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/>
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" width="18" height="18">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                          </svg>
                        )}
                        <div>
                          <div className="mr-card-title">{req.subject}</div>
                          <div className="mr-card-type">{req.request_type}</div>
                        </div>
                      </div>
                      <span className={getBadgeClass(req.request_status)}>
                        {req.request_status}
                      </span>
                    </div>

                    <p className="mr-description">{req.description}</p>

                    <div className="mr-meta">
                      <div className="mr-meta-row">
                        <span>Submitted:</span>
                        <span>{formatDate(req.created_at)}</span>
                      </div>
                      <div className="mr-meta-row">
                        <span>Assigned:</span>
                        <span>{req.assigned_to || '—'}</span>
                      </div>
                    </div>

                    {req.notes && (
                      <div className="mr-notes">
                        <div className="mr-notes-label">Notes:</div>
                        {req.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
};

export default MyRequests;