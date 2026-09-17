import { Link } from "react-router";
import { EcranAuth } from "@/layouts/EcranAuth";
import { ButtonLink } from "@/ui/Button";
import { usePageTitle } from "@/lib/usePageTitle";
export default function MotDePasseOublie() {
  usePageTitle("Retrouver mon accès");
  return (
    <EcranAuth
      promo={<p>Retrouvez votre espace InfiMatch.</p>}
      lien={<Link to="/">Retour à l’accueil</Link>}
    >
      <h1>Retrouver mon accès</h1>
      <p>
        La réinitialisation du mot de passe par email n’est pas encore
        disponible.
      </p>
      <p>Si vous connaissez votre mot de passe, revenez à la connexion.</p>
      <ButtonLink to="/connexion">Revenir à la connexion</ButtonLink>
    </EcranAuth>
  );
}
