import { lazy } from "react";
import { QualityRoot } from "./components/QualityRoot";
const Compte = lazy(() => import("./pages/Compte"));
const ReinitialiserMotDePasse = lazy(() => import("./pages/ReinitialiserMotDePasse"));
const Installer = lazy(() => import("./pages/Installer"));
const Accessibilite = lazy(() => import("./pages/Qualite").then(m => ({ default: m.Accessibilite })));
const Ecoconception = lazy(() => import("./pages/Qualite").then(m => ({ default: m.Ecoconception })));
const Notifications = lazy(() => import("./pages/Notifications"));
const ApercuAnnonces = lazy(() => import("./pages/ApercuAnnonces"));
const Besoins = lazy(() => import("./pages/Besoins"));
const Etablissement = lazy(() => import("./pages/Etablissement"));
const Dossier = lazy(() => import("./pages/Dossier"));
const Favoris = lazy(() => import("./pages/Favoris"));
const Historique = lazy(() => import("./pages/Historique"));
const Organisation = lazy(() => import("./pages/Organisation"));
const GestionMission = lazy(() => import("./pages/GestionMission"));
const MissionForm = lazy(() => import("./pages/MissionForm"));
const CandidatureDetail = lazy(() => import("./pages/CandidatureDetail"));
import { ButtonLink } from "./ui/Button";
import { Navigate, createBrowserRouter, createHashRouter } from "react-router";
import { AppLayout } from "./layouts/AppLayout";
import { InscriptionLayout } from "./pages/inscription/InscriptionLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
const AccueilPublic = lazy(() => import("./pages/AccueilPublic"));
const Connexion = lazy(() => import("./pages/Connexion"));
const MotDePasseOublie = lazy(() => import("./pages/MotDePasseOublie"));
const Inscription = lazy(() => import("./pages/Inscription"));
const Mentions = lazy(() => import("./pages/Mentions"));
const Identite = lazy(() => import("./pages/inscription/Identite"));
const Localisation = lazy(() => import("./pages/inscription/Localisation"));
const Qualification = lazy(() => import("./pages/inscription/Qualification"));
const Mobilite = lazy(() => import("./pages/inscription/Mobilite"));
const Disponibilites = lazy(() => import("./pages/inscription/Disponibilites"));
const Consentements = lazy(() => import("./pages/inscription/Consentements"));
const Confirmation = lazy(() => import("./pages/inscription/Confirmation"));
const ConfirmationEtablissement = lazy(() => import("./pages/inscription/ConfirmationEtablissement"));
const Accueil = lazy(() => import("./pages/Accueil"));
const Missions = lazy(() => import("./pages/Missions"));
const MissionDetail = lazy(() => import("./pages/MissionDetail"));
const Candidater = lazy(() => import("./pages/Candidater"));
const Candidatures = lazy(() => import("./pages/Candidatures"));
const Profil = lazy(() => import("./pages/Profil"));

const creerRouteur =
  import.meta.env.VITE_ROUTER === "hash"
    ? createHashRouter
    : createBrowserRouter;

export const router = creerRouteur([{ element: <QualityRoot />, children: [
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
  { path: "/installer", element: <Installer /> },
  { path: "/accessibilite", element: <Accessibilite /> },
  { path: "/ecoconception", element: <Ecoconception /> },
  { path: "/catalogue", element: <Navigate to="/" replace /> },
  { path: "/apercu-annonces", element: <ApercuAnnonces /> },
  { path: "/connexion", element: <Connexion /> },
  { path: "/mot-de-passe-oublie", element: <MotDePasseOublie /> },
  { path: "/reinitialiser-mot-de-passe", element: <ReinitialiserMotDePasse /> },
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
      { path: "/inscription/rib", element: <Navigate to="/inscription/consentements" replace /> },
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
          { path: "/compte", element: <Compte /> },
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
]}]);
