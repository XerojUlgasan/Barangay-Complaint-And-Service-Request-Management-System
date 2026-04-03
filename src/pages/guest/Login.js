import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  loginByEmail,
  requestPasswordReset,
} from "../../supabse_db/auth/auth";
import { API_CONFIG } from "../../supabse_db/supabase_client";
import supabase from "../../supabse_db/supabase_client";
import "../../styles/Auth.css";

// Get the Supabase anon token for public/unauthenticated requests
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjbmxqaW9neG5tZnVnY2FxeGdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NjM1NTAsImV4cCI6MjA4NjAzOTU1MH0.C_GLCdO2YjmHMz4UAnSnMxMIjVVwIO8I3tVFGrgBSZc";

const Login = () => {
  const [isSignIn, setIsSignIn] = useState(true);
  const [step, setStep] = useState(1);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [signInError, setSignInError] = useState("");
  const [signInLoading, setSignInLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const [householdId, setHouseholdId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [activationToken, setActivationToken] = useState("");

  const [newEmail, setNewEmail] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);

  const [notification, setNotification] = useState(null);

  const navigate = useNavigate();

  // Popup notification function
  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
  };

  const closeNotification = () => {
    setNotification(null);
  };

  const handleSignInClick = (e) => {
    e.preventDefault();
    setIsSignIn(true);
    setStep(1);
  };

  const handleNewUserClick = (e) => {
    e.preventDefault();
    setIsSignIn(false);
    setStep(1);
  };

  const handleSignInSubmit = async (e) => {
    e.preventDefault();
    setSignInError("");
    setSignInLoading(true);

    const result = await loginByEmail(email, password);

    if (!result.success) {
      setSignInError(result.message);
      setSignInLoading(false);
      return;
    }

    setSignInLoading(false);

    if (!result.role) {
      setSignInError("Could not determine user role. Please try again.");
      return;
    }

    if (result.role === "super_admin") {
      navigate("/BarangayAdmin");
    } else if (result.role === "official") {
      navigate("/BarangayOfficial");
    } else {
      navigate("/dashboard");
    }
  };

  const openForgotModal = (e) => {
    e.preventDefault();
    setForgotEmail(email || "");
    setForgotError("");
    setForgotSuccess("");
    setShowForgotModal(true);
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotLoading(false);
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");
    setForgotLoading(true);

    const result = await requestPasswordReset(forgotEmail);

    setForgotLoading(false);

    if (!result.success) {
      setForgotError(result.message || "Failed to send reset link.");
      return;
    }

    setForgotSuccess(result.message);
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setVerifyError("");
    setVerifyLoading(true);

    try {
      const payload = {
        house_id: householdId.trim(),
        fname: firstName.trim(),
        lname: lastName.trim(),
        mname: middleName.trim() || null,
        bdate: birthdate,
      };

      console.log("📤 Sending to checkIdentity:", JSON.stringify(payload, null, 2));

      const headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      };

      const response = await fetch(`${API_CONFIG.SERVER_API_URL}/resident/checkIdentity`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setVerifyLoading(false);
        console.error("❌ Error from checkIdentity:", response.status, errorData);
        setVerifyError(errorData.message || `Error: ${response.status} ${response.statusText}`);
        return;
      }

      const data = await response.json();
      setVerifyLoading(false);

      console.log("✅ Response from checkIdentity:", data);

      if (!data.result) {
        setVerifyError(data.message || "Identity verification failed. Please check your details.");
        return;
      }

      // Store the token and proceed to step 2
      setActivationToken(data.token);
      setStep(2);
    } catch (error) {
      setVerifyLoading(false);
      setVerifyError("An error occurred during verification. Please try again.");
      console.error("Verification error:", error);
    }
  };

  const handleAccountSubmit = async (e) => {
    e.preventDefault();
    setRegisterError("");
    setRegisterLoading(true);

    try {
      const payload = {
        house_id: householdId.trim(),
        fname: firstName.trim(),
        lname: lastName.trim(),
        mname: middleName.trim() || null,
        bdate: birthdate,
        token: activationToken,
        email: newEmail.trim(),
      };

      console.log("📤 Sending to activateAccount:", JSON.stringify(payload, null, 2));

      const headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      };

      const response = await fetch(`${API_CONFIG.SERVER_API_URL}/resident/activateAccount`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setRegisterLoading(false);
        console.error("❌ Error from activateAccount:", response.status, errorData);
        setRegisterError(errorData.message || `Error: ${response.status} ${response.statusText}`);
        return;
      }

      const data = await response.json();
      setRegisterLoading(false);

      console.log("✅ Response from activateAccount:", data);

      if (!data.result) {
        setRegisterError(data.message || "Account activation failed. Please try again.");
        return;
      }

      // Success - show message and redirect to sign-in
      showNotification(data.message || "Account activated successfully! Please sign in with your new account.", "success", 3000);
      
      // Reset to sign-in form after a short delay
      setTimeout(() => {
        setIsSignIn(true);
        setStep(1);
        setEmail("");
        setPassword("");
        setHouseholdId("");
        setFirstName("");
        setLastName("");
        setMiddleName("");
        setBirthdate("");
        setNewEmail("");
        setActivationToken("");
      }, 1500);
    } catch (error) {
      setRegisterLoading(false);
      setRegisterError("An error occurred during account activation. Please try again.");
      console.error("Account activation error:", error);
    }
  };

  return (
    <div className="login-page">
      {/* Sign In Container */}
      <div
        className="container-fluid sign-in-container"
        style={{ display: isSignIn ? "flex" : "none" }}
      >
        {/* ✅ Back to Home button */}
        <Link to="/" className="login-back-btn">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="16"
            height="16"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to Home
        </Link>

        <a className="shield-button">
          <img
            src="/brgyease.png"
            alt="BarangayEase Logo"
            className="brgy-logo"
          />
        </a>

        <h5>BarangayEase</h5>
        <p>Welcome Back! Please sign in to continue.</p>

        <div className="container">
          <button
            type="button"
            className={`btn btn-success ${isSignIn ? "active-toggle" : "inactive-toggle"}`}
            onClick={handleSignInClick}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`btn btn-success ${!isSignIn ? "active-toggle" : "inactive-toggle"}`}
            onClick={handleNewUserClick}
          >
            New User
          </button>
        </div>

        <form onSubmit={handleSignInSubmit}>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              type="email"
              className="form-control"
              id="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                className="form-control"
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {signInError && (
            <div
              style={{
                color: "#dc2626",
                fontSize: "13px",
                marginBottom: "8px",
                textAlign: "center",
              }}
            >
              {signInError}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-success"
            disabled={signInLoading}
          >
            {signInLoading ? "Signing in..." : "Sign in"}
          </button>

          <a
            className="forgot"
            href="/forgot-password"
            onClick={openForgotModal}
          >
            Forgot password?
          </a>
        </form>
      </div>

      {showForgotModal && (
        <div className="forgot-modal-overlay" role="dialog" aria-modal="true">
          <div className="forgot-modal-card">
            <h6 className="mb-2">Reset your password</h6>
            <p className="text-muted mb-3" style={{ fontSize: "13px" }}>
              Enter your email and we will send you a reset link.
            </p>

            <form onSubmit={handleForgotSubmit}>
              <label htmlFor="forgotEmail" className="form-label">
                Email
              </label>
              <input
                id="forgotEmail"
                type="email"
                className="form-control"
                placeholder="Enter your email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
              />

              {forgotError && (
                <div className="forgot-message forgot-message-error">
                  {forgotError}
                </div>
              )}

              {forgotSuccess && (
                <div className="forgot-message forgot-message-success">
                  {forgotSuccess}
                </div>
              )}

              <div className="forgot-modal-actions">
                <button
                  type="button"
                  className="btn btn-back"
                  onClick={closeForgotModal}
                  disabled={forgotLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={forgotLoading}
                >
                  {forgotLoading ? "Sending..." : "Send Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New User Container */}
      <div
        className="container-fluid new-user-container"
        id="container2"
        style={{ display: !isSignIn ? "flex" : "none" }}
      >
        {/* ✅ Back to Home button */}
        <Link to="/" className="login-back-btn">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="16"
            height="16"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to Home
        </Link>

        <a className="shield-button">
          <img
            src="/brgyease.png"
            alt="BarangayEase Logo"
            className="brgy-logo"
          />
        </a>

        <h5>BarangayEase</h5>
        <p>Welcome Back! Please sign in to continue.</p>

        <div className="container">
          <button
            type="button"
            className={`btn btn-success ${isSignIn ? "active-toggle" : "inactive-toggle"}`}
            onClick={handleSignInClick}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`btn btn-success ${!isSignIn ? "active-toggle" : "inactive-toggle"}`}
            onClick={handleNewUserClick}
          >
            New User
          </button>
        </div>

        <div className="d-flex justify-content-center align-items-center mt-4">
          <div className={`step-circle ${step === 1 ? "active" : "completed"}`}>
            {step > 1 ? "✓" : "1"}
          </div>
          <div className={`step-line ${step === 2 ? "active" : ""}`}></div>
          <div className={`step-circle ${step === 2 ? "active" : ""}`}>2</div>
        </div>

        {step === 1 && (
          <div className="identity-section mt-4">
            <h6 className="text-center">Identity Verification</h6>
            <p className="text-center text-muted">
              Enter details matching barangay records
            </p>

            <form onSubmit={handleVerifySubmit}>
              <div className="mb-3">
                <label htmlFor="householdId" className="form-label">
                  Household ID
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="householdId"
                  placeholder="Enter your Household ID"
                  value={householdId}
                  onChange={(e) => setHouseholdId(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="firstName" className="form-label">
                  First Name
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="firstName"
                  placeholder="Enter first name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="lastName" className="form-label">
                  Last Name
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="lastName"
                  placeholder="Enter last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="middleName" className="form-label">
                  Middle Name{" "}
                  <span className="text-muted" style={{ fontWeight: 400 }}>
                    (optional)
                  </span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="middleName"
                  placeholder="Enter middle name"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="birthdate" className="form-label">
                  Birthdate
                </label>
                <input
                  type="date"
                  className="form-control"
                  id="birthdate"
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  required
                />
              </div>

              {verifyError && (
                <div
                  style={{
                    color: "#dc2626",
                    fontSize: "13px",
                    marginBottom: "8px",
                    textAlign: "center",
                  }}
                >
                  {verifyError}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-success"
                disabled={verifyLoading}
              >
                {verifyLoading ? "Verifying..." : "Verify & Continue"}
              </button>
            </form>
          </div>
        )}

        {step === 2 && (
          <div className="identity-section mt-4">
            <h6 className="text-center">Account Activation</h6>
            <p className="text-center text-muted">
              Enter your email to activate your account
            </p>

            <form onSubmit={handleAccountSubmit}>
              <div className="mb-3">
                <label htmlFor="newEmail" className="form-label">
                  Email
                </label>
                <input
                  type="email"
                  className="form-control"
                  id="newEmail"
                  placeholder="Enter your email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
              </div>

              {registerError && (
                <div
                  style={{
                    color: "#dc2626",
                    fontSize: "13px",
                    marginBottom: "8px",
                    textAlign: "center",
                  }}
                >
                  {registerError}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-success"
                disabled={registerLoading}
              >
                {registerLoading ? "Activating..." : "Activate Account"}
              </button>
              <button
                type="button"
                className="btn btn-back mt-2"
                onClick={() => setStep(1)}
              >
                ← Back
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Notification Popup Modal */}
      {notification && (
        <div className="notification-modal-overlay" role="dialog" aria-modal="true">
          <div className="notification-modal-card">
            <div className="notification-modal-icon">
              {notification.type === "success" ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{
                    width: "48px",
                    height: "48px",
                    color: "#10b981",
                  }}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{
                    width: "48px",
                    height: "48px",
                    color: "#ef4444",
                  }}
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
            </div>

            <h5 className="notification-modal-title">
              {notification.type === "success" ? "Success" : "Error"}
            </h5>

            <p className="notification-modal-message">{notification.message}</p>

            <button
              type="button"
              className="btn btn-success notification-modal-btn"
              onClick={closeNotification}
            >
              OK
            </button>
          </div>
        </div>
      )}

      <style>{`
        .notification-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10000;
          animation: fadeIn 0.3s ease-out;
        }

        .notification-modal-card {
          background-color: white;
          border-radius: 12px;
          padding: 32px 24px;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          text-align: center;
          animation: popIn 0.3s ease-out;
        }

        .notification-modal-icon {
          display: flex;
          justify-content: center;
          margin-bottom: 16px;
        }

        .notification-modal-title {
          margin: 0 0 12px 0;
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
        }

        .notification-modal-message {
          margin: 0 0 24px 0;
          font-size: 14px;
          color: #6b7280;
          line-height: 1.5;
        }

        .notification-modal-btn {
          width: 100%;
          padding: 10px 24px;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes popIn {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;
