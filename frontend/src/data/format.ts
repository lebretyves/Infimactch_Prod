const jour = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' });
const jourCourt = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' });
const complet = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function formatPeriode(debut: string, fin: string) {
  return `${jourCourt.format(new Date(debut))} → ${jourCourt.format(new Date(fin))}`;
}

export function formatJour(date: string) {
  return jour.format(new Date(date));
}

export function formatJourComplet(date: string) {
  return complet.format(new Date(date));
}

export function joursOuvres(debut: string, fin: string) {
  const ms = new Date(fin).getTime() - new Date(debut).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

export function formatTaux(tauxHoraire: number) {
  return `${tauxHoraire} € brut / heure`;
}
