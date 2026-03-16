import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  loginByEmail,
  checkHouseholdMember,
  registerByEmail,
  checkUserRole,
} from "../supabse_db/auth/auth";
import "./login.css";

const Login = () => {
  const [isSignIn, setIsSignIn] = useState(true);
  const [step, setStep] = useState(1);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [signInError, setSignInError] = useState("");
  const [signInLoading, setSignInLoading] = useState(false);

  const [householdId, setHouseholdId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);

  const navigate = useNavigate();

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

    const role = await checkUserRole(result.user.id);
    setSignInLoading(false);

    if (!role) {
      setSignInError("Could not determine user role. Please try again.");
      return;
    }

    if (role === "super_admin") {
      navigate("/BarangayAdmin");
    } else if (role === "official") {
      navigate("/BarangayOfficial");
    } else {
      navigate("/dashboard");
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setVerifyError("");
    setVerifyLoading(true);

    const parsedHouseholdId = isNaN(householdId.trim())
      ? householdId.trim()
      : parseInt(householdId.trim());

    const result = await checkHouseholdMember(
      parsedHouseholdId,
      firstName.trim(),
      lastName.trim(),
      middleName.trim(),
      birthdate,
    );

    setVerifyLoading(false);

    if (!result.success) {
      setVerifyError("Something went wrong. Please try again.");
      return;
    }

    if (!result.isExist) {
      setVerifyError(
        "No matching record found in barangay records. Please check your details.",
      );
      return;
    }

    if (result.isActivated) {
      setVerifyError(
        "This member already has an account. Please sign in instead.",
      );
      return;
    }

    setStep(2);
  };

  const handleAccountSubmit = async (e) => {
    e.preventDefault();
    setRegisterError("");

    if (newPassword !== confirmPassword) {
      setRegisterError("Passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setRegisterError("Password must be at least 6 characters.");
      return;
    }

    setRegisterLoading(true);
    const result = await registerByEmail(newEmail, newPassword);
    setRegisterLoading(false);

    if (result.success) {
      alert(
        "OTP sent to your email! Please verify to complete registration.\n\nPlease sign in after verification.",
      );
      // Reset to sign-in form
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
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setRegisterError(result.message);
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
          <img src="/brgyease.png" alt="BarangayEase Logo" className="brgy-logo" />
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
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

          <a className="forgot" href="/">
            Forgot password?
          </a>
        </form>
      </div>

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
          <img src="/brgyease.png" alt="BarangayEase Logo" className="brgy-logo" />
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
            <h6 className="text-center">Account Setup</h6>
            <p className="text-center text-muted">
              Create your login credentials
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
              <div className="mb-3">
                <label htmlFor="newPassword" className="form-label">
                  Password
                </label>
                <div className="password-input-wrapper">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    className="form-control"
                    id="newPassword"
                    placeholder="Create a password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-eye-btn"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    tabIndex="-1"
                  >
                    {showNewPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="mb-3">
                <label htmlFor="confirmPassword" className="form-label">
                  Confirm Password
                </label>
                <div className="password-input-wrapper">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="form-control"
                    id="confirmPassword"
                    placeholder="Re-enter your password"
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
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    )}
                  </button>
                </div>
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
                {registerLoading ? "Creating Account..." : "Create Account"}
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
    </div>
  );
};

export default Login;
