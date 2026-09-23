// Vault's '*' glob is only supported at the end of a path.
// Expand rotation permissions to the three known roles, preserving all other ACLs.
export function repairOperatorRotationPolicy(policy) {
  return policy.replace(/path\s+"auth\/approle\/role\/infimatch-v1-\*\/(role-id|secret-id|secret-id-accessor\/destroy)"\s*\{([^}]*)\}/g,
    (_,suffix,body)=>['backend','infra','operator'].map(group=>`path "auth/approle/role/infimatch-v1-${group}/${suffix}" {${body}}`).join('\n'));
}
