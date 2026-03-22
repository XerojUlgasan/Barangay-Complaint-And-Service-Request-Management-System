import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import supabase from "../supabse_db/supabase_client";

const MASKED_PASSWORD = "********";

const ResidentSettings = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
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

  const displayContactNumber = useMemo(
    () => details.contactNumber || "Not available",
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

      const { data: registration, error: registrationError } = await supabase
        .from("registered_residents")
        .select("id, email, auth_uid")
        .eq("auth_uid", authUid)
        .maybeSingle();

      if (registrationError || !registration?.id) {
        setError("Resident account mapping not found.");
        return;
      }

      const { data: resident, error: residentError } = await supabase
        .from("residents_tbl")
        .select("id, email, contact_number")
        .eq("id", registration.id)
        .maybeSingle();

      if (residentError) {
        setError("Unable to load resident account details.");
        return;
      }

      setDetails({
        residentPk: resident?.id || registration.id,
        email:
          resident?.email || registration.email || userData.user.email || "",
        authEmail:
          userData.user.email || registration.email || resident?.email || "",
        contactNumber: resident?.contact_number || "",
        authUid,
      });
    } catch (err) {
      console.error("Error loading resident account details:", err);
      setError("Failed to load account details.");
    } finally {
      setLoading(false);
    }
  };

  const openSettings = async () => {
    setOpen(true);
    await loadAccountDetails();
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

  const handleChangeContact = async (e) => {
    e.preventDefault();
    const nextContact = contactInput.trim();

    if (!nextContact) {
      setActionError("Contact number is required.");
    }

    setSaving(true);
    resetActionMessages();

    try {
      const { error: contactUpdateError } = await supabase
        .from("residents_tbl")
        .update({ contact_number: nextContact })
        .eq("id", details.residentPk);

      if (contactUpdateError) {
        setActionError(
          contactUpdateError.message || "Unable to update contact number.",
        );
        return;
      }

      setDetails((prev) => ({
        ...prev,
        contactNumber: nextContact,
      }));
      setActionSuccess("Contact number updated successfully.");
      setContactModalOpen(false);
    } catch (err) {
      console.error("Error updating contact number:", err);
      setActionError("Failed to update contact number.");
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
        setActionError("Current password is incorrect.");
        return;
      }

      const { error: updatePasswordError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updatePasswordError) {
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
    } catch (err) {
      console.error("Error updating password:", err);
      setActionError("Failed to update password.");
    } finally {
      setSaving(false);
    }
  };
  const closeSettings = () => {
    setOpen(false);
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
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
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

              <section className="settings-section">
                <h4>Account Details</h4>

                {loading ? (
                  <p className="settings-note">Loading account details...</p>
                ) : error ? (
                  <p className="settings-error">{error}</p>
                ) : (
                  <>
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
                      <div className="settings-field">
                        <label>New Contact Number</label>
                        <input
                          type="text"
                          value={contactInput}
                          onChange={(e) => setContactInput(e.target.value)}
                          required
                        />
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
                      <div className="settings-field">
                        <label>Current Password</label>
                        <input
                          type="password"
                          value={passwordForm.currentPassword}
                          onChange={(e) =>
                            setPasswordForm((prev) => ({
                              ...prev,
                              currentPassword: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                      <div className="settings-field">
                        <label>New Password</label>
                        <input
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={(e) =>
                            setPasswordForm((prev) => ({
                              ...prev,
                              newPassword: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                      <div className="settings-field">
                        <label>Confirm Password</label>
                        <input
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) =>
                            setPasswordForm((prev) => ({
                              ...prev,
                              confirmPassword: e.target.value,
                            }))
                          }
                          required
                        />
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
