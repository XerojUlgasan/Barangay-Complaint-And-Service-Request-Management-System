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
} from "lucide-react";
import {
  getAllOfficials,
  getRegisteredResidents,
  getUnregisteredResidents,
} from "../../supabse_db/superadmin/superadmin";
import "../../styles/BarangayAdmin.css";

export default function AdminUsers() {
  const [officials, setOfficials] = useState([]);
  const [registeredResidents, setRegisteredResidents] = useState([]);
  const [unregisteredResidents, setUnregisteredResidents] = useState([]);
  const [selectedResident, setSelectedResident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch officials and residents on component mount
  useEffect(() => {
    fetchUsersData();
  }, []);

  useEffect(() => {
    if (!selectedResident) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelectedResident(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedResident]);

  const fetchUsersData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        officialsResult,
        registeredResidentsResult,
        unregisteredResidentsResult,
      ] = await Promise.all([
        getAllOfficials(),
        getRegisteredResidents(),
        getUnregisteredResidents(),
      ]);

      if (officialsResult.success && Array.isArray(officialsResult.data)) {
        const formattedOfficials = officialsResult.data.map((official) => ({
          id: official.id,
          name: official.full_name || "Unknown",
          status: "Available", // Default status (can be updated based on business logic)
          email: official.email || "N/A",
          role: official.role || "Official",
        }));
        setOfficials(formattedOfficials);
      } else {
        console.error("Failed to fetch officials:", officialsResult.message);
      }

      if (
        registeredResidentsResult.success &&
        Array.isArray(registeredResidentsResult.data)
      ) {
        const formattedRegisteredResidents = registeredResidentsResult.data.map(
          (resident) => ({
            id: resident.id,
            fullName: resident.full_name || "Unknown",
            email: resident.registered_email || resident.email || "N/A",
            isActivated: resident.is_activated,
            registeredCreatedAt: resident.registered_created_at,
            resident,
          }),
        );
        setRegisteredResidents(formattedRegisteredResidents);
      } else {
        console.error(
          "Failed to fetch registered residents:",
          registeredResidentsResult.message,
        );
      }

      if (
        unregisteredResidentsResult.success &&
        Array.isArray(unregisteredResidentsResult.data)
      ) {
        const formattedUnregisteredResidents =
          unregisteredResidentsResult.data.map((resident) => ({
            id: resident.id,
            fullName: resident.full_name || "Unknown",
            email: resident.email || "N/A",
            phoneNumber: resident.contact_number || "N/A",
            createdAt: resident.created_at,
            resident,
          }));
        setUnregisteredResidents(formattedUnregisteredResidents);
      } else {
        console.error(
          "Failed to fetch unregistered residents:",
          unregisteredResidentsResult.message,
        );
      }

      setLoading(false);
    } catch (err) {
      console.error("Error fetching users data:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  const badgeFor = (status) => {
    if (status === "Available")
      return {
        className: "status-badge available",
        icon: <CheckCircle size={14} />,
      };
    if (status === "Busy")
      return { className: "status-badge busy", icon: <Clock size={14} /> };
    return { className: "status-badge offline", icon: <XCircle size={14} /> };
  };

  const activationBadgeFor = (isActivated) => {
    if (isActivated === true) {
      return {
        className: "status-badge available",
        icon: <CheckCircle size={14} />,
        label: "Activated",
      };
    }

    if (isActivated === false) {
      return {
        className: "status-badge offline",
        icon: <XCircle size={14} />,
        label: "Not Activated",
      };
    }

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

  const formatResidentAddress = (resident) => {
    return resident?.address_line || "N/A";
  };

  const detailValue = (value) => {
    if (value === null || value === undefined || value === "") {
      return "N/A";
    }

    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }

    return value;
  };

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

  const residentModal =
    selectedResident && typeof document !== "undefined"
      ? createPortal(
          <div
            className="resident-modal-overlay"
            onClick={() => setSelectedResident(null)}
          >
            <div
              className="resident-modal-shell"
              onClick={(event) => event.stopPropagation()}
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
                    <th>Official</th>
                    <th>Role</th>
                    <th>Email</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {officials.length > 0 ? (
                    officials.map((o) => {
                      const b = badgeFor(o.status);
                      return (
                        <tr key={o.id}>
                          <td className="td-user">
                            <User size={18} className="td-avatar" />{" "}
                            <div>
                              <div className="u-name">{o.name}</div>
                            </div>
                          </td>
                          <td>{o.role}</td>
                          <td>{o.email}</td>
                          <td>
                            <span className={b.className}>
                              {b.icon}
                              <span className="badge-label">{o.status}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan="4"
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

          <section className="users-card">
            <div className="card-header">
              <div className="card-header-left">
                <Users size={20} /> <span>Registered Residents</span>
              </div>
              <div className="card-header-right muted">
                {registeredResidents.length} residents
              </div>
            </div>

            <div className="table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Activated</th>
                    <th>Activated At</th>
                    <th>View Details</th>
                  </tr>
                </thead>
                <tbody>
                  {registeredResidents.length > 0 ? (
                    registeredResidents.map((residentRow) => {
                      const activation = activationBadgeFor(
                        residentRow.isActivated,
                      );

                      return (
                        <tr key={residentRow.id}>
                          <td>{residentRow.fullName}</td>
                          <td>{residentRow.email}</td>
                          <td>
                            <span className={activation.className}>
                              {activation.icon}
                              <span className="badge-label">
                                {activation.label}
                              </span>
                            </span>
                          </td>
                          <td className="muted">
                            {formatLongDate(residentRow.registeredCreatedAt)}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="view-details-btn"
                              onClick={() =>
                                setSelectedResident(residentRow.resident)
                              }
                            >
                              <Eye size={16} /> View Details
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan="5"
                        style={{ textAlign: "center", color: "#9ca3af" }}
                      >
                        No registered residents found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="users-card">
            <div className="card-header">
              <div className="card-header-left">
                <Users size={20} /> <span>Unregistered Residents</span>
              </div>
              <div className="card-header-right muted">
                {unregisteredResidents.length} residents
              </div>
            </div>

            <div className="table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Phone Number</th>
                    <th>Created At</th>
                    <th>View Details</th>
                  </tr>
                </thead>
                <tbody>
                  {unregisteredResidents.length > 0 ? (
                    unregisteredResidents.map((residentRow) => (
                      <tr key={residentRow.id}>
                        <td>{residentRow.fullName}</td>
                        <td>{residentRow.email}</td>
                        <td>{residentRow.phoneNumber}</td>
                        <td className="muted">
                          {formatLongDate(residentRow.createdAt)}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="view-details-btn"
                            onClick={() =>
                              setSelectedResident(residentRow.resident)
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
                        No unregistered residents found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
      {residentModal}
    </div>
  );
}
