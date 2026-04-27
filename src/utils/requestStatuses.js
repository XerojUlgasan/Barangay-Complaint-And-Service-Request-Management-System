export const ACTIVE_REQUEST_STATUSES = [
  "pending",
  "for compliance",
  "approved",
  "processing",
  "ready for pickup",
  "completed",
  "rejected",
];

export const DEPRECATED_REQUEST_STATUSES = [
  "in_progress",
  "for_compliance",
  "for_validation",
  "resident_complied",
  "non_compliant",
];

export const REQUEST_STATUS_LABELS = {
  pending: "Pending",
  "for compliance": "For Compliance",
  approved: "Approved",
  processing: "Processing",
  "ready for pickup": "Ready for Pickup",
  completed: "Completed",
  rejected: "Rejected",
  in_progress: "In Progress",
  for_compliance: "For Compliance",
  for_validation: "For Validation",
  resident_complied: "Resident Complied",
  non_compliant: "Non Compliant",
};

export const REQUEST_STATUS_COLORS = {
  pending: "#F59E0B",
  "for compliance": "#8B5CF6",
  approved: "#2563EB",
  processing: "#0EA5E9",
  "ready for pickup": "#14B8A6",
  completed: "#10B981",
  rejected: "#EF4444",
};

export const REQUEST_STATUS_TEXT_COLORS = {
  pending: "#92400E",
  "for compliance": "#4C1D95",
  approved: "#1E3A8A",
  processing: "#0C4A6E",
  "ready for pickup": "#134E4A",
  completed: "#065F46",
  rejected: "#7F1D1D",
};

export const DEPRECATED_REQUEST_STATUS_COLOR = "#6B7280";

export const REQUEST_STATUS_OPTIONS = ACTIVE_REQUEST_STATUSES.map((status) => ({
  value: status,
  label: REQUEST_STATUS_LABELS[status],
}));

export const REQUEST_STATUS_VALUE_TO_CODE = {
  pending: "PENDING",
  "for compliance": "FOR_COMPLIANCE",
  approved: "APPROVED",
  processing: "PROCESSING",
  "ready for pickup": "READY_FOR_PICKUP",
  completed: "COMPLETED",
  rejected: "REJECTED",
};

export const REQUEST_STATUS_CODE_TO_VALUE = {
  PENDING: "pending",
  FOR_COMPLIANCE: "for compliance",
  APPROVED: "approved",
  PROCESSING: "processing",
  READY_FOR_PICKUP: "ready for pickup",
  COMPLETED: "completed",
  REJECTED: "rejected",
};

export const REQUEST_FINISHED_STATUSES = new Set(["completed", "rejected"]);

export const normalizeRequestStatus = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export const normalizeStatusForCssClass = (value) =>
  normalizeRequestStatus(value).replace(/[\s_-]/g, "");

export const isActiveRequestStatus = (value) =>
  ACTIVE_REQUEST_STATUSES.includes(normalizeRequestStatus(value));

export const isDeprecatedRequestStatus = (value) =>
  DEPRECATED_REQUEST_STATUSES.includes(normalizeRequestStatus(value));

export const isForComplianceStage = (value) => {
  const normalized = normalizeRequestStatus(value);
  return normalized === "for compliance" || normalized === "for_compliance";
};

export const formatRequestStatus = (value) => {
  const normalized = normalizeRequestStatus(value);
  if (REQUEST_STATUS_LABELS[normalized])
    return REQUEST_STATUS_LABELS[normalized];

  const raw = String(value || "")
    .trim()
    .replace(/_/g, " ");
  return raw ? raw.replace(/\b\w/g, (char) => char.toUpperCase()) : "";
};

export const getRequestStatusColor = (value) => {
  const normalized = normalizeRequestStatus(value);
  return REQUEST_STATUS_COLORS[normalized] || DEPRECATED_REQUEST_STATUS_COLOR;
};

export const getRequestStatusTextColor = (value) => {
  const normalized = normalizeRequestStatus(value);
  return REQUEST_STATUS_TEXT_COLORS[normalized] || "#374151";
};

export const requestStatusCodeToValue = (code) => {
  const normalizedCode = String(code || "")
    .trim()
    .toUpperCase();

  return (
    REQUEST_STATUS_CODE_TO_VALUE[normalizedCode] || normalizedCode.toLowerCase()
  );
};

export const requestStatusValueToCode = (value) => {
  const normalizedValue = normalizeRequestStatus(value);
  return (
    REQUEST_STATUS_VALUE_TO_CODE[normalizedValue] ||
    normalizedValue.toUpperCase().replace(/\s+/g, "_")
  );
};
