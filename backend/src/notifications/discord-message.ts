import { notificationCatalog, NoticeKind } from "./catalog";

export type DiscordMission = {
  title?: string; establishment_name?: string;
  start_at?: string | Date; end_at?: string | Date;
  timezone?: string; schedule_precision?: string;
};
type Notice = {
  kind: string; message: string; href: string; notification_id: string;
  organization_id?: string | null; mission?: DiscordMission;
};
// Escape user-authored mission names rather than allowing injected links/mentions.
function plain(value: string, limit: number): string {
  return value.replace(/[\r\n\t]+/g, " ").slice(0, limit)
    .replace(/([\\*_~`|[\]()<>#])/g, "\\$1").replace(/@/g, "@\u200b");
}
function schedule(m: DiscordMission): string | undefined {
  if (!m.start_at || !m.end_at) return;
  const start = new Date(m.start_at), end = new Date(m.end_at);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return;
  try {
    const zone = m.timezone || "Europe/Paris";
    const options: Intl.DateTimeFormatOptions = {timeZone: zone, day:"2-digit", month:"short", year:"numeric"};
    if (m.schedule_precision !== "DATE") Object.assign(options, {hour:"2-digit", minute:"2-digit"});
    const format = new Intl.DateTimeFormat("fr-FR", options);
    return format.format(start) + " → " + format.format(end)
      + (m.schedule_precision === "DATE" ? " · horaires à préciser" : " (" + zone + ")");
  } catch { return; }
}
export function discordNotificationMessage(item: Notice, origin: string): string {
  const base = new URL(origin), link = new URL(item.href, base);
  if (!["http:", "https:"].includes(base.protocol) || link.origin !== base.origin || link.username || link.password)
    throw Error("INVALID_NOTIFICATION_LINK");
  link.searchParams.set("notification", item.notification_id);
  const title = item.kind === "APPLICATION_SUBMITTED" && item.organization_id
    ? "Candidature reçue"
    : Object.hasOwn(notificationCatalog, item.kind) ? notificationCatalog[item.kind as NoticeKind] : "Nouvelle notification";
  const lines = ["**" + title + "**", "", plain(item.message, 650)];
  if (item.mission) {
    const m = item.mission;
    lines.push("");
    if (m.title) lines.push("**Mission :** " + plain(m.title, 140));
    if (m.establishment_name) lines.push("**Établissement :** " + plain(m.establishment_name, 140));
    const dates = schedule(m);
    if (dates) lines.push("**Dates :** " + dates);
  }
  const label = item.href.startsWith("/missions/") || item.href.startsWith("/gestion/missions/")
    ? "Voir la mission" : item.href === "/besoins" ? "Voir les besoins" : "Ouvrir mon espace InfiMatch";
  // Angle brackets suppress automatic previews, including through the existing n8n relay.
  const url = link.href.replace(/[()]/g, c => c === "(" ? "%28" : "%29");
  lines.push("", "[" + label + "](<" + url + ">)");
  const content = lines.join("\n");
  if (content.length > 2000) throw Error("NOTIFICATION_TOO_LONG");
  return content;
}
