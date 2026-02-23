import React, { useState, useEffect } from "react";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import './homepage.css';
import { Link } from 'react-router-dom';
import { getAnnouncements } from '../supabse_db/announcement/announcement';

function Homepage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [annLoading, setAnnLoading] = useState(true);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const result = await getAnnouncements();
      if (result.success) setAnnouncements(result.data);
      setAnnLoading(false);
    };
    fetchAnnouncements();
  }, []);

  return (
    <>
      {/* MOBILE NAV OVERLAY */}
      <div
        className={`hp-mobile-overlay${mobileMenuOpen ? ' visible' : ''}`}
        onClick={closeMobileMenu}
      />

      {/* MOBILE SIDEBAR */}
      <div className={`hp-mobile-sidebar${mobileMenuOpen ? ' open' : ''}`}>
        <button className="hp-mobile-sidebar-close" onClick={closeMobileMenu} aria-label="Close menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <a className="hp-mobile-sidebar-brand" onClick={() => { closeMobileMenu(); scrollToTop(); }} style={{ cursor: 'pointer' }}>
          <img src="/brgyease.png" alt="BarangayEase Logo" className="hp-mobile-logo-img" />
          <span>BarangayEase</span>
        </a>

        <nav className="hp-mobile-nav">
          <a href="#services" onClick={closeMobileMenu}>Features</a>
          <a href="#announcements" onClick={closeMobileMenu}>Announcements</a>
          <Link to="/login" className="hp-mobile-signin-btn" onClick={closeMobileMenu}>Sign In</Link>
        </nav>
      </div>

      {/* NAVBAR */}
      <nav className="hp-navbar">
        <div className="hp-navbar-inner">
          <a className="hp-navbar-brand" onClick={scrollToTop} style={{ cursor: 'pointer' }}>
            <img src="/brgyease.png" alt="BarangayEase Logo" className="hp-navbar-logo-img" />
            <span>BarangayEase</span>
          </a>

          {/* Desktop nav links */}
          <ul className="hp-nav-links">
            <li><a href="#services">Features</a></li>
            <li><a id="announce-link" href="#announcements">Announcements</a></li>
            <li>
              <Link to="/login" className="hp-signin-btn">Sign In</Link>
            </li>
          </ul>

          {/* Hamburger button — mobile only */}
          <button
            className="hp-hamburger-btn"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
      </nav>

      {/* HERO */}
      <div className="hp-hero-section">
        <div className="hp-hero-left">
          <span className="hp-badge">
            <span className="hp-badge-dot"></span>
            Modern Public Service for Everyone
          </span>

          <h1 className="hp-hero-title">
            Serving our<br />
            community with<br />
            <span className="hp-highlight">efficiency</span> and<br />
            transparency.
          </h1>

          <p className="hp-hero-desc">
            File complaints, request certificates, and stay updated
            with official barangay announcements all in one place.
          </p>

          <div className="hp-button-group">
            <Link to="/login" className="hp-btn-primary">
              Get Started
              <span className="hp-arrow">→</span>
            </Link>
            <a href="#services" className="hp-btn-outline">
              Learn More
            </a>
          </div>
        </div>

        <div className="hp-hero-right">
          <img
            src="brgy.webp"
            alt="barangay"
          />
        </div>
      </div>

      {/* ANNOUNCEMENTS */}
      <div className="hp-announcements" id="announcements">
        <div className="hp-section-header">
          <h2>Latest Announcements</h2>
          <p>Stay informed about community activities and updates</p>
        </div>

        {annLoading ? (
          <div className="hp-ann-loading">Loading announcements...</div>
        ) : announcements.length === 0 ? (
          <div className="hp-ann-empty">No announcements yet.</div>
        ) : (
          <div
            id="carouselExampleIndicators"
            className="hp-carousel carousel slide carousel-fade"
            data-bs-ride="carousel"
          >
            <div className="carousel-indicators">
              {announcements.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  data-bs-target="#carouselExampleIndicators"
                  data-bs-slide-to={i}
                  className={i === 0 ? 'active' : ''}
                />
              ))}
            </div>

            <div className="carousel-inner">
              {announcements.map((ann, i) => (
                <div className={`carousel-item${i === 0 ? ' active' : ''}`} key={ann.id}>
                  <div className="hp-ann-card">
                    <div className="hp-ann-card-meta">
                      {ann.category && (
                        <span className="hp-ann-category">{ann.category}</span>
                      )}
                      {ann.priority && (
                        <span className={`hp-ann-priority ${ann.priority.toLowerCase()}`}>
                          {ann.priority}
                        </span>
                      )}
                      <span className="hp-ann-date">
                        {new Date(ann.created_at).toLocaleDateString('en-US', {
                          month: 'long', day: 'numeric', year: 'numeric'
                        })}
                      </span>
                    </div>
                    <h3 className="hp-ann-card-title">{ann.title}</h3>
                    <p className="hp-ann-card-content">{ann.content}</p>
                  </div>
                </div>
              ))}
            </div>

            {announcements.length > 1 && (
              <>
                <button
                  className="carousel-control-prev"
                  type="button"
                  data-bs-target="#carouselExampleIndicators"
                  data-bs-slide="prev"
                >
                  <span className="carousel-control-prev-icon"></span>
                </button>
                <button
                  className="carousel-control-next"
                  type="button"
                  data-bs-target="#carouselExampleIndicators"
                  data-bs-slide="next"
                >
                  <span className="carousel-control-next-icon"></span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* SERVICES */}
      <div className="hp-services" id="services">
        <div className="hp-section-header">
          <h2>Comprehensive Public Services</h2>
          <p>
            We provide a digital platform to streamline all your barangay
            transactions, making them faster and more accessible.
          </p>
        </div>

        <div className="hp-cards-row">
          {/* CARD 1 */}
          <div className="hp-service-card">
            <div className="hp-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <h5>Service Request</h5>
            <p>
              Request Barangay Clearance, Certificate of Indigency,
              and Business Permits online without waiting in long lines.
            </p>
          </div>

          {/* CARD 2 */}
          <div className="hp-service-card">
            <div className="hp-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h5>Incident Reports</h5>
            <p>
              Easily file complaints and reports about neighborhood issues
              for immediate attention from barangay officials.
            </p>
          </div>

          {/* CARD 3 */}
          <div className="hp-service-card">
            <div className="hp-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 11v3l18 5V6L3 11z"/>
                <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
              </svg>
            </div>
            <h5>Announcements</h5>
            <p>
              Stay updated with the latest barangay news, events,
              and official announcements directly from your officials.
            </p>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="hp-footer">
        <div className="hp-footer-content">
          <div className="hp-footer-logo">
            <img src="/brgyease.png" alt="BarangayEase Logo" className="hp-footer-logo-img" />
            <h2>BarangayEase</h2>
          </div>

          <p className="hp-footer-desc">
            Digitalizing public services for a more connected and efficient community.
          </p>

          <ul className="hp-footer-nav">
            <li><a href="#about">About Us</a></li>
            <li><a href="#contact">Contact</a></li>
            <li><a href="#privacy">Privacy Policy</a></li>
          </ul>

          <p className="hp-footer-copy">
            © 2026 Barangay Public Services and Request Management System. All rights reserved.
          </p>
        </div>
      </div>
    </>
  );
}

export default Homepage;