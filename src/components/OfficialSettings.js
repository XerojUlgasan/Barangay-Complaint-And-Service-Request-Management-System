import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Settings, Eye, EyeOff } from "lucide-react";
import supabase from "../supabse_db/supabase_client";

const MASKED_PASSWORD = "••••••••";
const EMAIL_PATTERN = /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const MIN_PASSWORD_LENGTH = 6;

const OfficialSettings = () => {
  // UI State
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Modal States
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  // Form Inputs
  const [emailInput, setEmailInput] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Error & Success Messages
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Account Data
  const [details, setDetails] = useState({ authEmail: "", authUid: "" });

  const displayEmail = useMemo(() => details.authEmail || "Not available", [
    details,
  ]);

  // ==================== Data Loading ====================
  const loadAccountDetails = async () => {
    setLoading(true);
    setError("");

    try {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData?.user?.id) {
        setError("Unable to identify current user.");
        return;
      }

      const authUid = userData.user.id;

      // Fetch email from barangay_officials table (most up-to-date)
      const { data: official, error: officialError } = await supabase
        .from("barangay_officials")
        .select("email")
        .eq("uid", authUid)
        .maybeSingle();

      if (officialError) {
        console.error("Error fetching official details:", officialError);
        setError("Failed to load official details");
        return;
      }

      const officialEmail = official?.email || userData.user.email || "";

      setDetails({ authEmail: officialEmail, authUid });
    } catch (err) {
      console.error("Error loading official account details:", err);
      setError("Failed to load account details: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const openSettings = async () => {
    setOpen(true);
    await loadAccountDetails();
  };

  const closeSettings = () => {
    setOpen(false);
    setEmailModalOpen(false);
    setPasswordModalOpen(false);
  };

  // ==================== Modal Handlers ====================
  const handleOpenEmailModal = () => {
    setEmailError("");
    setEmailSuccess("");
    setEmailInput("");
    setEmailModalOpen(true);
  };

  const handleOpenPasswordModal = () => {
    setPasswordError("");
    setPasswordSuccess("");
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setPasswordModalOpen(true);
  };

  const handleChangeEmail = async (e) => {
    e.preventDefault();
    const nextEmail = emailInput.trim().toLowerCase();

    // Validation
    if (!nextEmail) {
      setEmailError("Email is required.");
      return;
    }

    if (!EMAIL_PATTERN.test(nextEmail)) {
      setEmailError(`Email address "${nextEmail}" is invalid.`);
      return;
    }

    if (nextEmail === details.authEmail) {
      setEmailError("New email must be different from current email.");
      return;
    }

    setSaving(true);

    try {
      // Try to update Supabase Auth (may fail if current email has issues)
      let authUpdateFailed = false;
      const { error: updateAuthError } = await supabase.auth.updateUser({
        email: nextEmail,
      });

      if (updateAuthError) {
        console.error("Auth email update error:", updateAuthError);
        authUpdateFailed = true;
      }

      // Always update the database record (this is our source of truth)
      const { error: updateOfficialError } = await supabase
        .from("barangay_officials")
        .update({ email: nextEmail })
        .eq("uid", details.authUid);

      if (updateOfficialError) {
        console.error("Official email sync error:", updateOfficialError);
        setEmailError(
          updateOfficialError.message || "Failed to update email in database."
        );
        return;
      }

      // Success
      setDetails((prev) => ({ ...prev, authEmail: nextEmail }));

      let successMsg =
        "Email updated successfully. Please verify your new email.";
      if (authUpdateFailed) {
        successMsg +=
          " (Note: Verification email may not be sent - please contact support if needed.)";
      }
      setEmailSuccess(successMsg);
      setEmailModalOpen(false);
    } catch (err) {
      console.error("Error updating official email:", err);
      setEmailError("Failed to update email: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ==================== Email Update ====================
  const handleChangePassword = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please complete all password fields.");
      return;
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(
        `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }

    if (!details.authEmail) {
      setPasswordError("Cannot verify current password because no account email is available.");
      return;
    }

    setSaving(true);

    try {
      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: details.authEmail,
        password: currentPassword,
      });

      if (signInError) {
        console.error("Sign in error:", signInError);
        setPasswordError("Current password is incorrect.");
        return;
      }

      // Update password
      const { error: updatePasswordError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updatePasswordError) {
        console.error("Password update error:", updatePasswordError);
        setPasswordError(updatePasswordError.message || "Unable to update password.");
        return;
      }

      // Success
      setPasswordSuccess("Password changed successfully.");
      setPasswordModalOpen(false);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      console.log("Official password updated successfully");
    } catch (err) {
      console.error("Error updating password:", err);
      setPasswordError("Failed to update password: " + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  // ==================== Reusable Components ====================
  const PasswordField = ({ label, value, onChange, showPassword, onToggle }) => (
    <div className="settings-field">
      <label>{label}</label>
      <div className="password-field">
        <input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={onChange}
          required
        />
        <button
          type="button"
          className="password-toggle-btn"
          aria-label={showPassword ? `Hide ${label}` : `Show ${label}`}
          onClick={onToggle}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        className="settings-button"
        title="Settings"
        onClick={openSettings}
        aria-label="Open settings"
      >
        <Settings size={18} />
      </button>

      {open &&
        createPortal(
          <div className="settings-modal-overlay" onClick={closeSettings}>
            <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
              <div className="settings-modal-header">
                <h3>Settings</h3>
                <button
                  type="button"
                  className="settings-close-btn"
                  aria-label="Close settings"
                  onClick={closeSettings}
                >
                  ×
                </button>
              </div>

              <div style={{ padding: "20px" }}>
                <section className="settings-section">
                  <h4>Account Details</h4>

                  {loading ? (
                    <p className="settings-note">Loading account details...</p>
                  ) : error ? (
                    <p className="settings-error">{error}</p>
                  ) : (
                    <>
                      <div className="settings-field">
                        <label>Email</label>
                        <div className="settings-inline-field">
                          <input type="text" value={displayEmail} readOnly />
                          <button
                            type="button"
                            className="settings-inline-action"
                            onClick={handleOpenEmailModal}
                          >
                            Change Email
                          </button>
                        </div>
                      </div>

                      <div className="settings-field">
                        <label>Change Password</label>
                        <div className="settings-inline-field">
                          <input type="password" value={MASKED_PASSWORD} readOnly />
                          <button
                            type="button"
                            className="settings-inline-action"
                            onClick={handleOpenPasswordModal}
                          >
                            Change Password
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </section>
              </div>

              {emailModalOpen && (
                <div className="settings-submodal-overlay" onClick={() => setEmailModalOpen(false)}>
                  <div className="settings-submodal" onClick={(e) => e.stopPropagation()}>
                    <h4>Change Email</h4>
                    <form onSubmit={handleChangeEmail}>
                      <div style={{ padding: "16px" }}>
                        <div className="settings-field">
                          <label>New Email Address</label>
                          <input
                            type="email"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            placeholder="Enter new email"
                            required
                          />
                        </div>
                      </div>
                      {emailError && (
                        <p className="settings-error" style={{ padding: "0 16px", margin: "8px 0" }}>
                          {emailError}
                        </p>
                      )}
                      {emailSuccess && (
                        <p className="settings-success" style={{ padding: "0 16px", margin: "8px 0" }}>
                          {emailSuccess}
                        </p>
                      )}
                      <div className="settings-submodal-actions">
                        <button type="button" className="settings-sub-btn" onClick={() => setEmailModalOpen(false)}>
                          Cancel
                        </button>
                        <button type="submit" className="settings-sub-btn primary" disabled={saving}>
                          {saving ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {passwordModalOpen && (
                <div className="settings-submodal-overlay" onClick={() => setPasswordModalOpen(false)}>
                  <div className="settings-submodal" onClick={(e) => e.stopPropagation()}>
                    <h4>Change Password</h4>
                    <form onSubmit={handleChangePassword}>
                      <div style={{ padding: "16px" }}>
                        <PasswordField
                          label="Current Password"
                          value={passwordForm.currentPassword}
                          onChange={(e) =>
                            setPasswordForm((prev) => ({
                              ...prev,
                              currentPassword: e.target.value,
                            }))
                          }
                          showPassword={showPasswords.current}
                          onToggle={() =>
                            setShowPasswords((s) => ({ ...s, current: !s.current }))
                          }
                        />
                        <PasswordField
                          label="New Password"
                          value={passwordForm.newPassword}
                          onChange={(e) =>
                            setPasswordForm((prev) => ({
                              ...prev,
                              newPassword: e.target.value,
                            }))
                          }
                          showPassword={showPasswords.new}
                          onToggle={() =>
                            setShowPasswords((s) => ({ ...s, new: !s.new }))
                          }
                        />
                        <PasswordField
                          label="Confirm Password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) =>
                            setPasswordForm((prev) => ({
                              ...prev,
                              confirmPassword: e.target.value,
                            }))
                          }
                          showPassword={showPasswords.confirm}
                          onToggle={() =>
                            setShowPasswords((s) => ({ ...s, confirm: !s.confirm }))
                          }
                        />
                      </div>
                      {passwordError && (
                        <p className="settings-error" style={{ padding: "0 16px", margin: "8px 0" }}>
                          {passwordError}
                        </p>
                      )}
                      {passwordSuccess && (
                        <p className="settings-success" style={{ padding: "0 16px", margin: "8px 0" }}>
                          {passwordSuccess}
                        </p>
                      )}
                      <div className="settings-submodal-actions">
                        <button type="button" className="settings-sub-btn" onClick={() => setPasswordModalOpen(false)}>
                          Cancel
                        </button>
                        <button type="submit" className="settings-sub-btn primary" disabled={saving}>
                          {saving ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default OfficialSettings;
