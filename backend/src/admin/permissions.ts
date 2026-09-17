export const ADMIN_PERMISSIONS={
 OWNER:['overview','accounts','accounts:write','organizations','missions','jobs','jobs:retry','sources','infrastructure','audit','access','access:write','quality','backups'],
 SUPPORT:['overview','accounts','accounts:write','organizations','missions','quality'],
 OPS:['overview','jobs','jobs:retry','sources','infrastructure','audit','quality','backups'],
 AUDITOR:['overview','missions','jobs','sources','infrastructure','audit','quality','backups'],
} as const;
export type AdminRole=keyof typeof ADMIN_PERMISSIONS;
export function permitted(role:AdminRole,permission:string){return (ADMIN_PERMISSIONS[role] as readonly string[]|undefined)?.includes(permission)??false;}
