import React from "react";

/**
 * PasswordChangeModal - Reusable modal for first-time password setup
 * Props:
 *  - open: boolean (show/hide modal)
 *  - onClose: function (close modal)
 *  - onSubmit: function (handle password change)
 *  - newPassword, setNewPassword: state and setter
 *  - confirmPassword, setConfirmPassword: state and setter
 *  - showNewPassword, setShowNewPassword: state and setter
 *  - showConfirmPassword, setShowConfirmPassword: state and setter
 *  - passwordError: string (error message)
 *  - passwordLoading: boolean (loading state)
 *  - title: string (modal title)
 *  - subtitle: string (modal subtitle)
 */
const PasswordChangeModal = ({
  open,
  onClose,
  onSubmit,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  showNewPassword,
  setShowNewPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  passwordError,
  passwordLoading,
  title = "Secure Your Account",
  subtitle = "Welcome! This is your first login. Please set a strong password to secure your account.",
}) => {
  React.useEffect(() => {
    if (open) {
      document.body.classList.add('modal-active');
    } else {
      document.body.classList.remove('modal-active');
    }
    return () => document.body.classList.remove('modal-active');
  }, [open]);
  if (!open) return null;
  return (
    // IMPORTANT: To guarantee the modal overlays the sidebar, ensure this component is rendered after the sidebar in the DOM.
    // The z-index is set very high to always overlay sidebar and overlays.
    <div className="password-modal-overlay" role="dialog" aria-modal="true" style={{ zIndex: 3000 }}>
      <div className="password-modal-card">
        <div className="password-modal-header">
          <div className="password-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "32px", height: "32px" }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h3 className="password-modal-title">{title}</h3>
          <p className="password-modal-subtitle">{subtitle}</p>
        </div>
        <div className="password-modal-body">
          <form onSubmit={onSubmit} className="password-modal-form">
            <div className="password-field">
              <label htmlFor="newPassword" className="password-label">
                <svg className="password-label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="1" />
                  <path d="M12 1v6m0 6v6" />
                  <path d="M4.22 4.22l4.24 4.24m1.08 1.08l3 3M19.78 4.22l-4.24 4.24m-1.08 1.08l-3 3" />
                </svg>
                New Password
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showNewPassword ? "text" : "password"}
                  className="form-control"
                  id="newPassword"
                  placeholder="Create a strong password"
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
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "18px", height: "18px" }}>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "18px", height: "18px" }}>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div className="password-field">
              <label htmlFor="confirmPassword" className="password-label">
                <svg className="password-label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
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
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "18px", height: "18px" }}>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "18px", height: "18px" }}>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            {passwordError && (
              <div className="password-error">
                {passwordError}
              </div>
            )}
            <button
              type="submit"
              className="btn btn-success password-modal-btn"
              disabled={passwordLoading}
            >
              {passwordLoading ? (
                <>
                  <span>Securing...</span>
                </>
              ) : (
                <>
                  <span>🔒 Secure My Account</span>
                </>
              )}
            </button>
          </form>
        </div>
        <style>{`
          .password-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.6);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 20000;
            backdrop-filter: blur(4px);
            animation: fadeIn 0.3s ease-out;
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          .password-modal-card {
            background-color: white;
            border-radius: 16px;
            overflow: hidden;
            max-width: 440px;
            width: 90%;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            animation: slideUp 0.4s ease-out;
          }
          .password-modal-header {
            background: linear-gradient(135deg, #50c878 0%, #45a76d 100%);
            padding: 40px 32px;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          .password-modal-header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -10%;
            width: 300px;
            height: 300px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
          }
          .password-modal-header::after {
            content: '';
            position: absolute;
            bottom: -25%;
            left: -5%;
            width: 200px;
            height: 200px;
            background: rgba(255, 255, 255, 0.08);
            border-radius: 50%;
          }
          .password-icon {
            width: 56px;
            height: 56px;
            background-color: rgba(255, 255, 255, 0.25);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 16px;
            color: white;
            font-size: 28px;
          }
          .password-modal-title {
            margin: 0 0 8px 0;
            font-size: 26px;
            font-weight: 700;
            color: white;
            position: relative;
            z-index: 1;
          }
          .password-modal-subtitle {
            margin: 0;
            font-size: 14px;
            color: rgba(255, 255, 255, 0.9);
            line-height: 1.6;
            position: relative;
            z-index: 1;
          }
          .password-modal-body {
            padding: 32px;
          }
          .password-modal-form {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }
          .password-field {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .password-label {
            font-size: 13px;
            font-weight: 600;
            color: #374151;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .password-label-icon {
            width: 16px;
            height: 16px;
            color: #50c878;
          }
          .password-input-wrapper {
            position: relative;
          }
          .password-input-wrapper input {
            width: 100%;
            padding: 12px 16px 12px 16px;
            border: 2px solid #e5e7eb;
            border-radius: 10px;
            font-size: 15px;
            font-family: inherit;
            transition: all 0.3s ease;
            background-color: #f9fafb;
          }
          .password-input-wrapper input::placeholder {
            color: #9ca3af;
          }
          .password-input-wrapper input:hover {
            border-color: #d1d5db;
            background-color: #ffffff;
          }
          .password-input-wrapper input:focus {
            outline: none;
            border-color: #50c878;
            background-color: #ffffff;
            box-shadow: 0 0 0 4px rgba(80, 200, 120, 0.1);
          }
          .password-eye-btn {
            position: absolute;
            right: 14px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            cursor: pointer;
            color: #9ca3af;
            padding: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
          }
          .password-eye-btn:hover {
            color: #50c878;
          }
          .password-error {
            color: #dc2626;
            font-size: 13px;
            padding: 12px 14px;
            background-color: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            margin: -16px 0 0 0;
            display: flex;
            align-items: center;
            gap: 8px;
            animation: slideUp 0.3s ease-out;
          }
          .password-error::before {
            content: '⚠';
            flex-shrink: 0;
          }
          .password-modal-btn {
            margin-top: 12px;
            padding: 12px 24px;
            font-weight: 600;
            font-size: 15px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s ease;
            background: linear-gradient(135deg, #50c878 0%, #45a76d 100%);
            color: white;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            box-shadow: 0 4px 15px rgba(80, 200, 120, 0.3);
          }
          .password-modal-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(80, 200, 120, 0.4);
          }
          .password-modal-btn:active:not(:disabled) {
            transform: translateY(0);
          }
          .password-modal-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
          }
        `}</style>
      </div>
    </div>
  )}

export default PasswordChangeModal;
// ...existing code...
