import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { logout, checkIfPasswordChangeRequired, updatePasswordAndSetFlag } from "../../supabse_db/auth/auth";
import { useAuth } from "../../context/AuthContext";
import { getRequests } from "../../supabse_db/request/request";
import { getComplaints } from "../../supabse_db/complaint/complaint";
import ResidentSidebar from "../../components/ResidentSidebar";
import ResidentSettings from "../../components/ResidentSettings";
import PasswordChangeModal from "../../components/PasswordChangeModal";
import "../../styles/UserPages.css";

const Dashboard = () => {
  const navigate = useNavigate();
  const { authUser, userLoading, userName } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Password change modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (userLoading || !authUser) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [requestsRes, complaintsRes] = await Promise.all([
          getRequests(),
          getComplaints(),
        ]);

        if (requestsRes.success) {
          setRequests(requestsRes.data);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    // Check if password change is required on first login
    const checkPasswordChange = async () => {
      try {
        const needsPasswordChange = await checkIfPasswordChangeRequired();
        console.log("Needs password change:", needsPasswordChange);
        setShowPasswordModal(needsPasswordChange);
      } catch (error) {
        console.error("Error checking password change requirement:", error);
      }
    };

    fetchData();
    checkPasswordChange();
  }, [authUser, userLoading]);

  const handleLogoutConfirm = useCallback(async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  }, [navigate]);

  const handleSubmitChoice = useCallback(
    (type) => {
      setShowSubmitModal(false);
      navigate(
        type === "certificate" ? "/submit/certificate" : "/submit/complaint",
      );
    },
    [navigate],
  );

  const handlePasswordChange = useCallback(async (e) => {
    e.preventDefault();
    setPasswordError("");

    if (!newPassword || !confirmPassword) {
      setPasswordError("Please fill in all fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    setPasswordLoading(true);
    const result = await updatePasswordAndSetFlag(newPassword);
    setPasswordLoading(false);

    if (!result.success) {
      setPasswordError(result.message);
      return;
    }

    // Password changed successfully, close modal
    setShowPasswordModal(false);
    setNewPassword("");
    setConfirmPassword("");
  }, [newPassword, confirmPassword]);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const normalize = useCallback(
    (str) => (str || "").toLowerCase().replace(/[\s_-]/g, ""),
    [],
  );

  const {
    pendingCount,
    inProgressCount,
    complianceCount,
    completedCount,
    recentRequests,
  } = useMemo(() => {
    const counts = { pending: 0, inProgress: 0, compliance: 0, completed: 0 };

    requests.forEach((r) => {
      const status = (r.request_status || "")
        .toLowerCase()
        .replace(/[\s_-]/g, "");
      if (status === "pending") counts.pending++;
      else if (status === "inprogress") counts.inProgress++;
      else if (status === "forcompliance") counts.compliance++;
      else if (status === "completed") counts.completed++;
    });

    return {
      pendingCount: counts.pending,
      inProgressCount: counts.inProgress,
      complianceCount: counts.compliance,
      completedCount: counts.completed,
      recentRequests: requests.slice(0, 3),
    };
  }, [requests]);

  const formatDate = useCallback((dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  const getBadgeClass = useCallback((status) => {
    const n = (status || "").toLowerCase().replace(/[\s_-]/g, "");
    if (n === "completed" || n === "resolved") return "badge completed";
    if (n === "inprogress") return "badge progress";
    if (n === "pending") return "badge pending";
    if (n === "rejected" || n === "dismissed") return "badge rejected";
    return "badge";
  }, []);

  const formatStatus = useCallback((status) => {
    if (!status) return "";
    return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }, []);

  return (
    <div className="user-landing-page">
      <div className="layout">
        {/* LOGOUT CONFIRMATION MODAL */}
        {showLogoutModal && (
          <div
            className="logout-modal-overlay"
            onClick={() => setShowLogoutModal(false)}
          >
            <div className="logout-modal" onClick={(e) => e.stopPropagation()}>
              <div className="logout-modal-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth="2"
                  width="32"
                  height="32"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </div>
              <h3 className="logout-modal-title">Logout</h3>
              <p className="logout-modal-message">
                Are you sure you want to logout?
              </p>
              <div className="logout-modal-actions">
                <button
                  className="logout-modal-no"
                  onClick={() => setShowLogoutModal(false)}
                >
                  No, Stay
                </button>
                <button
                  className="logout-modal-yes"
                  onClick={handleLogoutConfirm}
                >
                  Yes, Logout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SUBMIT TYPE MODAL */}
        {showSubmitModal && (
          <div
            className="submit-modal-overlay"
            onClick={() => setShowSubmitModal(false)}
          >
            <div className="submit-modal" onClick={(e) => e.stopPropagation()}>
              <div className="submit-modal-header">
                <h3 className="submit-modal-title">
                  What would you like to submit?
                </h3>
                <button
                  className="submit-modal-close"
                  onClick={() => setShowSubmitModal(false)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    width="18"
                    height="18"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="submit-modal-body">
                <button
                  className="submit-modal-option"
                  onClick={() => handleSubmitChoice("certificate")}
                >
                  <div className="submit-modal-icon-wrap green">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      width="28"
                      height="28"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <polyline points="9 15 11 17 15 13" />
                    </svg>
                  </div>
                  <span className="submit-modal-option-title">
                    Certificate Request
                  </span>
                  <span className="submit-modal-option-sub">
                    Indigency, Clearance, etc.
                  </span>
                </button>

                <button
                  className="submit-modal-option"
                  onClick={() => handleSubmitChoice("complaint")}
                >
                  <div className="submit-modal-icon-wrap red">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      width="28"
                      height="28"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <span className="submit-modal-option-title">
                    File Complaint
                  </span>
                  <span className="submit-modal-option-sub">
                    Report incidents or issues
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PASSWORD CHANGE MODAL (First-time Login) */}
        <PasswordChangeModal
          open={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
          onSubmit={handlePasswordChange}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          showNewPassword={showNewPassword}
          setShowNewPassword={setShowNewPassword}
          showConfirmPassword={showConfirmPassword}
          setShowConfirmPassword={setShowConfirmPassword}
          passwordError={passwordError}
          passwordLoading={passwordLoading}
        />

        {/* SIDEBAR COMPONENT */}
        <ResidentSidebar
          isOpen={sidebarOpen}
          onClose={closeSidebar}
          activePage="dashboard"
        />

        {/* MAIN CONTENT */}
        <main className="main">
          <div className="topbar">
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                width="20"
                height="20"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <h3>Dashboard</h3>

            <div className="user">
              <div className="user-text">
                <strong>{authUser?.email || "Loading..."}</strong>
                <span>Resident</span>
              </div>
              <ResidentSettings />
              <button
                onClick={() => setShowLogoutModal(true)}
                className="back-button"
                title="Logout"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="welcome">
            <h1>Welcome, {userName || "..."}!</h1>
            <p>Manage your barangay services and requests</p>
          </div>

          <div className="action-cards">
            <button
              onClick={() => setShowSubmitModal(true)}
              className="card blue clickable"
              style={{ border: "none", cursor: "pointer", textAlign: "left" }}
            >
              <div className="circle">+</div>
              <div className="card-content">
                <h3>Submit New Request</h3>
                <p>File complaints or request services</p>
              </div>
            </button>
            <a href="/announcements" className="card green clickable">
              <div className="circle">!</div>
              <div className="card-content">
                <h3>Announcements</h3>
                <p>View barangay announcements</p>
              </div>
            </a>
          </div>

          <div className="status-cards">
            <div className="status">
              <div className="status-left">
                <p>Pending</p>
                <h2>{loading ? "..." : pendingCount}</h2>
              </div>
              <div className="status-icon yellow">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
            </div>
            <div className="status">
              <div className="status-left">
                <p>In Progress</p>
                <h2>{loading ? "..." : inProgressCount}</h2>
              </div>
              <div className="status-icon blue-icon">!</div>
            </div>
            <div className="status">
              <div className="status-left">
                <p>Compliance</p>
                <h2>{loading ? "..." : complianceCount}</h2>
              </div>
              <div className="status-icon yellow">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M9 12h6M9 16h6M9 8h6" />
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                </svg>
              </div>
            </div>
            <div className="status">
              <div className="status-left">
                <p>Completed</p>
                <h2>{loading ? "..." : completedCount}</h2>
              </div>
              <div className="status-icon green-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="recent">
            <div className="recent-header">
              <h3>Recent Requests</h3>
              <a href="/requests">View all</a>
            </div>

            {loading ? (
              <p style={{ padding: "16px", color: "#888" }}>
                Loading requests...
              </p>
            ) : recentRequests.length === 0 ? (
              <p style={{ padding: "16px", color: "#888" }}>No requests yet.</p>
            ) : (
              recentRequests.map((req) => (
                <div className="request-item" key={req.id}>
                  <div className="icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M6 2H14L20 8V22H6V2Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M14 2V8H20"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M9 13H15M9 17H15"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>
                  <div className="details">
                    <h4>{req.subject}</h4>
                    <p>{req.description}</p>
                    <span>{formatDate(req.created_at)}</span>
                  </div>
                  <span className={getBadgeClass(req.request_status)}>
                    {formatStatus(req.request_status)}
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

export default Dashboard;
