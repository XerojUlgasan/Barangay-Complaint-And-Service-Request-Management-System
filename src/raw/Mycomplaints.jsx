import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getComplaints, getComplaintHistory } from '../supabse_db/complaint/complaint';
import { logout } from '../supabse_db/auth/auth';
import supabase from '../supabse_db/supabase_client';
import './userlanding.css';

const MyComplaints = () => {
  const navigate = useNavigate();

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [filter, setFilter] = useState('All Status');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // History modal state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);

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

      const result = await getComplaints();
      if (result.success) setComplaints(result.data);

      setLoading(false);
    };

    fetchData();
  }, []);

  const handleLogoutConfirm = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleViewHistory = async (complaint) => {
    setSelectedComplaint(complaint);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    setHistoryData([]);

    const result = await getComplaintHistory(complaint.id);
    if (result.success) {
      const sorted = [...result.data].sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at);
        const dateB = new Date(b.updated_at || b.created_at);
        return dateB - dateA;
      });

      // Check if there's already a "pending" entry
      const hasPending = sorted.some(
        (item) => normalize(item.status) === 'pending'
      );

      // If not, inject the initial "Pending" entry using the complaint's created_at
      if (!hasPending) {
        const initialEntry = {
          id: 'initial-pending',
          status: 'pending',
          remarks: null,
          updater_name: null,
          priority_level: null,
          created_at: complaint.created_at,
          updated_at: complaint.created_at,
        };
        sorted.push(initialEntry);
      }

      setHistoryData(sorted);
    }
    setHistoryLoading(false);
  };

  const closeSidebar = () => setSidebarOpen(false);

  const normalize = (str) => (str || '').toLowerCase().replace(/[\s_-]/g, '');

  const filtered = filter === 'All Status'
    ? complaints
    : complaints.filter(c => normalize(c.status) === normalize(filter));

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    });
  };

  const getBadgeClass = (status) => {
    const n = normalize(status);
    if (n === 'resolved' || n === 'completed') return 'badge completed';
    if (n === 'inprogress')                    return 'badge progress';
    if (n === 'pending')                       return 'badge pending';
    if (n === 'rejected' || n === 'dismissed') return 'badge rejected';
    return 'badge';
  };

  const formatStatus = (status) => {
    if (!status) return '';
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const getTimelineDot = (status) => {
    const n = normalize(status);
    if (n === 'resolved' || n === 'completed') return '#059669';
    if (n === 'inprogress')                    return '#2563eb';
    if (n === 'rejected' || n === 'dismissed') return '#dc2626';
    return '#f59e0b';
  };

  return (
    <div className="user-landing-page">
      <div className="layout">

        {/* LOGOUT MODAL */}
        {showLogoutModal && (
          <div className="logout-modal-overlay" onClick={() => setShowLogoutModal(false)}>
            <div className="logout-modal" onClick={e => e.stopPropagation()}>
              <div className="logout-modal-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" width="32" height="32">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </div>
              <h3 className="logout-modal-title">Logout</h3>
              <p className="logout-modal-message">Are you sure you want to logout?</p>
              <div className="logout-modal-actions">
                <button className="logout-modal-no" onClick={() => setShowLogoutModal(false)}>No, Stay</button>
                <button className="logout-modal-yes" onClick={handleLogoutConfirm}>Yes, Logout</button>
              </div>
            </div>
          </div>
        )}

        {/* HISTORY MODAL */}
        {showHistoryModal && (
          <div className="logout-modal-overlay" onClick={() => setShowHistoryModal(false)}>
            <div className="history-modal" onClick={e => e.stopPropagation()}>
              <div className="history-modal-header">
                <div>
                  <h3 className="history-modal-title">Complaint History</h3>
                  {selectedComplaint && (
                    <p className="history-modal-sub">{selectedComplaint.complaint_type}</p>
                  )}
                </div>
                <button className="history-modal-close" onClick={() => setShowHistoryModal(false)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="history-modal-body">
                {historyLoading ? (
                  <p style={{ color: '#888', textAlign: 'center', padding: '24px' }}>Loading history...</p>
                ) : historyData.length === 0 ? (
                  <p style={{ color: '#888', textAlign: 'center', padding: '24px' }}>No history available yet.</p>
                ) : (
                  <div className="history-timeline">
                    {historyData.map((item, index) => (
                      <div className="timeline-item" key={item.id || index}>
                        <div className="timeline-dot" style={{ backgroundColor: getTimelineDot(item.status) }} />
                        {index < historyData.length - 1 && <div className="timeline-line" />}
                        <div className="timeline-content">
                          <div className="timeline-status">{formatStatus(item.status)}</div>
                          {item.priority_level && (
                            <div className="timeline-priority">Priority: {item.priority_level}</div>
                          )}
                          {item.remarks && (
                            <div className="timeline-remarks">"{item.remarks}"</div>
                          )}
                          <div className="timeline-meta">
                            {item.updater_name && (
                              <span className="timeline-official">by {item.updater_name}</span>
                            )}
                            <span className="timeline-date">{formatDateTime(item.updated_at || item.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MOBILE SIDEBAR OVERLAY */}
        <div
          className={`sidebar-overlay${sidebarOpen ? ' visible' : ''}`}
          onClick={closeSidebar}
        />

        {/* SIDEBAR */}
        <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
          <button className="sidebar-close" onClick={closeSidebar} aria-label="Close menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

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
            <a href="/dashboard" onClick={closeSidebar}>
              <svg viewBox="0 0 24 24">
                <path d="M3 12l9-9 9 9"/><path d="M9 21V9h6v12"/>
              </svg>
              Dashboard
            </a>

            <h4>SERVICES</h4>
            <a href="/requests" onClick={closeSidebar}>
              <svg viewBox="0 0 24 24">
                <path d="M4 4h16v16H4z"/><path d="M8 2v4M16 2v4M4 10h16"/>
              </svg>
              My Requests
            </a>
            <a href="/complaints" className="active" onClick={closeSidebar}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              My Complaints
            </a>
            <a href="/announcements" onClick={closeSidebar}>
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
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <h3>My Complaints</h3>
            <div className="user">
              <div className="user-text">
                <strong>{userName || 'Loading...'}</strong>
                <span>Resident</span>
              </div>
              <button onClick={() => setShowLogoutModal(true)} className="back-button" title="Logout">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          </div>

          {/* CONTENT */}
          <div className="mr-content">
            <h1 className="mr-page-title">My Complaints</h1>
            <p className="mr-page-sub">Track and manage your submitted complaints</p>

            <div className="mr-filter-bar">
              <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" width="18" height="18">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
              <select className="mr-select" value={filter} onChange={e => setFilter(e.target.value)}>
                <option>All Status</option>
                <option>Pending</option>
                <option>In Progress</option>
                <option>Resolved</option>
                <option>Rejected</option>
                <option>Dismissed</option>
              </select>
              <span className="mr-count">{filtered.length} complaint{filtered.length !== 1 ? 's' : ''}</span>
            </div>

            {loading ? (
              <p style={{ color: '#888' }}>Loading complaints...</p>
            ) : filtered.length === 0 ? (
              <p style={{ color: '#888' }}>No complaints found.</p>
            ) : (
              <div className="mr-grid">
                {filtered.map(complaint => (
                  <div className="mr-card" key={complaint.id}>
                    <div className="mr-card-header">
                      <div className="mr-card-title-block">
                        {normalize(complaint.status) === 'resolved' || normalize(complaint.status) === 'completed' ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" width="18" height="18">
                            <circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/>
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" width="18" height="18">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                          </svg>
                        )}
                        <div>
                          <div className="mr-card-title">{complaint.complaint_type}</div>
                          <div className="mr-card-type">
                            {complaint.priority_level ? `Priority: ${complaint.priority_level}` : 'No priority set'}
                          </div>
                        </div>
                      </div>
                      <span className={getBadgeClass(complaint.status)}>
                        {formatStatus(complaint.status) || 'Pending'}
                      </span>
                    </div>

                    <p className="mr-description">{complaint.description}</p>

                    <div className="mr-meta">
                      <div className="mr-meta-row">
                        <span>Submitted:</span>
                        <span>{formatDate(complaint.created_at)}</span>
                      </div>
                      <div className="mr-meta-row">
                        <span>Assigned:</span>
                        <span>{complaint.assigned_official_name || '—'}</span>
                      </div>
                      {complaint.incident_date && (
                        <div className="mr-meta-row">
                          <span>Incident Date:</span>
                          <span>{formatDate(complaint.incident_date)}</span>
                        </div>
                      )}
                      {complaint.incident_location && (
                        <div className="mr-meta-row">
                          <span>Location:</span>
                          <span>{complaint.incident_location}</span>
                        </div>
                      )}
                    </div>

                    {complaint.remarks && (
                      <div className="mr-notes">
                        <div className="mr-notes-label">Remarks:</div>
                        {complaint.remarks}
                      </div>
                    )}

                    <button className="history-btn" onClick={() => handleViewHistory(complaint)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                      View History
                    </button>
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

export default MyComplaints;