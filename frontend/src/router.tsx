import Notifications from "./pages/Notifications";
import ApercuAnnonces from "./pages/ApercuAnnonces";
import Catalogue from "./pages/Catalogue";
import Besoins from "./pages/Besoins";
import Etablissement from "./pages/Etablissement";
import Dossier from "./pages/Dossier";
import Favoris from "./pages/Favoris";
import Historique from "./pages/Historique";
import Organisation from "./pages/Organisation";
import GestionMission from "./pages/GestionMission";
import MissionForm from "./pages/MissionForm";
import CandidatureDetail from "./pages/CandidatureDetail";
import { ButtonLink } from "./ui/Button";
import { createBrowserRouter, createHashRouter } from "react-router";
import { AppLayout } from "./layouts/AppLayout";
import { InscriptionLayout } from "./pages/inscription/InscriptionLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import AccueilPublic from "./pages/AccueilPublic";
import Connexion from "./pages/Connexion";
import MotDePasseOublie from "./pages/MotDePasseOublie";
import Inscription from "./pages/Inscription";
import Mentions from "./pages/Mentions";
import Identite from "./pages/inscription/Identite";
import Localisation from "./pages/inscription/Localisation";
import Qualification from "./pages/inscription/Qualification";
import Mobilite from "./pages/inscription/Mobilite";
import Disponibilites from "./pages/inscription/Disponibilites";
import Rib from "./pages/inscription/Rib";
import Consentements from "./pages/inscription/Consentements";
import Confirmation from "./pages/inscription/Confirmation";
import ConfirmationEtablissement from "./pages/inscription/ConfirmationEtablissement";
import Accueil from "./pages/Accueil";
import Missions from "./pages/Missions";
import MissionDetail from "./pages/MissionDetail";
import Candidater from "./pages/Candidater";
import Candidatures from "./pages/Candidatures";
import Profil from "./pages/Profil";

const creerRouteur =
  import.meta.env.VITE_ROUTER === "hash"
    ? createHashRouter
    : createBrowserRouter;

export const router = creerRouteur([
  {
    path: "*",
    element: (
      <main style={{ padding: "3rem" }}>
        <h1>Page introuvable</h1>
        <p>Ce lien ne correspond pas à une page disponible.</p>
        <ButtonLink to="/accueil">Revenir à mon espace</ButtonLink>
      </main>
    ),
  },
  { path: "/", element: <AccueilPublic /> },
  { path: "/catalogue", element: <Catalogue /> },
  { path: "/apercu-annonces", element: <ApercuAnnonces /> },
  { path: "/connexion", element: <Connexion /> },
  { path: "/mot-de-passe-oublie", element: <MotDePasseOublie /> },
  { path: "/inscription", element: <Inscription /> },
  { path: "/mentions-legales", element: <Mentions /> },
  {
    element: <InscriptionLayout />,
    children: [
      { path: "/inscription/identite", element: <Identite /> },
      { path: "/inscription/localisation", element: <Localisation /> },
      { path: "/inscription/qualification", element: <Qualification /> },
      { path: "/inscription/mobilite", element: <Mobilite /> },
      { path: "/inscription/disponibilites", element: <Disponibilites /> },
      { path: "/inscription/rib", element: <Rib /> },
      { path: "/inscription/consentements", element: <Consentements /> },
    ],
  },
  { path: "/inscription/confirmation", element: <Confirmation /> },
  {
    path: "/inscription/confirmation-etablissement",
    element: <ConfirmationEtablissement />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/accueil", element: <Accueil /> },
          { path: "/notifications", element: <Notifications /> },
          { path: "/missions", element: <Missions /> },
          { path: "/missions/:id", element: <MissionDetail /> },
          { path: "/missions/:id/candidater", element: <Candidater /> },
          { path: "/candidatures", element: <Candidatures /> },
          { path: "/calendrier", element: <Profil calendar /> },
          { path: "/profil", element: <Profil /> },
          { path: "/dossier", element: <Dossier /> },
          { path: "/favoris", element: <Favoris /> },
          { path: "/etablissements/:id", element: <Etablissement /> },
          { path: "/historique", element: <Historique /> },
          { path: "/organisation", element: <Organisation /> },
          { path: "/besoins", element: <Besoins /> },
          { path: "/gestion/missions/nouvelle", element: <MissionForm /> },
          { path: "/gestion/missions/:id", element: <GestionMission /> },
          { path: "/gestion/missions/:id/modifier", element: <MissionForm /> },
          { path: "/candidatures/:id", element: <CandidatureDetail /> },
        ],
      },
    ],
  },
]);
