// Responsive Homepage layout with header, hero, announcements, services, footer and modal
import React, { useState, useEffect } from "react";
import "../styles/Homepage.css";

export default function Homepage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState("signin"); // 'signin' or 'newuser'
  const [step, setStep] = useState(1); // new user steps

  // close on ESC
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openModal = () => {
    setTab("signin");
    setStep(1);
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  return (
    <div className="hp-root">
      {/* Header / Nav */}
      <header className="hp-header">
        <div className="hp-container hp-header-inner">
          <div className="hp-logo">BarangayPortal</div>
          <nav className="hp-nav">
            <a href="#features">Features</a>
            <a href="#announcements">Announcements</a>
            <button className="hp-signin" onClick={openModal}>Sign In</button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="hp-hero hp-container">
        <div className="hp-hero-left">
          <div className="hp-badge">Modern Public Service for Everyone</div>
          <h1 className="hp-headline">Serving our community with efficiency and transparency.</h1>
          <p className="hp-lead">Quickly file requests, track incidents, and receive direct updates from your barangay office — all in one place.</p>
          <div className="hp-cta">
            <button className="btn btn-primary">Get Started</button>
            <button className="btn btn-ghost">Learn More</button>
          </div>
        </div>

        <div className="hp-hero-right">
          <div className="hp-hero-image" aria-hidden="true" />
        </div>
      </section>

      {/* Latest Announcements */}
      <section id="announcements" className="hp-section hp-container hp-announcements">
        <h2 className="section-title">Latest Announcements</h2>
        <p className="section-sub">Stay informed about events and notices from the barangay.</p>

        <div className="hp-ann-list">
          <div className="hp-ann-card">
            <img src="https://via.placeholder.com/160x100" alt="event" />
            <div className="ann-body">
              <div className="ann-meta">Posted by Barangay Captain • 2/7/2026</div>
              <h3 className="ann-title">Community Clean-Up Drive</h3>
              <p className="ann-desc">Join us this Saturday for our monthly community clean-up drive. Meeting point is at the Barangay Hall at 6:00 AM.</p>
            </div>
          </div>

          <div className="hp-ann-card">
            <img src="https://via.placeholder.com/160x100" alt="notice" />
            <div className="ann-body">
              <div className="ann-meta">Posted by Admin • 2/6/2026</div>
              <h3 className="ann-title">Garbage Collection Schedule Change</h3>
              <p className="ann-desc">Due to the upcoming holiday, garbage collection will be moved from Monday to Tuesday next week.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="features" className="hp-section hp-container hp-services">
        <h2 className="section-title">Comprehensive Public Services</h2>
        <p className="section-sub">Access key services and file reports quickly.</p>

        <div className="services-grid">
          <div className="svc-card">
            <div className="svc-icon">📨</div>
            <h4>Service Requests</h4>
            <p>Submit and monitor requests for barangay services.</p>
          </div>

          <div className="svc-card">
            <div className="svc-icon">🚨</div>
            <h4>Incident Reports</h4>
            <p>Report incidents quickly with essential details.</p>
          </div>

          <div className="svc-card">
            <div className="svc-icon">🔔</div>
            <h4>Direct Updates</h4>
            <p>Receive official notices and updates from the office.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="hp-footer">
        <div className="hp-container hp-footer-inner">
          <div className="footer-left">
            <div className="hp-logo hp-logo-inverse">BarangayPortal</div>
            <p className="footer-tag">Local services, modern approach.</p>
          </div>

          <div className="footer-links">
            <a href="#">About Us</a>
            <a href="#">Contact</a>
            <a href="#">Privacy Policy</a>
          </div>
        </div>
      </footer>

      {/* Modal Overlay */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal} aria-label="Close">×</button>

            <div className="modal-top">
              <div className="modal-icon">🛡️</div>
              <h3>Barangay Portal</h3>
              <p className="modal-sub">Welcome back! Please sign in to continue.</p>
            </div>

            <div className="modal-tabs">
              <button className={tab === "signin" ? "tab active" : "tab"} onClick={() => setTab("signin")}>Sign In</button>
              <button className={tab === "newuser" ? "tab active" : "tab"} onClick={() => setTab("newuser")}>New User</button>
            </div>

            <div className="modal-body">
              {tab === "signin" ? (
                <div className="signin-form">
                  <label>Username</label>
                  <input placeholder="Username" />
                  <label>Password</label>
                  <input type="password" placeholder="Password" />
                  <button className="btn btn-primary btn-full">Sign In</button>

                  <div className="demo-box">
                    <strong>Demo Accounts:</strong>
                    <ul>
                      <li>User: user / user</li>
                      <li>Official: barangay / barangay</li>
                      <li>Admin: admin / admin</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="newuser-form">
                  <div className="steps">
                    <div className={step === 1 ? "step active" : "step"}>1</div>
                    <div className="line" />
                    <div className={step === 2 ? "step active" : "step"}>2</div>
                  </div>

                  <h4>Identity Verification</h4>
                  <p className="modal-sub">Enter details matching barangay records</p>

                  {step === 1 && (
                    <>
                      <label>Household ID</label>
                      <input placeholder="BRG-2026-001234" />
                      <label>Full Name</label>
                      <input placeholder="Full name" />
                      <button className="btn btn-primary btn-full" onClick={() => setStep(2)}>Verify & Continue</button>
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <p>Verification complete. (Demo)</p>
                      <button className="btn btn-primary btn-full" onClick={() => { setStep(1); setTab("signin"); setModalOpen(false); }}>Finish</button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
