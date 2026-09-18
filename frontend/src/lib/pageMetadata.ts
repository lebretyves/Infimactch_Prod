/** Route metadata is deliberately generic: no names, document contents or query tokens. */
export const SITE_ORIGIN = 'https://infimactch-prod-backend-l5bc.vercel.app';
export const PUBLIC_PATHS = new Set(['/', '/installer', '/accessibilite', '/ecoconception', '/mentions-legales']);
const pages: Record<string, [string, string]> = {
 '/': ['L’intérim infirmier, pensé pour le soin', 'Découvrez InfiMatch : un projet de plateforme reliant infirmiers IDE, IADE, IBODE, établissements de santé et agences d’intérim.'],
 '/installer': ['Installer l’application', 'Retrouvez InfiMatch depuis votre écran d’accueil, avec le même compte et les mêmes fonctions.'],
 '/accessibilite': ['Accessibilité : état des travaux', 'Périmètre, méthode et limites des contrôles d’accessibilité du projet InfiMatch.'],
 '/ecoconception': ['Notre démarche d’écoconception', 'Actions et limites de la démarche d’écoconception InfiMatch.'],
 '/mentions-legales': ['Mentions légales et données personnelles', 'Fonctionnement du projet InfiMatch, données de compte et préférences cookies.'],
 '/accueil': ['Vue d’ensemble', 'Consultez vos missions, vos démarches et les accès à votre espace InfiMatch.'],
 '/profil': ['Mon profil', 'Consultez vos informations personnelles et gérez vos qualifications, compétences et expériences.'],
 '/calendrier': ['Disponibilités et mobilité', 'Organisez vos disponibilités et votre zone de mobilité pour rechercher une mission.'],
 '/dossier': ['Mon dossier professionnel', 'Gérez vos justificatifs professionnels, votre vérification et vos coordonnées bancaires.'],
 '/missions': ['Rechercher une mission', 'Recherchez les missions partenaires et les offres externes selon vos critères.'],
 '/candidatures': ['Mes candidatures', 'Suivez vos candidatures et leur état d’avancement.'],
 '/favoris': ['Mes favoris', 'Retrouvez les missions et établissements que vous avez enregistrés.'],
 '/historique': ['Mes missions', 'Retrouvez vos missions confirmées, en cours et passées.'],
 '/notifications': ['Mes notifications', 'Consultez vos messages de suivi et vos préférences de notification.'],
 '/compte': ['Mon compte', 'Consultez les informations de gestion et de clôture de votre compte.'],
 '/connexion': ['Connexion', 'Connectez-vous à votre espace InfiMatch.'],
 '/inscription': ['Créer mon compte', 'Créez votre compte infirmier, établissement ou agence sur InfiMatch.'],
 '/mot-de-passe-oublie': ['Mot de passe oublié', 'Demandez un lien pour réinitialiser votre mot de passe.'],
 '/reinitialiser-mot-de-passe': ['Réinitialiser mon mot de passe', 'Définissez un nouveau mot de passe pour votre compte.'],
 '/organisation': ['Mon organisation', 'Gérez les informations de votre organisation.'],
 '/besoins': ['Besoins de recrutement', 'Suivez les besoins et les missions de votre organisation.'],
};
export function pageMetadata(path: string) {
 const data = pages[path] || (/^\/missions\/[^/]+\/candidater$/.test(path) ? ['Envoyer ma candidature', 'Vérifiez les conditions et confirmez votre candidature.']
  : /^\/missions\/[^/]+$/.test(path) ? ['Détail de l’annonce', 'Consultez les conditions, le lieu et les informations de cette annonce.']
  : /^\/candidatures\/[^/]+$/.test(path) ? ['Suivi de candidature', 'Consultez le suivi de votre candidature.']
  : /^\/etablissements\/[^/]+$/.test(path) ? ['Fiche établissement', 'Consultez les informations disponibles sur cet établissement.']
  : path.startsWith('/inscription/') ? ['Inscription', 'Complétez les étapes de création de votre compte.']
  : path.startsWith('/gestion/missions/') ? ['Gérer une mission', 'Préparez et suivez une mission de votre organisation.']
  : ['Page InfiMatch', 'Plateforme de missions infirmières et de suivi des candidatures.']);
 return {title: data[0] + ' — InfiMatch', description: data[1]!};
}
export function setPageMetadata(path: string) {
 const metadata = pageMetadata(path);
 document.title = metadata.title;
 for (const [attribute,key,value] of [['name','description',metadata.description],['property','og:title',metadata.title],['property','og:description',metadata.description]]) {
  let meta=document.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if(!meta){meta=document.createElement('meta');meta.setAttribute(attribute!,key!);document.head.append(meta);}
  meta.content=value!;
 }
}
