export function matchingScoreLabel(score:number|null|undefined, indicative?:number|null) {
  if(score != null && Number.isFinite(score))return `Taux de matching : ${Math.round(score)} %`;
  if(indicative != null && Number.isFinite(indicative))return `Taux de matching indicatif : ${Math.round(indicative)} %`;
  return 'Taux de matching indisponible';
}
export const indicativeScoreNotice = 'Ce taux compare les critères du profil et de la mission. Il ne confirme pas l’éligibilité : les points ci-dessous restent à vérifier. La proximité ou les horaires impossibles à évaluer apportent 0 point. Les critères obligatoires restent contrôlés séparément.';
