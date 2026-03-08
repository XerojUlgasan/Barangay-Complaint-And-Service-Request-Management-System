import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getComplaints, getComplaintHistory } from '../supabse_db/complaint/complaint';
import { logout } from '../supabse_db/auth/auth';
import supabase from '../supabse_db/supabase_client';
import './userlanding.css';

const MyComplaints = () => {
  const navigate = useNavigate();

  // Tab: 'filed' = complaints I filed, 'against' = complaints filed against me
  const [activeTab, setActiveTab] = useState('filed');

  const [complaints, setComplaints] = useState([]);
  const [againstComplaints, setAgainstComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [againstLoading, setAgainstLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userName, setUserName] = useState('');
  const [filter, setFilter] = useState('All Status');
  const [againstFilter, setAgainstFilter] = useState('All Status');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsComplaint, setDetailsComplaint] = useState(null);
  const [detailsIsAgainst, setDetailsIsAgainst] = useState(false);

  // Against me detail modal
  const [showAgainstModal, setShowAgainstModal] = useState(false);
  const [againstDetail, setAgainstDetail] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: userData } = await supabase.auth.getUser();

      if (userData?.user) {
        setCurrentUserId(userData.user.id);

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

        // Fetch complaints filed against the current user
        const { data: againstData, error: againstError } = await supabase
          .from('complaint_tbl')
          .select(`
            *,
            complainant:complainant_id (
              firstname,
              lastname,
              middlename
            ),
            assigned_official:assigned_official_id (
              firstname,
              lastname
            )
          `)
          .contains('respondent_id', [userData.user.id]);

        if (!againstError && againstData) {
          const mapped = againstData.map(c => ({
            ...c,
            complainant_name: c.complainant
              ? [c.complainant.firstname, c.complainant.middlename, c.complainant.lastname].filter(Boolean).join(' ')
              : '—',
            assigned_official_name: c.assigned_official
              ? [c.assigned_official.firstname, c.assigned_official.lastname].filter(Boolean).join(' ')
              : null,
          }));
          setAgainstComplaints(mapped);
        }
        setAgainstLoading(false);
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

      const hasPending = sorted.some((item) => normalize(item.status) === 'pending');
      if (!hasPending) {
        sorted.push({
          id: 'initial-pending',
          status: 'pending',
          remarks: null,
          updater_name: null,
          priority_level: null,
          created_at: complaint.created_at,
          updated_at: complaint.created_at,
        });
      }
      setHistoryData(sorted);
    }
    setHistoryLoading(false);
  };

  const handleViewDetails = (complaint) => {
    setDetailsComplaint(complaint);
    setShowDetailsModal(true);
  };

  const handleViewAgainst = (complaint) => {
    setAgainstDetail(complaint);
    setShowAgainstModal(true);
  };

  const closeSidebar = () => setSidebarOpen(false);

  const normalize = (str) => (str || '').toLowerCase().replace(/[\s_-]/g, '');

  const filtered = filter === 'All Status'
    ? complaints
    : complaints.filter(c => normalize(c.status) === normalize(filter));

  const filteredAgainst = againstFilter === 'All Status'
    ? againstComplaints
    : againstComplaints.filter(c => normalize(c.status) === normalize(againstFilter));

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
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
    if (n === 'forvalidation')                 return 'badge forvalidation';
    if (n === 'noncompliant')                  return 'badge noncompliant';
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

  const formatRespondents = (respondentId) => {
    if (!respondentId) return null;
    if (Array.isArray(respondentId)) return respondentId.join(', ');
    return respondentId;
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
                  <p className="modal-empty-text">Loading history...</p>
                ) : historyData.length === 0 ? (
                  <p className="modal-empty-text">No history available yet.</p>
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

        {/* MY COMPLAINT DETAILS MODAL */}
        {showDetailsModal && detailsComplaint && (
          <div className="logout-modal-overlay" onClick={() => setShowDetailsModal(false)}>
            <div className="details-modal" onClick={e => e.stopPropagation()}>
              <div className="history-modal-header">
                <div>
                  <h3 className="history-modal-title">Complaint Details</h3>
                  <p className="history-modal-sub">{detailsComplaint.complaint_type}</p>
                </div>
                <button className="history-modal-close" onClick={() => setShowDetailsModal(false)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="history-modal-body">
                <div className="details-grid">
                  <div className="details-row">
                    <span className="details-label">Status</span>
                    <span className={getBadgeClass(detailsComplaint.status)}>
                      {formatStatus(detailsComplaint.status) || 'Pending'}
                    </span>
                  </div>
                  <div className="details-row">
                    <span className="details-label">Priority</span>
                    <span className="details-value">{detailsComplaint.priority_level || 'Not set'}</span>
                  </div>
                  <div className="details-row">
                    <span className="details-label">Submitted</span>
                    <span className="details-value">{formatDate(detailsComplaint.created_at)}</span>
                  </div>
                  <div className="details-row">
                    <span className="details-label">Incident Date</span>
                    <span className="details-value">{formatDate(detailsComplaint.incident_date)}</span>
                  </div>
                  <div className="details-row">
                    <span className="details-label">Location</span>
                    <span className="details-value">{detailsComplaint.incident_location || '—'}</span>
                  </div>
                  <div className="details-row">
                    <span className="details-label">Respondents</span>
                    <span className="details-value">
                      {detailsComplaint.assigned_official_name || formatRespondents(detailsComplaint.respondent_id) || '—'}
                    </span>
                  </div>
                  {detailsComplaint.description && (
                    <div className="details-full">
                      <span className="details-label">Description</span>
                      <p className="details-desc">{detailsComplaint.description}</p>
                    </div>
                  )}
                  {detailsComplaint.remarks && (
                    <div className="details-full">
                      <span className="details-label">Remarks</span>
                      <p className="details-desc">{detailsComplaint.remarks}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* COMPLAINT AGAINST ME MODAL */}
        {showAgainstModal && againstDetail && (
          <div className="logout-modal-overlay" onClick={() => setShowAgainstModal(false)}>
            <div className="details-modal" onClick={e => e.stopPropagation()}>
              <div className="history-modal-header">
                <div>
                  <h3 className="history-modal-title">Complaint Against You</h3>
                  <p className="history-modal-sub">{againstDetail.complaint_type}</p>
                </div>
                <button className="history-modal-close" onClick={() => setShowAgainstModal(false)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="history-modal-body">

                {/* Who filed */}
                <div className="against-filer-box">
                  <div className="against-filer-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" width="20" height="20">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                  <div>
                    <div className="against-filer-label">Filed by</div>
                    <div className="against-filer-name">{againstDetail.complainant_name}</div>
                  </div>
                </div>

                <div className="details-grid">
                  <div className="details-row">
                    <span className="details-label">Status</span>
                    <span className={getBadgeClass(againstDetail.status)}>
                      {formatStatus(againstDetail.status) || 'Pending'}
                    </span>
                  </div>
                  <div className="details-row">
                    <span className="details-label">Priority</span>
                    <span className="details-value">{againstDetail.priority_level || 'Not set'}</span>
                  </div>
                  <div className="details-row">
                    <span className="details-label">Submitted</span>
                    <span className="details-value">{formatDate(againstDetail.created_at)}</span>
                  </div>
                  <div className="details-row">
                    <span className="details-label">Incident Date</span>
                    <span className="details-value">{formatDate(againstDetail.incident_date)}</span>
                  </div>
                  <div className="details-row">
                    <span className="details-label">Location</span>
                    <span className="details-value">{againstDetail.incident_location || '—'}</span>
                  </div>
                  {againstDetail.assigned_official_name && (
                    <div className="details-row">
                      <span className="details-label">Assigned Official</span>
                      <span className="details-value">{againstDetail.assigned_official_name}</span>
                    </div>
                  )}
                  {againstDetail.description && (
                    <div className="details-full">
                      <span className="details-label">Description</span>
                      <p className="details-desc">{againstDetail.description}</p>
                    </div>
                  )}
                  {againstDetail.remarks && (
                    <div className="details-full">
                      <span className="details-label">Remarks from Official</span>
                      <p className="details-desc details-desc-remarks">{againstDetail.remarks}</p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}

        {/* MOBILE SIDEBAR OVERLAY */}
        <div className={`sidebar-overlay${sidebarOpen ? ' visible' : ''}`} onClick={closeSidebar} />

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
              <svg viewBox="0 0 24 24"><path d="M3 12l9-9 9 9"/><path d="M9 21V9h6v12"/></svg>
              Dashboard
            </a>
            <h4>SERVICES</h4>
            <a href="/requests" onClick={closeSidebar}>
              <svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/><path d="M8 2v4M16 2v4M4 10h16"/></svg>
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
              <svg viewBox="0 0 24 24"><path d="M3 11l18-5v10l-18-5v4"/></svg>
              Announcements
            </a>
          </div>
        </aside>

        {/* MAIN */}
        <main className="main">

          {/* TOPBAR */}
          <div className="topbar">
            <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
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
            <p className="mr-page-sub">Track and manage your complaint records</p>

            {/* ── TAB SWITCHER ── */}
            <div className="complaints-tab-bar">
              <button
                className={`complaints-tab${activeTab === 'filed' ? ' active' : ''}`}
                onClick={() => setActiveTab('filed')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                Complaints I Filed
                <span className="tab-count">{complaints.length}</span>
              </button>
              <button
                className={`complaints-tab${activeTab === 'against' ? ' active against' : ''}`}
                onClick={() => setActiveTab('against')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                Filed Against Me
                {againstComplaints.length > 0 && (
                  <span className="tab-count against">{againstComplaints.length}</span>
                )}
              </button>
            </div>

            {/* ── TAB: COMPLAINTS I FILED ── */}
            {activeTab === 'filed' && (
              <>
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
                  <p className="mr-empty-text">Loading complaints...</p>
                ) : filtered.length === 0 ? (
                  <p className="mr-empty-text">No complaints found.</p>
                ) : (
                  <div className="mr-grid-4">
                    {filtered.map(complaint => (
                      <div className="mr-card-compact" key={complaint.id}>
                        <div className="mr-card-compact-header">
                          <div className="mr-card-compact-icon">
                            {normalize(complaint.status) === 'resolved' || normalize(complaint.status) === 'completed' ? (
                              <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" width="14" height="14">
                                <circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/>
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" width="14" height="14">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                <line x1="12" y1="9" x2="12" y2="13"/>
                                <line x1="12" y1="17" x2="12.01" y2="17"/>
                              </svg>
                            )}
                          </div>
                          <span className={getBadgeClass(complaint.status)}>
                            {formatStatus(complaint.status) || 'Pending'}
                          </span>
                        </div>
                        <div className="mr-card-compact-title">{complaint.complaint_type}</div>
                        <p className="mr-card-compact-desc">{complaint.description}</p>
                        <div className="mr-card-compact-actions">
                          <button className="details-btn" onClick={() => handleViewDetails(complaint)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                              <circle cx="12" cy="12" r="10"/>
                              <line x1="12" y1="8" x2="12" y2="12"/>
                              <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            Details
                          </button>
                          <button className="history-btn-compact" onClick={() => handleViewHistory(complaint)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                              <circle cx="12" cy="12" r="10"/>
                              <polyline points="12 6 12 12 16 14"/>
                            </svg>
                            History
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── TAB: FILED AGAINST ME ── */}
            {activeTab === 'against' && (
              <>
                <div className="mr-filter-bar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" width="18" height="18">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                  </svg>
                  <select className="mr-select against-select" value={againstFilter} onChange={e => setAgainstFilter(e.target.value)}>
                    <option>All Status</option>
                    <option>Pending</option>
                    <option>In Progress</option>
                    <option>Resolved</option>
                    <option>Rejected</option>
                    <option>Dismissed</option>
                  </select>
                  <span className="mr-count">{filteredAgainst.length} complaint{filteredAgainst.length !== 1 ? 's' : ''}</span>
                </div>

                {againstLoading ? (
                  <p className="mr-empty-text">Loading...</p>
                ) : filteredAgainst.length === 0 ? (
                  <div className="against-empty">
                    <div className="against-empty-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" width="48" height="48">
                        <path d="M9 12l2 2 4-4"/>
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                      </svg>
                    </div>
                    <p className="against-empty-title">No complaints against you</p>
                    <p className="against-empty-sub">You're all clear — no one has filed a complaint against you.</p>
                  </div>
                ) : (
                  <div className="mr-grid-4">
                    {filteredAgainst.map(complaint => (
                      <div className="mr-card-compact against-card" key={complaint.id}>
                        <div className="mr-card-compact-header">
                          <div className="mr-card-compact-icon against-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" width="14" height="14">
                              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                              <line x1="12" y1="9" x2="12" y2="13"/>
                              <line x1="12" y1="17" x2="12.01" y2="17"/>
                            </svg>
                          </div>
                          <span className={getBadgeClass(complaint.status)}>
                            {formatStatus(complaint.status) || 'Pending'}
                          </span>
                        </div>

                        <div className="mr-card-compact-title">{complaint.complaint_type}</div>

                        {/* Filer info */}
                        <div className="against-card-filer">
                          <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" width="11" height="11">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                          </svg>
                          <span>Filed by: <strong>{complaint.complainant_name}</strong></span>
                        </div>

                        <p className="mr-card-compact-desc">{complaint.description}</p>

                        <div className="mr-card-compact-actions">
                          <button className="details-btn against-details-btn" onClick={() => handleViewAgainst(complaint)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                              <circle cx="12" cy="12" r="10"/>
                              <line x1="12" y1="8" x2="12" y2="12"/>
                              <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

          </div>
        </main>
      </div>
    </div>
  );
};

export default MyComplaints;