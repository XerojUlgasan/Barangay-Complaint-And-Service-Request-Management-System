const PH_TIMEZONE = "Asia/Manila";
const PH_OFFSET_HOURS = 8;
const TIMESTAMP_HAS_ZONE_REGEX = /(z|[+-]\d{2}:\d{2})$/i;
const DATETIME_LOCAL_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(\.\d{1,6})?)?$/;
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const pad2 = (value) => String(value).padStart(2, "0");

const normalizeDateString = (value) => String(value || "").trim();
const PH_DATE_KEY_FORMAT_OPTIONS = {
  timeZone: PH_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
};

export const parseDbTimestamp = (value, { assumeUtcForNaive = true } = {}) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = normalizeDateString(value);
  if (!raw) return null;

  const withT = raw.replace(" ", "T");

  if (TIMESTAMP_HAS_ZONE_REGEX.test(withT)) {
    const zonedDate = new Date(withT);
    return Number.isNaN(zonedDate.getTime()) ? null : zonedDate;
  }

  if (DATE_ONLY_REGEX.test(withT)) {
    const dateOnly = new Date(
      `${withT}T00:00:00${assumeUtcForNaive ? "Z" : ""}`,
    );
    return Number.isNaN(dateOnly.getTime()) ? null : dateOnly;
  }

  if (DATETIME_LOCAL_REGEX.test(withT)) {
    const naiveDate = new Date(`${withT}${assumeUtcForNaive ? "Z" : ""}`);
    return Number.isNaN(naiveDate.getTime()) ? null : naiveDate;
  }

  const fallbackDate = new Date(withT);
  return Number.isNaN(fallbackDate.getTime()) ? null : fallbackDate;
};

export const formatPhilippineDate = (value, options = {}, fallback = "N/A") => {
  const parsed = parseDbTimestamp(value);
  if (!parsed) return fallback;

  return parsed.toLocaleString("en-US", {
    timeZone: PH_TIMEZONE,
    ...options,
  });
};

export const formatPhilippineDateOnly = (value, fallback = "N/A") =>
  formatPhilippineDate(
    value,
    {
      month: "long",
      day: "numeric",
      year: "numeric",
    },
    fallback,
  );

export const formatPhilippineDateTime = (value, fallback = "N/A") =>
  formatPhilippineDate(
    value,
    {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    },
    fallback,
  );

export const formatPhilippineShortDateTime = (value, fallback = "—") =>
  formatPhilippineDate(
    value,
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    },
    fallback,
  );

export const getPhilippineDateKey = (value) => {
  const parsed = parseDbTimestamp(value);
  if (!parsed) return "";

  return parsed.toLocaleDateString("en-CA", PH_DATE_KEY_FORMAT_OPTIONS);
};

export const isSamePhilippineCalendarDay = (leftValue, rightValue) =>
  Boolean(getPhilippineDateKey(leftValue)) &&
  getPhilippineDateKey(leftValue) === getPhilippineDateKey(rightValue);

export const toPhilippineDateTimeLocalValue = (value) => {
  const parsed = parseDbTimestamp(value);
  if (!parsed) return "";

  // Shift UTC clock to Philippines clock, then format via UTC getters.
  const phClock = new Date(parsed.getTime() + PH_OFFSET_HOURS * 60 * 60 * 1000);

  return `${phClock.getUTCFullYear()}-${pad2(phClock.getUTCMonth() + 1)}-${pad2(phClock.getUTCDate())}T${pad2(phClock.getUTCHours())}:${pad2(phClock.getUTCMinutes())}`;
};

export const philippineDateTimeLocalToUtcIso = (value) => {
  const raw = normalizeDateString(value);
  if (!raw) return null;

  const withT = raw.replace(" ", "T");

  if (TIMESTAMP_HAS_ZONE_REGEX.test(withT)) {
    const zonedDate = new Date(withT);
    return Number.isNaN(zonedDate.getTime()) ? null : zonedDate.toISOString();
  }

  const match = withT.match(DATETIME_LOCAL_REGEX);
  if (!match) return null;

  const [, year, month, day, hour, minute, second = "00"] = match;
  const utcMs = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour) - PH_OFFSET_HOURS,
    Number(minute),
    Number(second),
  );

  return new Date(utcMs).toISOString();
};

export const PHILIPPINE_TIMEZONE = PH_TIMEZONE;
