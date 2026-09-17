import { useEffect, useState } from 'react';
import { Button } from '@/ui/Button';
import { QualityPage } from './Qualite';
import { canInstall, installApp, isStandalone } from '@/lib/pwa';
export default function Installer() {
  const [, render] = useState(0);
  const [message, setMessage] = useState('');
  useEffect(() => { const update = () => render(v => v + 1); window.addEventListener('infimatch:pwa', update); return () => window.removeEventListener('infimatch:pwa', update); }, []);
  async function install() {
    try { const result = await installApp(); setMessage(result === 'accepted' ? 'Demande acceptée. Votre navigateur termine l’installation.' : result === 'dismissed' ? 'Installation annulée. Vous pouvez continuer sur le site.' : 'Utilisez les instructions ci-dessous.'); }
    catch { setMessage('L’installation n’a pas abouti. Utilisez le menu de votre navigateur ou continuez sur le site.'); }
  }
  return <QualityPage title="Installer l’application" description="Retrouvez InfiMatch depuis votre écran d’accueil, avec le même compte et les mêmes fonctions.">
    <section aria-labelledby="installation"><h2 id="installation">Un accès direct à votre espace</h2>
      <p>Gratuite à installer, cette application web ne nécessite ni APK ni téléchargement depuis un store.</p>
      {isStandalone() ? <p role="status">InfiMatch est ouvert en mode application.</p> : canInstall() ? <Button onClick={install}>Installer InfiMatch</Button> : <p>Le bouton d’installation n’est pas proposé par votre navigateur actuellement. Suivez les étapes adaptées à votre appareil ci-dessous.</p>}
      <p role="status" aria-live="polite">{message}</p>
    </section>
    <section aria-labelledby="instructions"><h2 id="instructions">Selon votre appareil</h2>
      <h3>iPhone ou iPad</h3><p>Ouvrez ce site dans Safari. Dans le menu de partage, choisissez « Sur l’écran d’accueil », puis « Ajouter ». Activez l’ouverture comme application web si cette option est proposée.</p>
      <h3>Android</h3><p>Dans le menu du navigateur, cherchez « Installer l’application » ou « Ajouter à l’écran d’accueil ». Le libellé et la disponibilité dépendent du navigateur.</p>
      <h3>Ordinateur</h3><p>Dans Chrome ou Edge, utilisez l’icône d’installation de la barre d’adresse ou le menu des applications. Dans Firefox, si aucune installation n’est proposée par votre version, ajoutez InfiMatch à vos marque-pages : le site reste utilisable.</p>
    </section>
    <section aria-labelledby="connexion-necessaire"><h2 id="connexion-necessaire">Une connexion reste nécessaire</h2><p>Vos missions, candidatures et documents ne sont pas disponibles hors connexion. Aucune candidature ni modification n’est enregistrée pour un envoi ultérieur. Une page d’aide s’affiche si le réseau est coupé.</p><p>L’installation n’active pas les notifications. Vos préférences restent disponibles dans votre espace. Pour retirer l’application, utilisez les réglages de votre appareil ou de votre navigateur.</p></section>
  </QualityPage>;
}
