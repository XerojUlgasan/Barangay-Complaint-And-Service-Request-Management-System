import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabse_db/supabase_client';
import { getAnnouncements } from '../supabse_db/announcement/announcement'; // adjust path if needed
import './userlanding.css';

const Announcements = () => {
  const navigate = useNavigate();

  const [userName, setUserName] = useState('');
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

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

      // ✅ Using getAnnouncements function
      const result = await getAnnouncements();
      if (result.success) setAnnouncements(result.data);

      setLoading(false);
    };

    fetchData();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getPriorityClass = (priority) => {
    if (!priority) return '';
    if (priority.toLowerCase() === 'high') return 'ann-priority high';
    if (priority.toLowerCase() === 'medium') return 'ann-priority medium';
    return 'ann-priority normal';
  };

  const getCategoryIcon = (category) => {
    if (!category) return null;
    if (category.toLowerCase() === 'event') return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
        <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
      </svg>
    );
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    );
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
            <a href="/requests">
              <svg viewBox="0 0 24 24">
                <path d="M4 4h16v16H4z"/><path d="M8 2v4M16 2v4M4 10h16"/>
              </svg>
              My Requests
            </a>
            <a href="/announcements" className="active">
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
            <h3>Announcements</h3>
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
          <div className="ann-content">
            <h1 className="ann-page-title">Announcements</h1>
            <p className="ann-page-sub">Stay updated with official barangay announcements</p>

            {loading ? (
              <p style={{ color: '#888' }}>Loading announcements...</p>
            ) : announcements.length === 0 ? (
              <p style={{ color: '#888' }}>No announcements yet.</p>
            ) : (
              <div className="ann-grid">
                {announcements.map((ann) => (
                  <div className="ann-card" key={ann.id}>
                    {ann.image_url && (
                      <div className="ann-image">
                        <img src={ann.image_url} alt={ann.title} />
                      </div>
                    )}
                    <div className="ann-body">
                      <div className="ann-meta-top">
                        <span className="ann-category">
                          {getCategoryIcon(ann.category)}
                          {ann.category}
                        </span>
                        {ann.priority && ann.priority.toLowerCase() !== 'normal' && (
                          <span className={getPriorityClass(ann.priority)}>
                            {ann.priority.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <h3 className="ann-title">{ann.title}</h3>
                      <p className="ann-description">{ann.content}</p>
                      <div className="ann-footer">
                        <span className="ann-author">Admin</span>
                        <span className="ann-date">{formatDate(ann.created_at)}</span>
                      </div>
                    </div>
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

export default Announcements;