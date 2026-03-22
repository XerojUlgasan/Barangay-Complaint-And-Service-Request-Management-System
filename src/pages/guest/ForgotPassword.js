import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { completePasswordRecovery } from "../../supabse_db/auth/auth";
import "../../styles/Auth.css";

const ForgotPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recoveryAccessToken, setRecoveryAccessToken] = useState("");
  const [recoveryRefreshToken, setRecoveryRefreshToken] = useState("");

  useEffect(() => {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : "";
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token") || "";
    const refreshToken = params.get("refresh_token") || "";
    const type = params.get("type") || "";

    if (type !== "recovery" || !accessToken || !refreshToken) {
      setError(
        "Invalid or expired password reset link. Please request a new one.",
      );
      return;
    }

    setRecoveryAccessToken(accessToken);
    setRecoveryRefreshToken(refreshToken);
    setError("");
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!recoveryAccessToken || !recoveryRefreshToken) {
      setError(
        "Recovery token missing. Please open the latest reset link from your email.",
      );
      return;
    }

    setIsSubmitting(true);
    const result = await completePasswordRecovery(
      password,
      recoveryAccessToken,
      recoveryRefreshToken,
    );
    setIsSubmitting(false);

    if (!result.success) {
      setError(
        result.message ||
          "Unable to update password. Please request a new reset link.",
      );
      return;
    }

    // Remove sensitive tokens from the address bar after successful reset.
    window.history.replaceState({}, document.title, window.location.pathname);
    setSuccess(result.message);
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="login-page">
      <div className="container-fluid sign-in-container">
        <Link to="/login" className="login-back-btn">
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
          Back to Login
        </Link>

        <a className="shield-button">
          <img
            src="/brgyease.png"
            alt="BarangayEase Logo"
            className="brgy-logo"
          />
        </a>

        <h5>Reset Password</h5>
        <p>Enter your new password to continue.</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="forgotPassword" className="form-label">
              Password
            </label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                className="form-control"
                id="forgotPassword"
                placeholder="Enter new password"
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

          <div className="mb-3">
            <label htmlFor="confirmForgotPassword" className="form-label">
              Confirm Password
            </label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? "text" : "password"}
                className="form-control"
                id="confirmForgotPassword"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-eye-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex="-1"
              >
                {showConfirmPassword ? (
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

          {error && (
            <div
              style={{
                color: "#dc2626",
                fontSize: "13px",
                marginBottom: "8px",
                textAlign: "center",
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                color: "#059669",
                fontSize: "13px",
                marginBottom: "8px",
                textAlign: "center",
              }}
            >
              {success}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-success"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
