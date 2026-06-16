import {
  ALWAYS_OPEN_POLI_IDS,
  GLOBAL_CLOSED_DATES,
  HOLIDAY_DATES,
  RAMADAN_DEFAULT,
  RAMADAN_MODE,
  formatDateKey,
} from "../config/scheduleOverride";

export const DAY_NAMES_ID = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

const RULE_DEFAULT_NORMAL = {
  Senin: "08:00-16:00",
  Selasa: "08:00-16:00",
  Rabu: "08:00-16:00",
  Kamis: "08:00-16:00",
  Jumat: "08:00-16:30",
  Sabtu: "Tutup",
  Minggu: "Tutup",
};

const RULE_DEFAULT = RAMADAN_MODE ? RAMADAN_DEFAULT : RULE_DEFAULT_NORMAL;
const WEEKDAY_NAMES = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];
const CLOSED_STATUS = {
  open: false,
  rest: false,
  soon: null,
  minutesUntilChange: null,
};

const toMin = (value) => {
  const [hours, minutes] = String(value)
    .trim()
    .split(":")
    .map((item) => parseInt(item, 10) || 0);
  return hours * 60 + minutes;
};

const pad2 = (value) => (value < 10 ? `0${value}` : `${value}`);
const fmtMin = (value) => `${pad2(Math.floor(value / 60))}:${pad2(value % 60)}`;
const dayNameID = (date) => DAY_NAMES_ID[date.getDay()];
const DASH_RE = /\u2013|\u2014|\u00e2\u20ac\u201c|\u00e2\u20ac\u201d/g;

export function holidayNameForDate(ref = new Date()) {
  return HOLIDAY_DATES[formatDateKey(ref)] ?? null;
}

function isGlobalHolidayWeekday(ref = new Date()) {
  const dayName = dayNameID(ref);
  const key = formatDateKey(ref);
  return WEEKDAY_NAMES.includes(dayName) && GLOBAL_CLOSED_DATES.has(key);
}

function shouldApplyGlobalHolidayClosure(poliId, ref = new Date()) {
  return isGlobalHolidayWeekday(ref) && !ALWAYS_OPEN_POLI_IDS.has(poliId);
}

function shouldForceOpenOnHoliday(poliId, ref = new Date()) {
  return isGlobalHolidayWeekday(ref) && ALWAYS_OPEN_POLI_IDS.has(poliId);
}

function holidayClosedStatus(ref = new Date()) {
  return {
    ...CLOSED_STATUS,
    holiday: true,
    holidayName: holidayNameForDate(ref),
  };
}

function holidayOpenStatus(ref = new Date()) {
  return {
    open: true,
    rest: false,
    soon: null,
    minutesUntilChange: null,
    holidayOpen: true,
    holidayName: holidayNameForDate(ref),
  };
}

function normalizeRanges(value) {
  if (value == null) return [];

  const text = String(value).trim().replace(DASH_RE, "-");
  if (!text || /tutup/i.test(text)) return [];

  const parts = Array.isArray(value) ? value : text.split(",").map((item) => item.trim());
  return parts
    .map((range) => {
      const [from, to] = String(range)
        .replace(DASH_RE, "-")
        .split("-")
        .map((item) => item.trim());

      if (!from || !to) return null;
      return { from: toMin(from), to: toMin(to) };
    })
    .filter(Boolean);
}

function normalizeSchedule(scheduleLike) {
  if (!scheduleLike || typeof scheduleLike !== "object" || Array.isArray(scheduleLike)) {
    return { tz: "Asia/Jakarta", weekly: { ...RULE_DEFAULT }, exceptions: {}, breaks: {} };
  }

  if (scheduleLike.weekly || scheduleLike.exceptions || scheduleLike.breaks) {
    return {
      tz: scheduleLike.tz || "Asia/Jakarta",
      weekly: { ...RULE_DEFAULT, ...(scheduleLike.weekly || {}) },
      exceptions: { ...(scheduleLike.exceptions || {}) },
      breaks: normalizeBreakSchedule(scheduleLike.breaks),
    };
  }

  return {
    tz: "Asia/Jakarta",
    weekly: { ...RULE_DEFAULT, ...scheduleLike },
    exceptions: {},
    breaks: {},
  };
}

function normalizeBreakSchedule(breaksLike) {
  if (!breaksLike || typeof breaksLike !== "object" || Array.isArray(breaksLike)) {
    return { weekly: {}, exceptions: {} };
  }

  if (breaksLike.weekly || breaksLike.exceptions) {
    return {
      weekly: { ...(breaksLike.weekly || {}) },
      exceptions: { ...(breaksLike.exceptions || {}) },
    };
  }

  return { weekly: { ...breaksLike }, exceptions: {} };
}

function rangesForDate(schedule, date) {
  const { weekly, exceptions } = normalizeSchedule(schedule);
  const key = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

  if (exceptions[key] != null) return normalizeRanges(exceptions[key]);
  return normalizeRanges(weekly[dayNameID(date)]);
}

function breakRangesForDate(schedule, date) {
  const { breaks } = normalizeSchedule(schedule);
  const key = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

  if (breaks?.exceptions?.[key] != null) return normalizeRanges(breaks.exceptions[key]);
  return normalizeRanges(breaks?.weekly?.[dayNameID(date)]);
}

function rangesForToday(schedule, ref = new Date()) {
  const today = new Date(ref);
  const yesterday = new Date(ref);
  yesterday.setDate(ref.getDate() - 1);

  const out = [];
  rangesForDate(schedule, yesterday).forEach(({ from, to }) => {
    if (to < from) out.push({ from: 0, to });
  });

  rangesForDate(schedule, today).forEach(({ from, to }) => {
    out.push(to >= from ? { from, to } : { from, to: 1440 });
  });

  return out;
}

function breakRangesForToday(schedule, ref = new Date()) {
  const today = new Date(ref);
  const yesterday = new Date(ref);
  yesterday.setDate(ref.getDate() - 1);

  const out = [];
  breakRangesForDate(schedule, yesterday).forEach(({ from, to }) => {
    if (to < from) out.push({ from: 0, to });
  });

  breakRangesForDate(schedule, today).forEach(({ from, to }) => {
    out.push(to >= from ? { from, to } : { from, to: 1440 });
  });

  return out;
}

function fullDayFromRanges(sortedRanges) {
  if (!sortedRanges.length) return false;

  let currentFrom = Math.max(0, sortedRanges[0].from);
  let currentTo = Math.min(1440, sortedRanges[0].to);

  for (let index = 1; index < sortedRanges.length; index += 1) {
    const range = sortedRanges[index];
    if (range.from > currentTo) break;
    currentTo = Math.max(currentTo, range.to);
  }

  return currentFrom <= 0 && currentTo >= 1440;
}

function getRestWindow(ref) {
  const dayName = DAY_NAMES_ID[ref.getDay()];
  if (!WEEKDAY_NAMES.includes(dayName)) return null;

  return {
    start: dayName === "Jumat" ? 690 : 720,
    end: 780,
  };
}

function scanRanges(ranges, ref, nextDayRanges = [], restRanges = []) {
  const now = ref.getHours() * 60 + ref.getMinutes();
  const sorted = [...ranges].sort((a, b) => a.from - b.from);
  let open = false;
  let nextChange = null;

  for (const range of sorted) {
    if (now >= range.from && now <= range.to) {
      open = true;
      if (nextChange == null || range.to < nextChange) nextChange = range.to;
    } else if (now < range.from && (nextChange == null || range.from < nextChange)) {
      nextChange = range.from;
    }
  }

  if (nextChange == null && nextDayRanges.length) {
    const nextOpen = [...nextDayRanges].sort((a, b) => a.from - b.from)[0];
    nextChange = nextOpen.from + 1440;
  }

  const isFullDay = fullDayFromRanges(sorted);
  const defaultRestWindow = getRestWindow(ref);
  const restWindows = [
    ...(defaultRestWindow ? [defaultRestWindow] : []),
    ...restRanges.map(({ from, to }) => ({ start: from, end: to })),
  ];
  const activeRestWindow = restWindows.find(
    (window) => now >= window.start && now < window.end
  );
  const rest = !isFullDay && Boolean(activeRestWindow);

  if (rest) {
    open = false;
    if (nextChange == null || activeRestWindow.end < nextChange) {
      nextChange = activeRestWindow.end;
    }
  }

  const minutesUntilChange = nextChange != null ? nextChange - now : null;
  let soon = null;

  if (!isFullDay && !rest && minutesUntilChange != null && minutesUntilChange >= 0) {
    if (!open && minutesUntilChange <= 30) soon = "segera-buka";
    if (open && minutesUntilChange <= 30) soon = "segera-tutup";
  }

  if (isFullDay) {
    return { open: true, rest: false, soon: null, minutesUntilChange: null };
  }

  return { open, rest: Boolean(rest), soon, minutesUntilChange };
}

export function getOpenStatus(service, ref = new Date(), options = {}) {
  if (shouldApplyGlobalHolidayClosure(options.poliId, ref)) {
    return holidayClosedStatus(ref);
  }
  if (shouldForceOpenOnHoliday(options.poliId, ref)) {
    return holidayOpenStatus(ref);
  }

  const schedule = service?.jadwal || {};
  const tomorrow = new Date(ref);
  tomorrow.setDate(ref.getDate() + 1);

  return scanRanges(
    rangesForToday(schedule, ref),
    ref,
    rangesForToday(schedule, tomorrow),
    breakRangesForToday(schedule, ref)
  );
}

export function getEffectiveJadwal(service) {
  const schedule = service?.jadwal || {};
  const { weekly, breaks } = normalizeSchedule(schedule);
  return DAY_NAMES_ID.reduce((output, dayName) => {
    const ranges = normalizeRanges(weekly[dayName]);
    const dayBreaks = normalizeRanges(breaks?.weekly?.[dayName]);
    const scheduleText = ranges.length
      ? ranges.map((range) => `${fmtMin(range.from)}-${fmtMin(range.to)}`).join(", ")
      : "Tutup";
    const breakText = dayBreaks.length
      ? ` (Istirahat ${dayBreaks.map((range) => `${fmtMin(range.from)}-${fmtMin(range.to)}`).join(", ")})`
      : "";

    output[dayName] = ranges.length ? `${scheduleText}${breakText}` : scheduleText;
    return output;
  }, {});
}

export function getOpenStatusForPoli(poli, ref = new Date()) {
  if (shouldApplyGlobalHolidayClosure(poli?.id, ref)) {
    return holidayClosedStatus(ref);
  }
  if (shouldForceOpenOnHoliday(poli?.id, ref)) {
    return holidayOpenStatus(ref);
  }

  const schedules = [];
  if (poli?.jadwal) schedules.push(poli.jadwal);
  (poli?.layanan || []).forEach((service) => {
    if (service?.jadwal) schedules.push(service.jadwal);
  });

  if (schedules.length === 0) return getOpenStatus({ jadwal: {} }, ref);

  const ranges = schedules.flatMap((schedule) => rangesForToday(schedule, ref));
  if (ranges.length === 0) return getOpenStatus({ jadwal: {} }, ref);

  const tomorrow = new Date(ref);
  tomorrow.setDate(ref.getDate() + 1);
  const nextDayRanges = schedules.flatMap((schedule) => rangesForToday(schedule, tomorrow));
  const restRanges = schedules.flatMap((schedule) => breakRangesForToday(schedule, ref));

  return scanRanges(ranges, ref, nextDayRanges, restRanges);
}

export function schedulesForPoli(poli) {
  const list = [];
  if (poli?.jadwal) list.push({ label: "Poli", jadwal: poli.jadwal });

  (poli?.layanan || []).forEach((service) => {
    if (service.jadwal) list.push({ label: service.nama, jadwal: service.jadwal });
  });

  return list;
}

export function weeklyKey(schedule) {
  const { weekly, breaks } = normalizeSchedule(schedule);
  return JSON.stringify(
    DAY_NAMES_ID.reduce((output, dayName) => {
      output[dayName] = normalizeRanges(weekly[dayName]).map((range) => [range.from, range.to]);
      output[`${dayName}:breaks`] = normalizeRanges(breaks?.weekly?.[dayName]).map((range) => [
        range.from,
        range.to,
      ]);
      return output;
    }, {})
  );
}

export function todayText(scheduleLike, options = {}) {
  const ref = options.ref || new Date();
  if (shouldApplyGlobalHolidayClosure(options.poliId, ref)) {
    const holidayName = holidayNameForDate(ref);
    return holidayName ? `Tutup (${holidayName})` : "Tutup";
  }
  if (shouldForceOpenOnHoliday(options.poliId, ref)) {
    return "00:00-24:00";
  }

  const today = DAY_NAMES_ID[ref.getDay()];
  return getEffectiveJadwal({ jadwal: scheduleLike })[today];
}
