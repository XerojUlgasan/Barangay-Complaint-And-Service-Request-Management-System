import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Users,
  User,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  MapPin,
  FileText,
  BadgeInfo,
  X,
  ShieldCheck,
  ShieldOff,
  Search,
  Loader2,
  AlertTriangle,
  Settings,
} from "lucide-react";
import {
  getAllOfficials,
  getResidentsUsersTable,
  getResidentById,
  getOfficialByCode,
  getOfficialAccessControl,
  deactivateOfficial,
  getActivatedOfficials,
  upsertOfficialAccessControl,
} from "../../supabse_db/superadmin/superadmin";
import supabase, { API_CONFIG } from "../../supabse_db/supabase_client";
import "../../styles/BarangayAdmin.css";

const DEFAULT_OFFICIAL_PERMISSIONS = {
  read_req: false,
  edit_req: false,
  read_comp: false,
  edit_comp: false,
  read_sett: false,
  create_sett: false,
  update_sett: false,
};

const PERMISSION_FIELDS = [
  { key: "read_req", label: "Reading requests" },
  { key: "edit_req", label: "Update requests" },
  { key: "read_comp", label: "Read complaints" },
  { key: "edit_comp", label: "Update complaints" },
  { key: "read_sett", label: "View settlements" },
  { key: "create_sett", label: "Create settlements" },
  { key: "update_sett", label: "Update settlements" },
];

export default function AdminUsers() {
  const [officials, setOfficials] = useState([]);
  const [residentUsers, setResidentUsers] = useState([]);
  const [activeUsersSection, setActiveUsersSection] = useState("officials");
  const [selectedResident, setSelectedResident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Activate Official modal state ───────────────────────────────
  const [activateModal, setActivateModal] = useState(false);
  const [officialCode, setOfficialCode] = useState("");
  const [codeSearching, setCodeSearching] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [foundOfficial, setFoundOfficial] = useState(null);
  const [activating, setActivating] = useState(false);
  const [activateSuccess, setActivateSuccess] = useState(false);

  // ── Final confirmation step (activate) ─────────────────────────
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);

  // ── Email binding step (for activation) ────────────────────────
  const [showEmailBinding, setShowEmailBinding] = useState(false);
  const [bindingEmail, setBindingEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  // ── Official permissions modal ────────────────────────────────
  const [permissionsModal, setPermissionsModal] = useState(false);
  const [permissionsTarget, setPermissionsTarget] = useState(null);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsSaving, setPermissionsSaving] = useState(false);
  const [permissionsError, setPermissionsError] = useState("");
  const [permissionsValues, setPermissionsValues] = useState(
    DEFAULT_OFFICIAL_PERMISSIONS,
  );

  // ── Manage / Deactivate Officials modal ────────────────────────
  const [manageModal, setManageModal] = useState(false);
  const [activatedOfficials, setActivatedOfficials] = useState([]);
  const [manageLoading, setManageLoading] = useState(false);
  const [manageSearch, setManageSearch] = useState("");
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateSuccess, setDeactivateSuccess] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  const hasOfficialUid = (uid) => {
    if (uid === null || uid === undefined) return false;
    return String(uid).trim() !== "";
  };

  useEffect(() => {
    fetchUsersData();
  }, []);

  // Lock scroll when any modal is open
  useEffect(() => {
    const anyOpen =
      selectedResident ||
      activateModal ||
      foundOfficial ||
      showFinalConfirm ||
      showEmailBinding ||
      permissionsModal ||
      manageModal ||
      showDeactivateConfirm;
    if (!anyOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [
    selectedResident,
    activateModal,
    foundOfficial,
    showFinalConfirm,
    showEmailBinding,
    permissionsModal,
    manageModal,
    showDeactivateConfirm,
  ]);

  // Escape key closes modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (showEmailBinding) {
        setShowEmailBinding(false);
        return;
      }
      if (showDeactivateConfirm) {
        setShowDeactivateConfirm(false);
        return;
      }
      if (showFinalConfirm) {
        setShowFinalConfirm(false);
        return;
      }
      if (permissionsModal) {
        closePermissionsModal();
        return;
      }
      if (foundOfficial) {
        closeActivateFlow();
        return;
      }
      if (activateModal) {
        closeActivateFlow();
        return;
      }
      if (manageModal) {
        closeManageModal();
        return;
      }
      if (selectedResident) setSelectedResident(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedResident,
    activateModal,
    foundOfficial,
    showFinalConfirm,
    showEmailBinding,
    permissionsModal,
    manageModal,
    showDeactivateConfirm,
  ]);

  const fetchUsersData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [officialsResult, residentUsersResult] = await Promise.all([
        getAllOfficials(),
        getResidentsUsersTable(),
      ]);

      if (officialsResult.success && Array.isArray(officialsResult.data)) {
        const formattedOfficials = officialsResult.data.map((official) => ({
          id: official.id,
          uid: official.uid || null,
          officialCode: official.official_code || "N/A",
          name: official.full_name || "Unknown",
          status: hasOfficialUid(official.uid)
            ? "Registered"
            : "Not Registered",
          email: official.email || "N/A",
          role: official.role || "Official",
        }));
        setOfficials(formattedOfficials);
      } else {
        console.error("Failed to fetch officials:", officialsResult.message);
      }

      if (
        residentUsersResult.success &&
        Array.isArray(residentUsersResult.data)
      ) {
        const formattedResidentUsers = residentUsersResult.data.map(
          (resident) => ({
            id: resident.id,
            fullName: resident.full_name || "Unknown",
            contact: resident.contact_number || "N/A",
            email: resident.auth_email || resident.email || "N/A",
            status: resident.auth_uid ? "Registered" : "Not Registered",
            authUid: resident.auth_uid || null,
            resident,
          }),
        );
        setResidentUsers(formattedResidentUsers);
      } else {
        console.error(
          "Failed to fetch residents users table:",
          residentUsersResult.message,
        );
      }

      setLoading(false);
    } catch (err) {
      console.error("Error fetching users data:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  // ── Activate Official helpers ───────────────────────────────────
  const openActivateModal = () => {
    setActivateModal(true);
    setOfficialCode("");
    setCodeError("");
    setFoundOfficial(null);
    setActivateSuccess(false);
    setShowFinalConfirm(false);
  };

  const closeActivateFlow = () => {
    setActivateModal(false);
    setFoundOfficial(null);
    setOfficialCode("");
    setCodeError("");
    setActivateSuccess(false);
    setShowFinalConfirm(false);
    setShowEmailBinding(false);
    setBindingEmail("");
    setEmailError("");
  };

  const handleCodeSearch = async () => {
    if (!officialCode.trim()) {
      setCodeError("Please enter an official code.");
      return;
    }
    setCodeSearching(true);
    setCodeError("");
    try {
      const result = await getOfficialByCode(officialCode.trim().toUpperCase());
      if (result.success && result.data) {
        setFoundOfficial(result.data);
        setActivateModal(false);
      } else {
        setCodeError(result.message || "No official found with that code.");
      }
    } catch (err) {
      setCodeError("Something went wrong. Please try again.");
    } finally {
      setCodeSearching(false);
    }
  };

  const handleActivateClick = () => {
    // Open email binding modal instead of final confirm
    setShowEmailBinding(true);
    setBindingEmail("");
    setEmailError("");
  };

  const handleActivateConfirm = async () => {
    // Validate email
    if (!bindingEmail.trim()) {
      setEmailError("Please enter an email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(bindingEmail.trim())) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    setShowEmailBinding(false);
    setActivating(true);
    try {
      // Get the access token from Supabase
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setCodeError("Authentication error. Please log in again.");
        setActivating(false);
        return;
      }

      const accessToken = session.access_token;

      const response = await fetch(
        `${API_CONFIG.SERVER_API_URL}/superadmin/activateOfficial`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            official_code: foundOfficial.official_code,
            email: bindingEmail.trim(),
          }),
        },
      );

      const data = await response.json();

      if (data.success) {
        setActivateSuccess(true);
        setBindingEmail("");
        setEmailError("");
        await fetchUsersData();
      } else {
        setCodeError(data.message || "Activation failed.");
      }
    } catch (err) {
      console.error("Activation error:", err);
      setCodeError("Activation failed. Please try again.");
    } finally {
      setActivating(false);
    }
  };

  // ── Manage / Deactivate helpers ─────────────────────────────────
  const openManageModal = async () => {
    setManageModal(true);
    setManageSearch("");
    setDeactivateTarget(null);
    setDeactivateSuccess(false);
    setShowDeactivateConfirm(false);
    setManageLoading(true);
    try {
      const result = await getActivatedOfficials();
      if (result.success) {
        setActivatedOfficials(result.data);
      } else {
        setActivatedOfficials([]);
      }
    } catch {
      setActivatedOfficials([]);
    } finally {
      setManageLoading(false);
    }
  };

  const closeManageModal = () => {
    setManageModal(false);
    setDeactivateTarget(null);
    setDeactivateSuccess(false);
    setShowDeactivateConfirm(false);
    setManageSearch("");
  };

  const handleDeactivateClick = (official) => {
    setDeactivateTarget(official);
    setShowDeactivateConfirm(true);
  };

  const handleDeactivateConfirm = async () => {
    if (!deactivateTarget) return;
    setShowDeactivateConfirm(false);
    setDeactivating(true);
    try {
      const result = await deactivateOfficial(
        deactivateTarget.official_id ?? deactivateTarget.id,
      );
      if (result.success) {
        setDeactivateSuccess(true);
        // Refresh activated officials list
        const refreshed = await getActivatedOfficials();
        if (refreshed.success) setActivatedOfficials(refreshed.data);
        await fetchUsersData();
      }
    } catch (err) {
      console.error("Deactivation failed:", err);
    } finally {
      setDeactivating(false);
    }
  };

  const handleViewResidentDetails = async (residentRow) => {
    if (!residentRow?.id) return;

    try {
      const result = await getResidentById(residentRow.id);
      if (result.success && result.data) {
        setSelectedResident(result.data);
        return;
      }
    } catch (err) {
      console.error("Failed to load resident details:", err);
    }

    setSelectedResident(residentRow.resident || residentRow);
  };

  const closePermissionsModal = () => {
    setPermissionsModal(false);
    setPermissionsTarget(null);
    setPermissionsLoading(false);
    setPermissionsSaving(false);
    setPermissionsError("");
    setPermissionsValues(DEFAULT_OFFICIAL_PERMISSIONS);
  };

  const openPermissionsModal = async (official) => {
    if (!official?.uid) return;

    setPermissionsTarget(official);
    setPermissionsValues(DEFAULT_OFFICIAL_PERMISSIONS);
    setPermissionsError("");
    setPermissionsModal(true);
    setPermissionsLoading(true);

    try {
      const result = await getOfficialAccessControl(official.uid);

      if (result.success && result.data) {
        setPermissionsValues({
          read_req: Boolean(result.data.read_req),
          edit_req: Boolean(result.data.edit_req),
          read_comp: Boolean(result.data.read_comp),
          edit_comp: Boolean(result.data.edit_comp),
          read_sett: Boolean(result.data.read_sett),
          create_sett: Boolean(result.data.create_sett),
          update_sett: Boolean(result.data.update_sett),
        });
      } else if (!result.success) {
        setPermissionsError(result.message || "Failed to load permissions.");
      }
    } catch (err) {
      console.error("Failed to load permissions:", err);
      setPermissionsError("Failed to load permissions.");
    } finally {
      setPermissionsLoading(false);
    }
  };

  const togglePermission = (key) => {
    setPermissionsValues((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSavePermissions = async () => {
    if (!permissionsTarget?.uid) {
      setPermissionsError("Official account is not registered yet.");
      return;
    }

    setPermissionsSaving(true);
    setPermissionsError("");

    try {
      const result = await upsertOfficialAccessControl(
        permissionsTarget.uid,
        permissionsValues,
      );

      if (result.success) {
        closePermissionsModal();
      } else {
        setPermissionsError(result.message || "Failed to save permissions.");
      }
    } catch (err) {
      console.error("Failed to save permissions:", err);
      setPermissionsError("Failed to save permissions.");
    } finally {
      setPermissionsSaving(false);
    }
  };

  // ── Badge helpers ───────────────────────────────────────────────
  const badgeFor = (status) => {
    const normalized = String(status || "")
      .trim()
      .toUpperCase();

    if (normalized === "REGISTERED")
      return {
        className: "status-badge available",
        icon: <CheckCircle size={14} />,
      };

    return { className: "status-badge offline", icon: <XCircle size={14} /> };
  };

  const activationBadgeFor = (isActivated) => {
    if (isActivated === true)
      return {
        className: "status-badge available",
        icon: <CheckCircle size={14} />,
        label: "Activated",
      };
    if (isActivated === false)
      return {
        className: "status-badge offline",
        icon: <XCircle size={14} />,
        label: "Not Activated",
      };
    return {
      className: "status-badge busy",
      icon: <Clock size={14} />,
      label: "Not Set",
    };
  };

  const formatLongDate = (value) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatResidentAddress = (resident) => resident?.address_line || "N/A";

  const detailValue = (value) => {
    if (value === null || value === undefined || value === "") return "N/A";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return value;
  };

  const isAlreadyActivated =
    foundOfficial &&
    foundOfficial.uid !== null &&
    foundOfficial.uid !== undefined &&
    foundOfficial.uid !== "";

  const filteredActivated = activatedOfficials.filter((o) => {
    const q = manageSearch.toLowerCase();
    if (!q) return true;
    const name = `${o.first_name || ""} ${o.last_name || ""}`.toLowerCase();
    const code = (o.official_code || "").toLowerCase();
    const position = (o.position || "").toLowerCase();
    return name.includes(q) || code.includes(q) || position.includes(q);
  });

  const residentSections = selectedResident
    ? [
        {
          title: "Identity",
          icon: <BadgeInfo size={18} />,
          items: [
            { label: "Resident ID", value: detailValue(selectedResident.id) },
            {
              label: "Resident No.",
              value: detailValue(selectedResident.resident_no),
            },
            {
              label: "Profile ID",
              value: detailValue(selectedResident.profile_id),
            },
            {
              label: "ID Number",
              value: detailValue(selectedResident.id_number),
            },
            { label: "Status", value: detailValue(selectedResident.status) },
            {
              label: "Created At",
              value: formatLongDate(selectedResident.created_at),
            },
            {
              label: "Updated At",
              value: formatLongDate(selectedResident.updated_at),
            },
          ],
        },
        {
          title: "Personal Information",
          icon: <User size={18} />,
          items: [
            {
              label: "First Name",
              value: detailValue(selectedResident.first_name),
            },
            {
              label: "Middle Name",
              value: detailValue(selectedResident.middle_name),
            },
            {
              label: "Last Name",
              value: detailValue(selectedResident.last_name),
            },
            { label: "Suffix", value: detailValue(selectedResident.suffix) },
            {
              label: "Date of Birth",
              value: detailValue(selectedResident.date_of_birth),
            },
            {
              label: "Place of Birth",
              value: detailValue(selectedResident.place_of_birth),
            },
            { label: "Sex", value: detailValue(selectedResident.sex) },
            {
              label: "Civil Status",
              value: detailValue(selectedResident.civil_status),
            },
            {
              label: "Nationality",
              value: detailValue(selectedResident.nationality),
            },
            {
              label: "Religion",
              value: detailValue(selectedResident.religion),
            },
            {
              label: "Blood Type",
              value: detailValue(selectedResident.blood_type),
            },
            {
              label: "Age Group",
              value: detailValue(selectedResident.age_group),
            },
          ],
        },
        {
          title: "Contact and Location",
          icon: <MapPin size={18} />,
          items: [
            { label: "Email", value: detailValue(selectedResident.email) },
            {
              label: "Contact Number",
              value: detailValue(selectedResident.contact_number),
            },
            {
              label: "Address",
              value: detailValue(formatResidentAddress(selectedResident)),
            },
            {
              label: "Household ID",
              value: detailValue(selectedResident.household_id),
            },
            {
              label: "Purok ID",
              value: detailValue(selectedResident.purok_id),
            },
            {
              label: "Years of Stay",
              value: detailValue(selectedResident.years_of_stay),
            },
          ],
        },
        {
          title: "Government and Record Details",
          icon: <FileText size={18} />,
          items: [
            {
              label: "Occupation",
              value: detailValue(selectedResident.occupation),
            },
            {
              label: "Voter Status",
              value: detailValue(selectedResident.voter_status),
            },
            {
              label: "PhilHealth No.",
              value: detailValue(selectedResident.philhealth_no),
            },
            { label: "SSS No.", value: detailValue(selectedResident.sss_no) },
            { label: "TIN No.", value: detailValue(selectedResident.tin_no) },
            {
              label: "Created By",
              value: detailValue(selectedResident.created_by),
            },
            {
              label: "Photo URL",
              value: detailValue(selectedResident.photo_url),
            },
          ],
        },
      ]
    : [];

  const residentUsersCount = residentUsers.length;

  // ── Portals ─────────────────────────────────────────────────────

  // Resident details modal
  const residentModal =
    selectedResident && typeof document !== "undefined"
      ? createPortal(
          <div
            className="resident-modal-overlay"
            onClick={() => setSelectedResident(null)}
          >
            <div
              className="resident-modal-shell"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="resident-modal-header">
                <div>
                  <h3 className="resident-modal-title">
                    {selectedResident.full_name || "Resident Details"}
                  </h3>
                  <p className="resident-modal-subtitle">
                    Full resident record from household database
                  </p>
                </div>
                <button
                  type="button"
                  className="resident-modal-close"
                  onClick={() => setSelectedResident(null)}
                  aria-label="Close resident details"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="resident-modal-content">
                <div className="resident-modal-summary">
                  <div className="resident-summary-card">
                    <div className="resident-summary-label">Full Name</div>
                    <div className="resident-summary-value">
                      {selectedResident.full_name || "N/A"}
                    </div>
                  </div>
                  <div className="resident-summary-card">
                    <div className="resident-summary-label">Email</div>
                    <div className="resident-summary-value">
                      {detailValue(selectedResident.email)}
                    </div>
                  </div>
                  <div className="resident-summary-card">
                    <div className="resident-summary-label">Phone Number</div>
                    <div className="resident-summary-value">
                      {detailValue(selectedResident.contact_number)}
                    </div>
                  </div>
                  <div className="resident-summary-card">
                    <div className="resident-summary-label">Address</div>
                    <div className="resident-summary-value">
                      {detailValue(formatResidentAddress(selectedResident))}
                    </div>
                  </div>
                </div>
                <div className="resident-section-grid">
                  {residentSections.map((section) => (
                    <section
                      key={section.title}
                      className="resident-section-card"
                    >
                      <div className="resident-section-header">
                        <span className="resident-section-icon">
                          {section.icon}
                        </span>
                        <h4>{section.title}</h4>
                      </div>
                      <div className="resident-field-list">
                        {section.items.map((item) => (
                          <div key={item.label} className="resident-field-row">
                            <div className="resident-field-label">
                              {item.label}
                            </div>
                            <div className="resident-field-value">
                              {item.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  const permissionsModalPortal =
    permissionsModal && typeof document !== "undefined"
      ? createPortal(
          <div
            className="ao-overlay"
            style={{ zIndex: 10280 }}
            onClick={closePermissionsModal}
          >
            <div
              className="ao-modal"
              style={{ width: "min(620px, 100%)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ao-modal-header">
                <div
                  className="ao-modal-header-icon"
                  style={{
                    background:
                      "linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)",
                    boxShadow: "0 4px 12px rgba(14,165,233,0.3)",
                  }}
                >
                  <Settings size={22} />
                </div>
                <div>
                  <h3 className="ao-modal-title">Permissions</h3>
                  <p className="ao-modal-subtitle">
                    Configure access for {permissionsTarget?.first_name || ""}{" "}
                    {permissionsTarget?.last_name || ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="ao-close-btn"
                  onClick={closePermissionsModal}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="ao-modal-body">
                {permissionsLoading ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      padding: "28px 0",
                      color: "#64748b",
                    }}
                  >
                    <Loader2 size={18} className="ao-spin" />
                    Loading permissions...
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        background: "#eff6ff",
                        border: "1.5px solid #bfdbfe",
                        borderRadius: 12,
                        padding: "12px 14px",
                        marginBottom: 16,
                        color: "#1e3a8a",
                        fontSize: 13,
                        lineHeight: 1.6,
                      }}
                    >
                      Set the official permissions below. Leaving a box
                      unchecked keeps that access disabled.
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: 12,
                      }}
                    >
                      {PERMISSION_FIELDS.map((item) => (
                        <label
                          key={item.key}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            border: "1.5px solid #e2e8f0",
                            borderRadius: 12,
                            padding: "12px 14px",
                            background: permissionsValues[item.key]
                              ? "#f0fdf4"
                              : "#fff",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(permissionsValues[item.key])}
                            onChange={() => togglePermission(item.key)}
                            style={{ width: 16, height: 16 }}
                          />
                          <span style={{ fontWeight: 600, color: "#0f172a" }}>
                            {item.label}
                          </span>
                        </label>
                      ))}
                    </div>

                    {permissionsError && (
                      <p className="ao-error" style={{ marginTop: 14 }}>
                        {permissionsError}
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="ao-modal-footer">
                <button
                  type="button"
                  className="ao-cancel-btn"
                  onClick={closePermissionsModal}
                  disabled={permissionsSaving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="ao-activate-btn"
                  onClick={handleSavePermissions}
                  disabled={permissionsLoading || permissionsSaving}
                >
                  {permissionsSaving ? (
                    <>
                      <Loader2 size={16} className="ao-spin" /> Saving…
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} /> Save Permissions
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  // Step 1 — Code input modal
  const codeInputModal =
    activateModal && typeof document !== "undefined"
      ? createPortal(
          <div className="ao-overlay" onClick={closeActivateFlow}>
            <div className="ao-modal" onClick={(e) => e.stopPropagation()}>
              <div className="ao-modal-header">
                <div className="ao-modal-header-icon">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 className="ao-modal-title">Activate Official Account</h3>
                  <p className="ao-modal-subtitle">
                    Enter the official code assigned to the barangay official
                  </p>
                </div>
                <button
                  type="button"
                  className="ao-close-btn"
                  onClick={closeActivateFlow}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="ao-modal-body">
                <label className="ao-label" htmlFor="official-code-input">
                  Official Code
                </label>
                <div className="ao-input-row">
                  <input
                    id="official-code-input"
                    type="text"
                    className="ao-input"
                    placeholder="e.g. BRGY001"
                    value={officialCode}
                    onChange={(e) => {
                      setOfficialCode(e.target.value.toUpperCase());
                      setCodeError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleCodeSearch()}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="ao-search-btn"
                    onClick={handleCodeSearch}
                    disabled={codeSearching}
                  >
                    {codeSearching ? (
                      <Loader2 size={18} className="ao-spin" />
                    ) : (
                      <Search size={18} />
                    )}
                    {codeSearching ? "Searching…" : "Look Up"}
                  </button>
                </div>
                {codeError && <p className="ao-error">{codeError}</p>}
                <p className="ao-hint">
                  Format: BRGY followed by 3 digits (e.g. BRGY001, BRGY012)
                </p>
              </div>
              <div className="ao-modal-footer">
                <button
                  type="button"
                  className="ao-cancel-btn"
                  onClick={closeActivateFlow}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  // Step 2 — Details + confirmation modal
  const confirmModal =
    foundOfficial && !showFinalConfirm && typeof document !== "undefined"
      ? createPortal(
          <div
            className="ao-overlay"
            onClick={() => {
              if (!activating) closeActivateFlow();
            }}
          >
            <div
              className="ao-modal ao-modal--confirm"
              onClick={(e) => e.stopPropagation()}
            >
              {activateSuccess ? (
                <div className="ao-success-body">
                  <div className="ao-success-icon">
                    <CheckCircle size={48} />
                  </div>
                  <h3 className="ao-success-title">Account Activated!</h3>
                  <p className="ao-success-sub">
                    <strong>
                      {foundOfficial.first_name} {foundOfficial.last_name}
                    </strong>
                    's official account has been successfully activated.
                  </p>
                  <button
                    type="button"
                    className="ao-done-btn"
                    onClick={closeActivateFlow}
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <div className="ao-modal-header">
                    <div className="ao-modal-header-icon ao-modal-header-icon--confirm">
                      <ShieldCheck size={22} />
                    </div>
                    <div>
                      <h3 className="ao-modal-title">Confirm Activation</h3>
                      <p className="ao-modal-subtitle">
                        Review the official's details before activating
                      </p>
                    </div>
                    <button
                      type="button"
                      className="ao-close-btn"
                      onClick={closeActivateFlow}
                      disabled={activating}
                      aria-label="Close"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="ao-modal-body">
                    {isAlreadyActivated && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          background: "#ecfdf5",
                          border: "1.5px solid #6ee7b7",
                          borderRadius: 10,
                          padding: "12px 14px",
                          marginBottom: 16,
                        }}
                      >
                        <CheckCircle
                          size={18}
                          color="#059669"
                          style={{ flexShrink: 0 }}
                        />
                        <div>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 14,
                              color: "#065f46",
                            }}
                          >
                            Account is already activated
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#047857",
                              marginTop: 2,
                            }}
                          >
                            This official's account is currently active in the
                            system.
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="ao-official-card">
                      <div className="ao-official-avatar">
                        {(foundOfficial.first_name?.[0] || "?").toUpperCase()}
                      </div>
                      <div className="ao-official-info">
                        <div className="ao-official-name">
                          {foundOfficial.first_name} {foundOfficial.last_name}
                        </div>
                        <div className="ao-official-position">
                          {foundOfficial.position || "N/A"}
                        </div>
                      </div>
                      <div className="ao-official-code-badge">
                        {foundOfficial.official_code}
                      </div>
                    </div>

                    <div className="ao-details-grid">
                      <div className="ao-detail-item">
                        <div className="ao-detail-label">Email</div>
                        <div className="ao-detail-value">
                          {foundOfficial.email || "N/A"}
                        </div>
                      </div>
                      <div className="ao-detail-item">
                        <div className="ao-detail-label">Contact Number</div>
                        <div className="ao-detail-value">
                          {foundOfficial.contact_number || "N/A"}
                        </div>
                      </div>
                      <div className="ao-detail-item">
                        <div className="ao-detail-label">Term Start</div>
                        <div className="ao-detail-value">
                          {formatLongDate(foundOfficial.term_start)}
                        </div>
                      </div>
                      <div className="ao-detail-item">
                        <div className="ao-detail-label">Term End</div>
                        <div className="ao-detail-value">
                          {formatLongDate(foundOfficial.term_end)}
                        </div>
                      </div>
                      <div className="ao-detail-item">
                        <div className="ao-detail-label">Current Status</div>
                        <div className="ao-detail-value">
                          {foundOfficial.status || "N/A"}
                        </div>
                      </div>
                    </div>

                    {codeError && (
                      <p className="ao-error" style={{ marginTop: 12 }}>
                        {codeError}
                      </p>
                    )}

                    {!isAlreadyActivated && (
                      <div className="ao-warning-box">
                        <ShieldCheck size={16} />
                        <span>
                          This will grant the official access to the
                          BarangayEase system. Make sure all details are correct
                          before proceeding.
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="ao-modal-footer">
                    <button
                      type="button"
                      className="ao-cancel-btn"
                      onClick={() => {
                        setFoundOfficial(null);
                        setActivateModal(true);
                      }}
                      disabled={activating}
                    >
                      Back
                    </button>
                    {!isAlreadyActivated && (
                      <button
                        type="button"
                        className="ao-activate-btn"
                        onClick={handleActivateClick}
                        disabled={activating}
                      >
                        {activating ? (
                          <>
                            <Loader2 size={16} className="ao-spin" />{" "}
                            Activating…
                          </>
                        ) : (
                          <>
                            <ShieldCheck size={16} /> Activate Account
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  // Step 3 — Final activate confirmation
  const finalConfirmModal =
    showFinalConfirm && foundOfficial && typeof document !== "undefined"
      ? createPortal(
          <div
            className="ao-overlay"
            style={{ zIndex: 10200 }}
            onClick={() => setShowFinalConfirm(false)}
          >
            <div
              className="ao-modal"
              style={{ width: "min(460px, 100%)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ao-modal-header">
                <div
                  className="ao-modal-header-icon"
                  style={{
                    background:
                      "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                    boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
                  }}
                >
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h3 className="ao-modal-title">Final Confirmation</h3>
                  <p className="ao-modal-subtitle">
                    This action cannot be undone
                  </p>
                </div>
                <button
                  type="button"
                  className="ao-close-btn"
                  onClick={() => setShowFinalConfirm(false)}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="ao-modal-body">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    padding: "12px 14px",
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background:
                        "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: 16,
                      flexShrink: 0,
                    }}
                  >
                    {(foundOfficial.first_name?.[0] || "?").toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        color: "#0f172a",
                      }}
                    >
                      {foundOfficial.first_name} {foundOfficial.last_name}
                    </div>
                    <div
                      style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}
                    >
                      {foundOfficial.position || "N/A"} ·{" "}
                      {foundOfficial.official_code}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "center", padding: "4px 0 8px" }}>
                  <p
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: "#111827",
                      margin: "0 0 10px",
                    }}
                  >
                    Are you sure you want to activate this account?
                  </p>
                  <p
                    style={{
                      fontSize: 13,
                      color: "#6b7280",
                      margin: 0,
                      lineHeight: 1.6,
                    }}
                  >
                    Activating will grant{" "}
                    <strong style={{ color: "#374151" }}>
                      {foundOfficial.first_name} {foundOfficial.last_name}
                    </strong>{" "}
                    full access to the BarangayEase system.
                  </p>
                </div>
              </div>
              <div className="ao-modal-footer">
                <button
                  type="button"
                  className="ao-cancel-btn"
                  onClick={() => setShowFinalConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="ao-activate-btn"
                  onClick={handleActivateConfirm}
                >
                  <ShieldCheck size={16} /> Yes, Activate
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  // Email Binding Modal — Ask for email to bind to official account
  const emailBindingModal =
    showEmailBinding && foundOfficial && typeof document !== "undefined"
      ? createPortal(
          <div
            className="ao-overlay"
            style={{ zIndex: 10250 }}
            onClick={() => setShowEmailBinding(false)}
          >
            <div
              className="ao-modal"
              style={{ width: "min(480px, 100%)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ao-modal-header">
                <div
                  className="ao-modal-header-icon"
                  style={{
                    background:
                      "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                    boxShadow: "0 4px 12px rgba(59,130,246,0.3)",
                  }}
                >
                  <User size={22} />
                </div>
                <div>
                  <h3 className="ao-modal-title">Bind Email Address</h3>
                  <p className="ao-modal-subtitle">
                    Enter an email to link with this official account
                  </p>
                </div>
                <button
                  type="button"
                  className="ao-close-btn"
                  onClick={() => setShowEmailBinding(false)}
                  disabled={activating}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="ao-modal-body">
                {/* Official info card */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: "#eff6ff",
                    border: "1.5px solid #bfdbfe",
                    borderRadius: 12,
                    padding: "12px 14px",
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background:
                        "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: 16,
                      flexShrink: 0,
                    }}
                  >
                    {(foundOfficial.first_name?.[0] || "?").toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        color: "#0f172a",
                      }}
                    >
                      {foundOfficial.first_name} {foundOfficial.last_name}
                    </div>
                    <div
                      style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}
                    >
                      {foundOfficial.position || "N/A"} ·{" "}
                      {foundOfficial.official_code}
                    </div>
                  </div>
                </div>

                {/* Email input */}
                <label className="ao-label" htmlFor="binding-email-input">
                  Email Address
                </label>
                <input
                  id="binding-email-input"
                  type="email"
                  className="ao-input"
                  placeholder="e.g. official@barangay.gov.ph"
                  value={bindingEmail}
                  onChange={(e) => {
                    setBindingEmail(e.target.value);
                    setEmailError("");
                  }}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleActivateConfirm()
                  }
                  autoFocus
                  disabled={activating}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: emailError
                      ? "1.5px solid #ef4444"
                      : "1.5px solid #d1d5db",
                    borderRadius: 10,
                    fontSize: 14,
                    fontFamily: "inherit",
                    outline: "none",
                    transition: "border-color 0.2s ease",
                  }}
                />

                {emailError && (
                  <p className="ao-error" style={{ marginTop: 8 }}>
                    {emailError}
                  </p>
                )}

                <p className="ao-hint" style={{ marginTop: 12 }}>
                  This email will be used to link the official to the system
                  account
                </p>
              </div>

              <div className="ao-modal-footer">
                <button
                  type="button"
                  className="ao-cancel-btn"
                  onClick={() => setShowEmailBinding(false)}
                  disabled={activating}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="ao-activate-btn"
                  onClick={handleActivateConfirm}
                  disabled={activating}
                >
                  {activating ? (
                    <>
                      <Loader2 size={16} className="ao-spin" /> Activating…
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} /> Activate with Email
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  // ── Manage Officials (Deactivate) Modal ─────────────────────────
  const manageOfficialsModal =
    manageModal && typeof document !== "undefined"
      ? createPortal(
          <div className="ao-overlay" onClick={closeManageModal}>
            <div
              className="ao-modal"
              style={{
                width: "min(720px, 100%)",
                maxHeight: "85vh",
                display: "flex",
                flexDirection: "column",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="ao-modal-header" style={{ flexShrink: 0 }}>
                <div
                  className="ao-modal-header-icon"
                  style={{
                    background:
                      "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                    boxShadow: "0 4px 12px rgba(239,68,68,0.3)",
                  }}
                >
                  <ShieldOff size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 className="ao-modal-title">Manage Activated Officials</h3>
                  <p className="ao-modal-subtitle">
                    View and deactivate active official accounts
                  </p>
                </div>
                <button
                  type="button"
                  className="ao-close-btn"
                  onClick={closeManageModal}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Search bar */}
              <div style={{ padding: "16px 24px 0", flexShrink: 0 }}>
                <div style={{ position: "relative" }}>
                  <Search
                    size={16}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#9ca3af",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Search by name, code, or position…"
                    value={manageSearch}
                    onChange={(e) => setManageSearch(e.target.value)}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "10px 12px 10px 36px",
                      border: "1.5px solid #d1d5db",
                      borderRadius: 10,
                      fontSize: 14,
                      color: "#111827",
                      outline: "none",
                      fontFamily: "inherit",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#10b981";
                      e.target.style.boxShadow =
                        "0 0 0 3px rgba(16,185,129,0.15)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#d1d5db";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>
              </div>

              {/* Body — scrollable list */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
                {manageLoading ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 12,
                      padding: "40px 0",
                    }}
                  >
                    <div
                      className="loading-spinner"
                      style={{ width: 36, height: 36, borderWidth: 3 }}
                    />
                    <span
                      style={{
                        fontSize: 14,
                        color: "#6b7280",
                        fontWeight: 600,
                      }}
                    >
                      Loading officials…
                    </span>
                  </div>
                ) : deactivateSuccess ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 12,
                      padding: "32px 0",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #fee2e2, #fecaca)",
                        color: "#dc2626",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ShieldOff size={32} />
                    </div>
                    <h4
                      style={{
                        margin: 0,
                        fontSize: 18,
                        fontWeight: 800,
                        color: "#0f172a",
                      }}
                    >
                      Account Deactivated
                    </h4>
                    <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
                      <strong>
                        {deactivateTarget?.first_name}{" "}
                        {deactivateTarget?.last_name}
                      </strong>
                      's account has been deactivated successfully.
                    </p>
                    <button
                      type="button"
                      onClick={() => setDeactivateSuccess(false)}
                      style={{
                        marginTop: 8,
                        padding: "10px 24px",
                        background: "#f1f5f9",
                        border: "1.5px solid #d1d5db",
                        borderRadius: 10,
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: "pointer",
                        color: "#374151",
                      }}
                    >
                      Back to List
                    </button>
                  </div>
                ) : filteredActivated.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "48px 0",
                      color: "#9ca3af",
                    }}
                  >
                    <ShieldOff
                      size={40}
                      style={{ marginBottom: 12, opacity: 0.4 }}
                    />
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                      {manageSearch
                        ? "No officials match your search."
                        : "No activated officials found."}
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 4px",
                        fontSize: 12,
                        color: "#9ca3af",
                        fontWeight: 600,
                      }}
                    >
                      {filteredActivated.length} active official
                      {filteredActivated.length !== 1 ? "s" : ""}
                    </p>
                    {filteredActivated.map((official) => (
                      <div
                        key={official.official_id ?? official.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          background: "#f8fafc",
                          border: "1.5px solid #e2e8f0",
                          borderRadius: 14,
                          padding: "14px 16px",
                          transition: "border-color 0.18s ease",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.borderColor = "#fca5a5")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.borderColor = "#e2e8f0")
                        }
                      >
                        {/* Avatar */}
                        <div
                          style={{
                            width: 46,
                            height: 46,
                            borderRadius: 11,
                            background:
                              "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: 18,
                            flexShrink: 0,
                            boxShadow: "0 3px 10px rgba(16,185,129,0.25)",
                          }}
                        >
                          {(official.first_name?.[0] || "?").toUpperCase()}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 14,
                              color: "#0f172a",
                            }}
                          >
                            {official.first_name} {official.last_name}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#6b7280",
                              marginTop: 3,
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            <span>{official.position || "N/A"}</span>
                            <span style={{ color: "#d1d5db" }}>·</span>
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontSize: 11,
                                fontWeight: 700,
                                background: "#d1fae5",
                                color: "#065f46",
                                padding: "2px 7px",
                                borderRadius: 5,
                                border: "1px solid #6ee7b7",
                              }}
                            >
                              {official.official_code}
                            </span>
                          </div>
                          {official.email && (
                            <div
                              style={{
                                fontSize: 12,
                                color: "#9ca3af",
                                marginTop: 2,
                              }}
                            >
                              {official.email}
                            </div>
                          )}
                        </div>

                        {/* Active badge */}
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            background: "#ecfdf5",
                            color: "#065f46",
                            border: "1px solid #6ee7b7",
                            borderRadius: 999,
                            padding: "4px 10px",
                            fontSize: 11,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          <CheckCircle size={11} /> ACTIVE
                        </div>

                        {/* Deactivate button */}
                        <button
                          type="button"
                          onClick={() => handleDeactivateClick(official)}
                          disabled={deactivating}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "8px 14px",
                            background: "#fff1f2",
                            color: "#be123c",
                            border: "1.5px solid #fecdd3",
                            borderRadius: 9,
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: "pointer",
                            flexShrink: 0,
                            transition: "all 0.18s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#ffe4e6";
                            e.currentTarget.style.borderColor = "#fda4af";
                            e.currentTarget.style.transform =
                              "translateY(-1px)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#fff1f2";
                            e.currentTarget.style.borderColor = "#fecdd3";
                            e.currentTarget.style.transform = "translateY(0)";
                          }}
                        >
                          <ShieldOff size={14} /> Deactivate
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="ao-modal-footer" style={{ flexShrink: 0 }}>
                <button
                  type="button"
                  className="ao-cancel-btn"
                  onClick={closeManageModal}
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  // ── Deactivate Confirmation Modal ───────────────────────────────
  const deactivateConfirmModal =
    showDeactivateConfirm && deactivateTarget && typeof document !== "undefined"
      ? createPortal(
          <div
            className="ao-overlay"
            style={{ zIndex: 10300 }}
            onClick={() => setShowDeactivateConfirm(false)}
          >
            <div
              className="ao-modal"
              style={{ width: "min(460px, 100%)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ao-modal-header">
                <div
                  className="ao-modal-header-icon"
                  style={{
                    background:
                      "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                    boxShadow: "0 4px 12px rgba(239,68,68,0.3)",
                  }}
                >
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h3 className="ao-modal-title">Confirm Deactivation</h3>
                  <p className="ao-modal-subtitle">
                    This will revoke system access
                  </p>
                </div>
                <button
                  type="button"
                  className="ao-close-btn"
                  onClick={() => setShowDeactivateConfirm(false)}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="ao-modal-body">
                {/* Official mini card */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: "#fff1f2",
                    border: "1.5px solid #fecdd3",
                    borderRadius: 12,
                    padding: "12px 14px",
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background:
                        "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: 16,
                      flexShrink: 0,
                    }}
                  >
                    {(deactivateTarget.first_name?.[0] || "?").toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        color: "#0f172a",
                      }}
                    >
                      {deactivateTarget.first_name} {deactivateTarget.last_name}
                    </div>
                    <div
                      style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}
                    >
                      {deactivateTarget.position || "N/A"} ·{" "}
                      {deactivateTarget.official_code}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: "center", padding: "4px 0 8px" }}>
                  <p
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: "#111827",
                      margin: "0 0 10px",
                    }}
                  >
                    Deactivate this official account?
                  </p>
                  <p
                    style={{
                      fontSize: 13,
                      color: "#6b7280",
                      margin: 0,
                      lineHeight: 1.6,
                    }}
                  >
                    <strong style={{ color: "#374151" }}>
                      {deactivateTarget.first_name} {deactivateTarget.last_name}
                    </strong>{" "}
                    will lose access to the BarangayEase system. You can
                    reactivate the account at any time.
                  </p>
                </div>

                {/* Warning */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    background: "#fff7ed",
                    border: "1px solid #fed7aa",
                    borderRadius: 10,
                    padding: "12px 14px",
                    marginTop: 16,
                    fontSize: 13,
                    color: "#92400e",
                    fontWeight: 500,
                    lineHeight: 1.5,
                  }}
                >
                  <ShieldOff
                    size={16}
                    style={{ flexShrink: 0, color: "#d97706", marginTop: 1 }}
                  />
                  <span>
                    The official will be immediately logged out and unable to
                    access the system after deactivation.
                  </span>
                </div>
              </div>

              <div className="ao-modal-footer">
                <button
                  type="button"
                  className="ao-cancel-btn"
                  onClick={() => setShowDeactivateConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeactivateConfirm}
                  disabled={deactivating}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 22px",
                    background: deactivating
                      ? "#fca5a5"
                      : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: deactivating ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 14px rgba(239,68,68,0.35)",
                    transition: "all 0.2s ease",
                  }}
                >
                  {deactivating ? (
                    <>
                      <Loader2 size={16} className="ao-spin" /> Deactivating…
                    </>
                  ) : (
                    <>
                      <ShieldOff size={16} /> Yes, Deactivate
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="admin-page users-page">
      <div
        className="page-actions"
        style={{ alignItems: "flex-start", marginBottom: 12 }}
      >
        <div>
          <h3>User Management</h3>
          <p className="muted">Monitor all system users and their activity</p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveUsersSection("officials")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderRadius: 10,
            border:
              activeUsersSection === "officials"
                ? "1.5px solid #10b981"
                : "1.5px solid #d1d5db",
            background:
              activeUsersSection === "officials" ? "#ecfdf5" : "#ffffff",
            color: activeUsersSection === "officials" ? "#065f46" : "#374151",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          <ShieldCheck size={16} />
          Official Users ({officials.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveUsersSection("residents")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderRadius: 10,
            border:
              activeUsersSection === "residents"
                ? "1.5px solid #10b981"
                : "1.5px solid #d1d5db",
            background:
              activeUsersSection === "residents" ? "#ecfdf5" : "#ffffff",
            color: activeUsersSection === "residents" ? "#065f46" : "#374151",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          <Users size={16} />
          Resident Users ({residentUsersCount})
        </button>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: "#fee2e2",
            color: "#dc2626",
            padding: "1rem",
            borderRadius: "8px",
            marginBottom: "1rem",
          }}
        >
          <p>
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <div className="loading-wrap">
            <div className="loading-spinner" aria-hidden="true"></div>
            <div className="loading-text">Loading user data...</div>
          </div>
        </div>
      ) : (
        <div className="users-grid">
          {activeUsersSection === "officials" ? (
            <div>
              {/* Action buttons row — Activate + Manage */}
              <div className="ao-trigger-row" style={{ gap: 10 }}>
                <button
                  type="button"
                  className="ao-trigger-btn"
                  onClick={openActivateModal}
                >
                  <ShieldCheck size={16} />
                  Activate Official
                </button>
              </div>

              <section className="users-card">
                <div className="card-header">
                  <div className="card-header-left">
                    <Users size={20} /> <span>Barangay Officials</span>
                  </div>
                  <div className="card-header-right muted">
                    {officials.length} officials
                  </div>
                </div>

                <div className="table-wrap">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>Official Code</th>
                        <th>Official</th>
                        <th>Role</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Permissions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {officials.length > 0 ? (
                        officials.map((o) => {
                          const b = badgeFor(o.status);
                          return (
                            <tr key={o.id}>
                              <td>{o.officialCode}</td>
                              <td className="td-user">
                                <User size={18} className="td-avatar" />
                                <div>
                                  <div className="u-name">{o.name}</div>
                                </div>
                              </td>
                              <td>{o.role}</td>
                              <td>{o.email}</td>
                              <td>
                                <span className={b.className}>
                                  {b.icon}
                                  <span className="badge-label">
                                    {o.status}
                                  </span>
                                </span>
                              </td>
                              <td>
                                {o.status === "Registered" ? (
                                  <button
                                    type="button"
                                    className="view-details-btn"
                                    onClick={() => openPermissionsModal(o)}
                                  >
                                    <Settings size={16} /> Permissions
                                  </button>
                                ) : (
                                  <span style={{ color: "#94a3b8" }}>—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan="6"
                            style={{ textAlign: "center", color: "#9ca3af" }}
                          >
                            No officials found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          ) : (
            <>
              <section className="users-card">
                <div className="card-header">
                  <div className="card-header-left">
                    <Users size={20} /> <span>Residents</span>
                  </div>
                  <div className="card-header-right muted">
                    {residentUsers.length} residents
                  </div>
                </div>
                <div className="table-wrap">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>Fullname</th>
                        <th>Contact</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>View Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {residentUsers.length > 0 ? (
                        residentUsers.map((residentRow) => (
                          <tr key={residentRow.id}>
                            <td>{residentRow.fullName}</td>
                            <td>{residentRow.contact}</td>
                            <td>{residentRow.email}</td>
                            <td>{residentRow.status}</td>
                            <td>
                              <button
                                type="button"
                                className="view-details-btn"
                                onClick={() =>
                                  handleViewResidentDetails(residentRow)
                                }
                              >
                                <Eye size={16} /> View Details
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan="5"
                            style={{ textAlign: "center", color: "#9ca3af" }}
                          >
                            No residents found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      )}

      {residentModal}
      {permissionsModalPortal}
      {codeInputModal}
      {confirmModal}
      {emailBindingModal}
      {finalConfirmModal}
      {manageOfficialsModal}
      {deactivateConfirmModal}
    </div>
  );
}
