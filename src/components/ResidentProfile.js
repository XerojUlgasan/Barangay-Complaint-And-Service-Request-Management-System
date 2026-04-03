import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import supabase from "../supabse_db/supabase_client";

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "Not provided";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
};

const formatDate = (value) => {
  if (!value) {
    return "Not provided";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) {
    return "Not provided";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const buildInitials = (resident) => {
  const firstInitial = resident?.first_name?.trim()?.[0] || "";
  const lastInitial = resident?.last_name?.trim()?.[0] || "";
  const initials = `${firstInitial}${lastInitial}`.trim();

  return initials || "R";
};

const ResidentProfile = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resident, setResident] = useState(null);

  const fullName = useMemo(() => {
    if (!resident) {
      return "Resident Profile";
    }

    return [
      resident.first_name,
      resident.middle_name,
      resident.last_name,
      resident.suffix,
    ]
      .filter(Boolean)
      .join(" ");
  }, [resident]);

  const fieldSections = useMemo(() => {
    if (!resident) {
      return [];
    }

    return [
      {
        title: "Identity",
        fields: [
          ["Resident No.", resident.resident_no],
          ["Profile ID", resident.profile_id],
          ["Household ID", resident.household_id],
          ["Purok ID", resident.purok_id],
          ["First Name", resident.first_name],
          ["Middle Name", resident.middle_name],
          ["Last Name", resident.last_name],
          ["Suffix", resident.suffix],
          ["Date of Birth", formatDate(resident.date_of_birth)],
          ["Age", resident.age],
          ["Place of Birth", resident.place_of_birth],
          ["Sex", resident.sex],
          ["Civil Status", resident.civil_status],
          ["Nationality", resident.nationality],
          ["Religion", resident.religion],
          ["Occupation", resident.occupation],
        ],
      },
      {
        title: "Contact and Residence",
        fields: [
          ["Contact Number", resident.contact_number],
          ["Email", resident.email],
          ["Address", resident.address_line],
          ["Years of Stay", resident.years_of_stay],
          ["Voter Status", resident.voter_status],
        ],
      },
      {
        title: "Government and Health IDs",
        fields: [
          ["PhilHealth No.", resident.philhealth_no],
          ["SSS No.", resident.sss_no],
          ["TIN No.", resident.tin_no],
          ["Blood Type", resident.blood_type],
          ["Age Group", resident.age_group],
          ["ID Number", resident.id_number],
          ["Valid ID Type", resident.valid_id_type],
          ["Valid ID URL", resident.valid_id_url],
          ["Photo URL", resident.photo_url],
        ],
      },
      {
        title: "System Info",
        fields: [
          ["Status", resident.status],
          ["Created At", formatDateTime(resident.created_at)],
          ["Updated At", formatDateTime(resident.updated_at)],
          ["Created By", resident.created_by],
        ],
      },
    ];
  }, [resident]);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data: userData, error: authError } =
        await supabase.auth.getUser();
      if (authError || !userData?.user?.id) {
        setResident(null);
        setError("Unable to identify the current resident.");
        return;
      }

      const { data, error: residentError } = await supabase
        .schema("barangaylink")
        .from("residents")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (residentError) {
        setResident(null);
        setError(residentError.message || "Unable to load resident profile.");
        return;
      }

      if (!data) {
        setResident(null);
        setError("Resident profile not found.");
        return;
      }

      setResident(data);
    } catch (err) {
      console.error("Error loading resident profile:", err);
      setResident(null);
      setError("Failed to load resident profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  const openProfile = useCallback(() => {
    setResident(null);
    setError("");
    setLoading(true);
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    loadProfile();
  }, [open, loadProfile]);

  const closeProfile = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        className="settings-button profile-button"
        title="Profile"
        onClick={openProfile}
        aria-label="Open resident profile"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </button>

      {open &&
        createPortal(
          <div className="profile-modal-overlay" onClick={closeProfile}>
            <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
              <div className="profile-modal-header">
                <div className="profile-modal-title-block">
                  <p className="profile-modal-kicker">Resident Profile</p>
                  <h3>{fullName}</h3>
                  <p className="profile-modal-subtitle">
                    View the complete resident record from
                    barangaylink.residents.
                  </p>
                </div>

                <button
                  type="button"
                  className="settings-close-btn"
                  aria-label="Close profile"
                  onClick={closeProfile}
                >
                  ×
                </button>
              </div>

              <div className="profile-modal-body">
                {loading || (!resident && !error) ? (
                  <p className="profile-modal-note">
                    Loading resident profile...
                  </p>
                ) : error ? (
                  <p className="profile-modal-error">{error}</p>
                ) : (
                  <>
                    <section className="profile-summary">
                      <div className="profile-avatar">
                        {resident?.photo_url ? (
                          <img src={resident.photo_url} alt={fullName} />
                        ) : (
                          <span>{buildInitials(resident)}</span>
                        )}
                      </div>

                      <div className="profile-summary-copy">
                        <div className="profile-summary-meta">
                          <span>
                            Resident No. {formatValue(resident.resident_no)}
                          </span>
                          <span>Status: {formatValue(resident.status)}</span>
                          <span>Age: {formatValue(resident.age)}</span>
                          <span>
                            Age Group: {formatValue(resident.age_group)}
                          </span>
                        </div>
                      </div>
                    </section>

                    <div className="profile-sections">
                      {fieldSections.map((section) => (
                        <section
                          className="profile-section"
                          key={section.title}
                        >
                          <h4>{section.title}</h4>
                          <div className="profile-fields-grid">
                            {section.fields.map(([label, value]) => {
                              const isLinkField =
                                label === "Photo URL" ||
                                label === "Valid ID URL";

                              return (
                                <div className="profile-field" key={label}>
                                  <span className="profile-field-label">
                                    {label}
                                  </span>
                                  {isLinkField && value ? (
                                    <a
                                      href={value}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="profile-field-value profile-link"
                                    >
                                      Open file
                                    </a>
                                  ) : (
                                    <span className="profile-field-value">
                                      {formatValue(value)}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </section>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default ResidentProfile;
