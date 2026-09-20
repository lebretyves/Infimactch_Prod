/** Key metadata is public; key bytes are read only from Vault, never from an archive. */
export function backupRoot(values,manifest){
 let raw;
 if(manifest.version===1)raw=values.DOCUMENT_KEY_V1||values.DOCUMENT_KEY;
 else if(manifest.version===2&&manifest.keyFamily==='BACKUP_KEY'&&/^[1-9]\d{0,5}$/.test(String(manifest.keyVersion))){
  const version=String(manifest.keyVersion),current=values.BACKUP_KEY_VERSION||'1';
  raw=version===current?values.BACKUP_KEY:values['BACKUP_KEY_V'+version];
 }else throw Error('UNSUPPORTED_BACKUP_KEY_METADATA');
 if(!raw)throw Error('BACKUP_KEY_VERSION_UNAVAILABLE');const bytes=Buffer.from(raw,'base64');if(bytes.length!==32)throw Error('INVALID_BACKUP_KEY');return bytes;
}
export function newBackupKeyMetadata(values){
 const metadata={version:2,keyFamily:'BACKUP_KEY',keyVersion:values.BACKUP_KEY_VERSION||'1'};
 backupRoot(values,metadata);return metadata;
}
