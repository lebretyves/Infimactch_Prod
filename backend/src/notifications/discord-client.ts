import { ServiceUnavailableException } from "@nestjs/common";

export class DiscordFailure extends Error {
  constructor(readonly status: number) { super("DISCORD_" + status); }
}
export function discordConfigured() { return Boolean(process.env.DISCORD_BOT_TOKEN || (process.env.DISCORD_RELAY_URL && process.env.DISCORD_RELAY_TOKEN)); }
export async function discordApi(path: string, method = "GET", body?: unknown): Promise<any> {
  const direct = process.env.DISCORD_BOT_TOKEN;
  if (!discordConfigured()) throw new ServiceUnavailableException("La connexion Discord n’est pas encore configurée.");
  const relay = process.env.DISCORD_RELAY_URL;
  if (!direct && !relay?.startsWith("https://")) throw new Error("HTTPS Discord relay required");
  const response = await fetch(direct ? "https://discord.com/api/v10" + path : relay!, {
    method: direct ? method : "POST",
    headers: direct ? {Authorization:"Bot " + direct,"Content-Type":"application/json"} : {"X-InfiMatch-Discord":process.env.DISCORD_RELAY_TOKEN!,"Content-Type":"application/json"},
    body: direct ? body === undefined ? undefined : JSON.stringify(body) : JSON.stringify({path,method,body}),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new DiscordFailure(response.status);
  const data = await response.json();
  if (!direct) {
    if (!data || !Number.isInteger(data.statusCode)) throw new Error("INVALID_RELAY_RESPONSE");
    if (data.statusCode < 200 || data.statusCode >= 300) throw new DiscordFailure(data.statusCode);
    return data.body;
  }
  return data;
}
export async function sendDiscord(targetType: string, targetId: string, content: string, nonce: string) {
  const channelId = targetType === "user" ? (await discordApi("/users/@me/channels","POST",{recipient_id:targetId})).id : targetId;
  return discordApi("/channels/" + channelId + "/messages","POST",{content,allowed_mentions:{parse:[]},nonce,enforce_nonce:true});
}
export function guildPermissions(guild: any, member: any, roles: any[]): bigint {
  if (guild.owner_id === member.user?.id) return 8n;
  const ids = new Set([guild.id,...(member.roles || [])]);
  return roles.filter(r=>ids.has(r.id)).reduce((p,r)=>p|BigInt(r.permissions),0n);
}
export function channelPermissions(guild: any, member: any, roles: any[], channel: any): bigint {
  let permissions = guildPermissions(guild,member,roles);
  if ((permissions & 8n) !== 0n) return (1n<<53n)-1n;
  const overwrites = channel.permission_overwrites || [];
  const everyone = overwrites.find((o:any)=>o.id===guild.id);
  if (everyone) permissions = (permissions & ~BigInt(everyone.deny)) | BigInt(everyone.allow);
  let deny=0n,allow=0n;
  for (const o of overwrites.filter((o:any)=>o.type===0 && member.roles?.includes(o.id))) { deny|=BigInt(o.deny); allow|=BigInt(o.allow); }
  permissions=(permissions & ~deny)|allow;
  const personal=overwrites.find((o:any)=>o.type===1 && o.id===member.user?.id);
  if(personal) permissions=(permissions & ~BigInt(personal.deny))|BigInt(personal.allow);
  return permissions;
}
