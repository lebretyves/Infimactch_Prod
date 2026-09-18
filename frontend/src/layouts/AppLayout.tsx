import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { Button } from "@/ui/Button";
import { Icon, type IconName } from "@/ui/Icon";
import { Logo } from "@/ui/Logo";
import { useAuth } from "@/context/AuthContext";
import { NotificationRead } from "@/components/NotificationRead";
import s from "./AppLayout.module.css";
type NavigationItem = { to: string; label: string; icon: IconName };
const nurseGroups: { label: string; items: NavigationItem[] }[] = [
  { label: "Découvrir", items: [
    { to: "/missions", label: "Rechercher une mission", icon: "search" },
    { to: "/favoris", label: "Mes favoris", icon: "heart-outline" },
  ] },
  { label: "Suivi", items: [
    { to: "/candidatures", label: "Mes candidatures", icon: "file-text" },
    { to: "/historique", label: "Mes missions", icon: "record" },
  ] },
  { label: "Mon dossier", items: [
    { to: "/profil", label: "Mon profil", icon: "user" },
    { to: "/calendrier", label: "Disponibilités et mobilité", icon: "calendar" },
    { to: "/dossier", label: "Documents et vérifications", icon: "folder" },
  ] },
];
function NavigationLink({ item }: { item: NavigationItem }) {
  return <NavLink to={item.to} className={({ isActive }) => `${s.link} ${isActive ? s.active : ""}`}>
    <Icon name={item.icon} size={20} /><span>{item.label}</span>
  </NavLink>;
}
const enterpriseNavigation: { to: string; label: string; icon: IconName }[] = [
  { to: "/accueil", label: "Mon espace", icon: "nav-home" },
  { to: "/notifications", label: "Notifications", icon: "bell" },
  { to: "/missions", label: "Offres et suivi", icon: "search" },
  { to: "/besoins", label: "Besoins", icon: "briefcase" },
  { to: "/organisation", label: "Organisation", icon: "building" },
];
export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(""),
    [open, setOpen] = useState(false);
  const menu = useRef<HTMLButtonElement>(null);
  const nurse = user?.role === "interimaire";
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        setOpen(false);
        menu.current?.focus();
      }
    }
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open]);
  async function exit() {
    try {
      setError("");
      await logout();
      navigate("/connexion");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const name =
    [user?.prenom, user?.nom].filter(Boolean).join(" ") || "Mon compte";
  return (
    <div className={s.shell} data-space={nurse ? "candidate" : "enterprise"}>
      <NotificationRead />
      <a className="skipLink" href="#contenu">
        Aller au contenu principal
      </a>
      <header className={s.header}>
        <Link
          to="/accueil"
          className={s.brand}
          aria-label="InfiMatch — accueil"
        >
          <Logo size={34} withWordmark />
        </Link>
        <div className={s.headerRight}>
          <Link className={s.identity} to={nurse ? "/profil" : "/organisation"}>
            <span className={s.avatar}>
              {(user?.prenom?.[0] || "I") + (user?.nom?.[0] || "")}
            </span>
            <span>
              <strong>{name}</strong>
              <small>
                {nurse
                  ? user?.qualification || "Professionnel de santé"
                  : user?.nomEtablissement || "Entreprise"}
              </small>
            </span>
          </Link>
          <button
            ref={menu}
            type="button"
            className={s.menu}
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            aria-controls="navigation-espace"
            onClick={() => setOpen(!open)}
          >
            <Icon name={open ? "close" : "menu"} />
          </button>
        </div>
      </header>
      <nav
        id="navigation-espace"
        className={`${s.nav} ${open ? s.open : ""}`}
        aria-label="Navigation principale"
      >
        {nurse ? <>
          <NavigationLink item={{ to: "/accueil", label: "Vue d’ensemble", icon: "nav-home" }} />
          {nurseGroups.map(group => <div className={s.navGroup} key={group.label} role="group" aria-label={group.label}>
            <p className={s.groupLabel}>{group.label}</p>
            {group.items.map(item => <NavigationLink key={item.to} item={item} />)}
          </div>)}
        </> : enterpriseNavigation.map(item => <NavigationLink key={item.to} item={item} />)}
        <div className={s.bottom}>
          {nurse && <NavigationLink item={{ to: "/notifications", label: "Notifications", icon: "bell" }} />}
          <Link to="/compte" className={s.catalogue}>Mon compte</Link>
          <Button variant="ghost" onClick={exit}>
            <Icon name="arrow-left" size={18} />
            Déconnexion
          </Button>
        </div>
      </nav>
      <main className={s.main} id="contenu" tabIndex={-1}>
        {error && <p role="alert">{error}</p>}
        <Outlet />
        <footer className={s.footer}>
          InfiMatch © {new Date().getFullYear()}
          <Link to="/mentions-legales">Mentions légales</Link><Link to="/accessibilite">Accessibilité</Link><Link to="/ecoconception">Écoconception</Link>
        </footer>
      </main>
    </div>
  );
}
