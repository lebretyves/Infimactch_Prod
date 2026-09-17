export const ADMIN_PERMISSIONS={
 OWNER:['organizations:write','matching','verification:write','sources:write','incidents:write','overview','accounts','accounts:write','organizations','missions','jobs','jobs:retry','sources','infrastructure','audit','access','access:write','quality','backups'],
 SUPPORT:['matching','verification:write','overview','accounts','accounts:write','organizations','missions','quality'],
 OPS:['sources:write','incidents:write','overview','jobs','jobs:retry','sources','infrastructure','audit','quality','backups'],
 AUDITOR:['overview','missions','jobs','sources','infrastructure','audit','quality','backups'],
} as const;
export type AdminRole=keyof typeof ADMIN_PERMISSIONS;
export function permitted(role:AdminRole,permission:string){return (ADMIN_PERMISSIONS[role] as readonly string[]|undefined)?.includes(permission)??false;}
