import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRequests } from '../supabse_db/request/request';
import supabase from '../supabse_db/supabase_client'; // adjust path if needed
import './userlanding.css';

const UserLanding = () => {
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      // Get authenticated user
      const { data: userData } = await supabase.auth.getUser();

      if (userData?.user) {
        // Fetch member name from household members table
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

      // Fetch requests
      const result = await getRequests();
      if (result.success) {
        setRequests(result.data);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const handleBack = () => {
    navigate(-1);
  };

  const pendingCount    = requests.filter(r => r.request_status === 'Pending').length;
  const inProgressCount = requests.filter(r => r.request_status === 'In Progress').length;
  const completedCount  = requests.filter(r => r.request_status === 'Completed').length;

  const recentRequests = requests.slice(0, 3);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const getBadgeClass = (status) => {
    if (status === 'Completed') return 'badge completed';
    if (status === 'In Progress') return 'badge progress';
    if (status === 'Pending') return 'badge pending';
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
            <a href="/dashboard" className="active">
              <svg viewBox="0 0 24 24">
                <path d="M3 12l9-9 9 9"/>
                <path d="M9 21V9h6v12"/>
              </svg>
              Dashboard
            </a>

            <h4>SERVICES</h4>
            <a href="/requests">
              <svg viewBox="0 0 24 24">
                <path d="M4 4h16v16H4z"/>
                <path d="M8 2v4M16 2v4M4 10h16"/>
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

        {/* MAIN CONTENT */}
        <main className="main">

          {/* TOPBAR */}
          <div className="topbar">
            <h3>Dashboard</h3>
            <div className="user">
              <div className="user-text">
                <strong>{userName || 'Loading...'}</strong>
                <span>Resident</span>
              </div>
              <button onClick={handleBack} className="back-button" title="Go back">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          </div>

          {/* WELCOME */}
          <div className="welcome">
            <h1>Welcome, {userName || '...'}!</h1>
            <p>Manage your barangay services and requests</p>
          </div>

          {/* ACTION CARDS */}
          <div className="action-cards">
            <a href="/submit" className="card blue clickable">
              <div className="circle">+</div>
              <div className="card-content">
                <h3>Submit New Request</h3>
                <p>File complaints or request services</p>
              </div>
            </a>
            <a href="/announcements" className="card green clickable">
              <div className="circle">!</div>
              <div className="card-content">
                <h3>Announcements</h3>
                <p>View barangay announcements</p>
              </div>
            </a>
          </div>

          {/* STATUS CARDS */}
          <div className="status-cards">
            <div className="status">
              <div className="status-left">
                <p>Pending</p>
                <h2>{loading ? '...' : pendingCount}</h2>
              </div>
              <div className="status-icon yellow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
              </div>
            </div>
            <div className="status">
              <div className="status-left">
                <p>In Progress</p>
                <h2>{loading ? '...' : inProgressCount}</h2>
              </div>
              <div className="status-icon blue-icon">!</div>
            </div>
            <div className="status">
              <div className="status-left">
                <p>Completed</p>
                <h2>{loading ? '...' : completedCount}</h2>
              </div>
              <div className="status-icon green-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M9 12l2 2 4-4"/>
                </svg>
              </div>
            </div>
          </div>

          {/* RECENT REQUESTS */}
          <div className="recent">
            <div className="recent-header">
              <h3>Recent Requests</h3>
              <a href="/requests">View all</a>
            </div>

            {loading ? (
              <p style={{ padding: '16px', color: '#888' }}>Loading requests...</p>
            ) : recentRequests.length === 0 ? (
              <p style={{ padding: '16px', color: '#888' }}>No requests yet.</p>
            ) : (
              recentRequests.map((req) => (
                <div className="request-item" key={req.id}>
                  <div className="icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M6 2H14L20 8V22H6V2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                      <path d="M14 2V8H20" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                      <path d="M9 13H15M9 17H15" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <div className="details">
                    <h4>{req.subject}</h4>
                    <p>{req.description}</p>
                    <span>{formatDate(req.created_at)}</span>
                  </div>
                  <span className={getBadgeClass(req.request_status)}>
                    {req.request_status}
                  </span>
                </div>
              ))
            )}
          </div>

        </main>
      </div>
    </div>
  );
};

export default UserLanding;