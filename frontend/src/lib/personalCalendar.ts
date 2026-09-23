/** Build device-calendar exports (ICS / Google) from confirmed assignments. No API key. */
export type CalendarMission = {
  id: string;
  mission_id: string;
  title: string;
  start_at: string;
  end_at: string;
  address?: string | null;
  establishment_name?: string | null;
  organization_name?: string | null;
  timezone?: string | null;
  status?: string;
};

function icsEscape(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function foldIcsLine(line: string) {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let part = "", bytes = 0;
  for (const character of line) {
    const size = encoder.encode(character).length;
    if (bytes + size > 75) {
      parts.push(part);
      part = " ";
      bytes = 1;
    }
    part += character;
    bytes += size;
  }
  parts.push(part);
  return parts.join("\r\n");
}

/** UTC stamp for ICS / Google: 20260922T080000Z */
export function calendarUtcStamp(value: string) {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  return new Date(time).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function upcomingConfirmedMissions(missions: CalendarMission[], now = Date.now()) {
  return missions
    .filter(
      (m) =>
        (!m.status || m.status === "ACTIVE") &&
        Number.isFinite(Date.parse(m.start_at)) &&
        Number.isFinite(Date.parse(m.end_at)) &&
        Date.parse(m.end_at) > now &&
        Date.parse(m.end_at) > Date.parse(m.start_at),
    )
    .sort((a, b) => Date.parse(a.start_at) - Date.parse(b.start_at));
}

export function missionLocation(m: CalendarMission) {
  return [m.establishment_name || m.organization_name, m.address]
    .filter((part) => typeof part === "string" && part.trim())
    .join(" — ");
}

export function missionCalendarDescription(m: CalendarMission, origin = "https://infimatch.fr") {
  const lines = [
    "Mission confirmée InfiMatch",
    m.establishment_name || m.organization_name || "",
    m.address || "",
    `Fiche mission : ${origin.replace(/\/$/, "")}/missions/m_${m.mission_id}`,
  ].filter(Boolean);
  return lines.join("\n");
}

export function googleCalendarUrl(m: CalendarMission, origin = typeof location !== "undefined" ? location.origin : "https://infimatch.fr") {
  const start = calendarUtcStamp(m.start_at);
  const end = calendarUtcStamp(m.end_at);
  if (!start || !end || Date.parse(m.end_at) <= Date.parse(m.start_at)) return null;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: m.title,
    dates: `${start}/${end}`,
    details: missionCalendarDescription(m, origin),
  });
  const place = missionLocation(m);
  if (place) params.set("location", place);
  return `https://calendar.google.com/calendar/render?${params}`;
}

export function assignmentIcsEvent(m: CalendarMission, origin = "https://infimatch.fr") {
  const start = calendarUtcStamp(m.start_at);
  const end = calendarUtcStamp(m.end_at);
  if (!start || !end || Date.parse(m.end_at) <= Date.parse(m.start_at)) return null;
  const stamp = calendarUtcStamp(new Date().toISOString()) || start;
  const place = missionLocation(m);
  const lines = [
    "BEGIN:VEVENT",
    `UID:${m.id}@infimatch`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${icsEscape(m.title)}`,
    `DESCRIPTION:${icsEscape(missionCalendarDescription(m, origin))}`,
    place ? `LOCATION:${icsEscape(place)}` : "",
    "STATUS:CONFIRMED",
    "END:VEVENT",
  ].filter(Boolean);
  return lines.map(foldIcsLine).join("\r\n");
}

export function assignmentsToIcs(
  missions: CalendarMission[],
  origin = "https://infimatch.fr",
) {
  const events = upcomingConfirmedMissions(missions)
    .map((m) => assignmentIcsEvent(m, origin))
    .filter((event): event is string => !!event);
  if (!events.length) return null;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//InfiMatch//Missions confirmees//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
