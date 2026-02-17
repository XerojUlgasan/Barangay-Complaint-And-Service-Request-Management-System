import React from "react";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import './homepage.css';
import { Link } from 'react-router-dom';

function Homepage() {
  return (
    <>
      <nav className="hp-navbar">
  <div className="hp-navbar-inner">
    <div className="hp-navbar-brand">
      <button className="hp-shield-button">
        <svg className="hp-shield-icon" viewBox="0 0 24 24">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      </button>
      <span>BarangayPortal</span>
    </div>
    <ul className="hp-nav-links">
      <li><a href="#services">Features</a></li>
      <li><a id="announce-link" href="#announcements">Announcements</a></li>
      <li>
        <Link to="/login" className="hp-signin-btn">Sign In</Link>
      </li>
    </ul>
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

        <div
          id="carouselExampleIndicators"
          className="hp-carousel carousel slide carousel-fade"
          data-bs-ride="carousel"
        >
          <div className="carousel-indicators">
            <button
              type="button"
              data-bs-target="#carouselExampleIndicators"
              data-bs-slide-to="0"
              className="active"
            ></button>
            <button
              type="button"
              data-bs-target="#carouselExampleIndicators"
              data-bs-slide-to="1"
            ></button>
          </div>

          <div className="carousel-inner">
            <div className="carousel-item active">
              <img src="/1.gif" className="d-block w-100" alt="slide1" />
            </div>
            <div className="carousel-item">
              <img src="/4.gif" className="d-block w-100" alt="slide2" />
            </div>
          </div>

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
        </div>
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <h2>BarangayPortal</h2>
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
