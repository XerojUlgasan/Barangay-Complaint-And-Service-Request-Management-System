import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Settings, Eye, EyeOff } from "lucide-react";
import supabase from "../supabse_db/supabase_client";

const MASKED_PASSWORD = "••••••••";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHILIPPINE_MOBILE_PATTERN = /^(09\d{9}|\+639\d{9})$/;

const isValidEmail = (value) => EMAIL_PATTERN.test(value);
const isValidPhilippineMobile = (value) =>
  PHILIPPINE_MOBILE_PATTERN.test(value);

const ResidentSettings = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [contactInput, setContactInput] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState({
    residentPk: "",
    email: "",
    authEmail: "",
    contactNumber: "",
    authUid: "",
  });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  const displayContactNumber = useMemo(
    () => details.contactNumber || "Not available",
    [details],
  );

  const displayEmail = useMemo(
    () => details.authEmail || "Not available",
    [details],
  );

  const resetActionMessages = () => {
    setActionError("");
    setActionSuccess("");
  };

  const loadAccountDetails = async () => {
    setLoading(true);
    setError("");
    resetActionMessages();

    try {
      const { data: userData, error: authError } =
        await supabase.auth.getUser();
      if (authError || !userData?.user?.id) {
        setError("Unable to identify current user.");
        return;
      }

      const authUid = userData.user.id;
      const authUserEmail = userData.user.email || "";
      const authUserContact = userData.user.user_metadata?.contact_number || "";

      const { data: registration, error: registrationError } = await supabase
        .from("registered_residents")
        .select("id, email, auth_uid")
        .eq("auth_uid", authUid)
        .maybeSingle();

      if (registrationError) {
        console.error("Registration query error:", registrationError);
        setError(
          "Error loading resident mapping: " + registrationError.message,
        );
        return;
      }

      if (!registration?.id) {
        setError("Resident account mapping not found. Please contact support.");
        return;
      }

      // registration.id is the numeric resident ID
      const residentId = registration.id;

      // Query the resident row to get display info (read-only)
      const { data: resident, error: residentError } = await supabase
        .schema("barangaylink")
        .from("residents")
        .select("id, email, contact_number")
        .eq("id", residentId)
        .maybeSingle();

      if (residentError) {
        // If resident view record not found, just log warning
        console.warn(
          "Resident view query warning (non-critical):",
          residentError,
        );
      }

      // Priority: user_metadata contact > resident view contact > empty
      const finalContactNumber =
        authUserContact || resident?.contact_number || "";
      const finalEmail =
        authUserEmail || registration.email || resident?.email || "";

      setDetails({
        residentPk: residentId,
        email: finalEmail,
        authEmail: authUserEmail || registration.email || resident?.email || "",
        contactNumber: finalContactNumber,
        authUid,
      });

      console.log("Account details loaded successfully:", {
        residentId,
        authEmail: authUserEmail,
        contactNumber: finalContactNumber,
        source: authUserContact
          ? "user_metadata"
          : resident?.contact_number
            ? "resident_view"
            : "none",
      });
    } catch (err) {
      console.error("Error loading resident account details:", err);
      setError("Failed to load account details: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const openSettings = async () => {
    setOpen(true);
    await loadAccountDetails();
  };

  const handleOpenEmailModal = () => {
    resetActionMessages();
    setEmailInput(details.authEmail || "");
    setEmailModalOpen(true);
  };

  const handleOpenContactModal = () => {
    resetActionMessages();
    setContactInput(details.contactNumber || "");
    setContactModalOpen(true);
  };

  const handleOpenPasswordModal = () => {
    resetActionMessages();
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setPasswordModalOpen(true);
  };

  const handleChangeEmail = async (e) => {
    e.preventDefault();
    const nextEmail = emailInput.trim().toLowerCase();

    if (!nextEmail) {
      setActionError("Email is required.");
      return;
    }

    if (!isValidEmail(nextEmail)) {
      setActionError("Please enter a valid email address.");
      return;
    }

    if (nextEmail === details.authEmail) {
      setActionError("New email must be different from current email.");
      return;
    }

    setSaving(true);
    resetActionMessages();

    try {
      // Update email in Supabase Auth
      const { error: updateAuthError } = await supabase.auth.updateUser({
        email: nextEmail,
      });

      if (updateAuthError) {
        console.error("Auth email update error:", updateAuthError);
        setActionError(
          updateAuthError.message || "Unable to update email in auth.",
        );
        return;
      }

      // Update email in registered_residents table
      const { error: updateRegError } = await supabase
        .from("registered_residents")
        .update({ email: nextEmail })
        .eq("auth_uid", details.authUid);

      if (updateRegError) {
        console.error(
          "Registered residents email update error:",
          updateRegError,
        );
        setActionError(
          updateRegError.message || "Unable to update email in database.",
        );
        return;
      }

      // Update email in barangaylink.residents so the profile stays in sync
      if (details.residentPk) {
        const { error: updateResError } = await supabase
          .schema("barangaylink")
          .from("residents")
          .update({ email: nextEmail })
          .eq("id", details.residentPk);

        if (updateResError) {
          console.warn(
            "Resident email update warning (non-critical):",
            updateResError,
          );
          // Don't fail here - auth email was already updated successfully
        }
      }

      setDetails((prev) => ({
        ...prev,
        authEmail: nextEmail,
        email: nextEmail,
      }));
      setActionSuccess(
        "Email updated successfully. Please verify your new email.",
      );
      setEmailModalOpen(false);
      console.log("Email updated successfully");
    } catch (err) {
      console.error("Error updating email:", err);
      setActionError("Failed to update email: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangeContact = async (e) => {
    e.preventDefault();
    const nextContact = contactInput.trim();

    if (!nextContact) {
      setActionError("Contact number is required.");
      return;
    }

    if (!isValidPhilippineMobile(nextContact)) {
      setActionError(
        "Please enter a valid Philippine mobile number, such as 09XXXXXXXXX or +639XXXXXXXXX.",
      );
      return;
    }

    setSaving(true);
    resetActionMessages();

    try {
      // Store contact in user_metadata (persists across sessions)
      const { error: updateError } = await supabase.auth.updateUser({
        data: { contact_number: nextContact },
      });

      if (updateError) {
        console.error("Contact update error:", updateError);
        setActionError(
          updateError.message || "Unable to update contact number.",
        );
        return;
      }

      if (details.residentPk) {
        const { error: updateResidentError } = await supabase
          .schema("barangaylink")
          .from("residents")
          .update({ contact_number: nextContact })
          .eq("id", details.residentPk);

        if (updateResidentError) {
          console.error("Resident contact update error:", updateResidentError);
          setActionError(
            updateResidentError.message ||
              "Unable to update resident contact number.",
          );
          return;
        }
      }

      // Refresh session to get updated metadata
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.warn("Session refresh warning:", refreshError);
        // Don't fail - contact was updated successfully
      }

      setDetails((prev) => ({
        ...prev,
        contactNumber: nextContact,
      }));
      setActionSuccess("Contact number updated successfully.");
      setContactModalOpen(false);
      console.log("Contact number updated successfully");
    } catch (err) {
      console.error("Error updating contact number:", err);
      setActionError("Failed to update contact number: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const currentPassword = passwordForm.currentPassword;
    const newPassword = passwordForm.newPassword;
    const confirmPassword = passwordForm.confirmPassword;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setActionError("Please complete all password fields.");
      return;
    }

    if (newPassword.length < 6) {
      setActionError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setActionError("New password and confirm password do not match.");
      return;
    }

    if (!details.authEmail) {
      setActionError(
        "Cannot verify current password because no account email is available.",
      );
      return;
    }

    setSaving(true);
    resetActionMessages();

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: details.authEmail,
        password: currentPassword,
      });

      if (signInError) {
        console.error("Sign in error:", signInError);
        setActionError("Current password is incorrect.");
        return;
      }

      const { error: updatePasswordError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updatePasswordError) {
        console.error("Password update error:", updatePasswordError);
        setActionError(
          updatePasswordError.message || "Unable to update password.",
        );
        return;
      }

      setActionSuccess("Password changed successfully.");
      setPasswordModalOpen(false);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      console.log("Password updated successfully");
    } catch (err) {
      console.error("Error updating password:", err);
      setActionError("Failed to update password: " + err.message);
    } finally {
      setSaving(false);
    }
  };
  const closeSettings = () => {
    setOpen(false);
    setEmailModalOpen(false);
    setContactModalOpen(false);
    setPasswordModalOpen(false);
  };

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
            <div
              className="settings-modal"
              onClick={(e) => e.stopPropagation()}
            >
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
                        <label>Contact Number</label>
                        <div className="settings-inline-field">
                          <input
                            type="text"
                            value={displayContactNumber}
                            readOnly
                          />
                          <button
                            type="button"
                            className="settings-inline-action"
                            onClick={handleOpenContactModal}
                          >
                            Change Contact Number
                          </button>
                        </div>
                      </div>

                      <div className="settings-field">
                        <label>Change Password</label>
                        <div className="settings-inline-field">
                          <input
                            type="password"
                            value={MASKED_PASSWORD}
                            readOnly
                          />
                          <button
                            type="button"
                            className="settings-inline-action"
                            onClick={handleOpenPasswordModal}
                          >
                            Change Password
                          </button>
                        </div>
                      </div>

                      {actionError ? (
                        <p className="settings-error">{actionError}</p>
                      ) : null}
                      {actionSuccess ? (
                        <p className="settings-success">{actionSuccess}</p>
                      ) : null}
                    </>
                  )}
                </section>
              </div>

              {emailModalOpen && (
                <div
                  className="settings-submodal-overlay"
                  onClick={() => setEmailModalOpen(false)}
                >
                  <div
                    className="settings-submodal"
                    onClick={(e) => e.stopPropagation()}
                  >
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
                            autoComplete="email"
                            required
                          />
                        </div>
                      </div>
                      <div className="settings-submodal-actions">
                        <button
                          type="button"
                          className="settings-sub-btn"
                          onClick={() => setEmailModalOpen(false)}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="settings-sub-btn primary"
                          disabled={saving}
                        >
                          {saving ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {contactModalOpen && (
                <div
                  className="settings-submodal-overlay"
                  onClick={() => setContactModalOpen(false)}
                >
                  <div
                    className="settings-submodal"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h4>Change Contact Number</h4>
                    <form onSubmit={handleChangeContact}>
                      <div style={{ padding: "16px" }}>
                        <div className="settings-field">
                          <label>New Contact Number</label>
                          <input
                            type="text"
                            value={contactInput}
                            onChange={(e) => setContactInput(e.target.value)}
                            inputMode="tel"
                            placeholder="09XXXXXXXXX or +639XXXXXXXXX"
                            autoComplete="tel"
                            pattern="^(09\\d{9}|\\+639\\d{9})$"
                            title="Use 09XXXXXXXXX or +639XXXXXXXXX"
                            required
                          />
                        </div>
                      </div>
                      <div className="settings-submodal-actions">
                        <button
                          type="button"
                          className="settings-sub-btn"
                          onClick={() => setContactModalOpen(false)}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="settings-sub-btn primary"
                          disabled={saving}
                        >
                          {saving ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {passwordModalOpen && (
                <div
                  className="settings-submodal-overlay"
                  onClick={() => setPasswordModalOpen(false)}
                >
                  <div
                    className="settings-submodal"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h4>Change Password</h4>
                    <form onSubmit={handleChangePassword}>
                      <div style={{ padding: "16px" }}>
                        <div className="settings-field">
                          <label>Current Password</label>
                          <div className="password-field">
                            <input
                              type={showPasswords.current ? "text" : "password"}
                              value={passwordForm.currentPassword}
                              onChange={(e) =>
                                setPasswordForm((prev) => ({
                                  ...prev,
                                  currentPassword: e.target.value,
                                }))
                              }
                              required
                            />
                            <button
                              type="button"
                              className="password-toggle-btn"
                              aria-label={showPasswords.current ? "Hide current password" : "Show current password"}
                              onClick={() => setShowPasswords((s) => ({ ...s, current: !s.current }))}
                            >
                              {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>

                        <div className="settings-field">
                          <label>New Password</label>
                          <div className="password-field">
                            <input
                              type={showPasswords.new ? "text" : "password"}
                              value={passwordForm.newPassword}
                              onChange={(e) =>
                                setPasswordForm((prev) => ({
                                  ...prev,
                                  newPassword: e.target.value,
                                }))
                              }
                              required
                            />
                            <button
                              type="button"
                              className="password-toggle-btn"
                              aria-label={showPasswords.new ? "Hide new password" : "Show new password"}
                              onClick={() => setShowPasswords((s) => ({ ...s, new: !s.new }))}
                            >
                              {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>

                        <div className="settings-field">
                          <label>Confirm Password</label>
                          <div className="password-field">
                            <input
                              type={showPasswords.confirm ? "text" : "password"}
                              value={passwordForm.confirmPassword}
                              onChange={(e) =>
                                setPasswordForm((prev) => ({
                                  ...prev,
                                  confirmPassword: e.target.value,
                                }))
                              }
                              required
                            />
                            <button
                              type="button"
                              className="password-toggle-btn"
                              aria-label={showPasswords.confirm ? "Hide confirm password" : "Show confirm password"}
                              onClick={() => setShowPasswords((s) => ({ ...s, confirm: !s.confirm }))}
                            >
                              {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="settings-submodal-actions">
                        <button
                          type="button"
                          className="settings-sub-btn"
                          onClick={() => setPasswordModalOpen(false)}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="settings-sub-btn primary"
                          disabled={saving}
                        >
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

export default ResidentSettings;
