import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { Button } from "@/ui/Button";
import { Icon, type IconName } from "@/ui/Icon";
import { Logo } from "@/ui/Logo";
import { useAuth } from "@/context/AuthContext";
import s from "./AppLayout.module.css";
const nurseNavigation: { to: string; label: string; icon: IconName }[] = [
  { to: "/accueil", label: "Vue d’ensemble", icon: "nav-home" },
  { to: "/missions", label: "Rechercher une mission", icon: "search" },
  { to: "/candidatures", label: "Mes candidatures", icon: "file-text" },
  { to: "/calendrier", label: "Disponibilités", icon: "calendar" },
  { to: "/dossier", label: "Mon dossier", icon: "folder" },
  { to: "/profil", label: "Mon profil", icon: "user" },
];
const enterpriseNavigation: { to: string; label: string; icon: IconName }[] = [
  { to: "/accueil", label: "Mon espace", icon: "nav-home" },
  { to: "/missions", label: "Missions", icon: "search" },
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
    <div className={s.shell}>
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
        {(nurse ? nurseNavigation : enterpriseNavigation).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `${s.link} ${isActive ? s.active : ""}`
            }
          >
            <Icon name={item.icon} size={21} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        {nurse && (
          <div className={s.secondary}>
            <NavLink
              to="/favoris"
              className={({ isActive }) =>
                `${s.link} ${isActive ? s.active : ""}`
              }
            >
              <Icon name="heart-outline" size={19} />
              Mes favoris
            </NavLink>
            <NavLink
              to="/historique"
              className={({ isActive }) =>
                `${s.link} ${isActive ? s.active : ""}`
              }
            >
              <Icon name="record" size={19} />
              Historique des missions
            </NavLink>
          </div>
        )}
        <div className={s.bottom}>
          <Link to="/catalogue" className={s.catalogue}>
            Catalogue des pages
          </Link>
          <Button variant="ghost" onClick={exit}>
            <Icon name="arrow-left" size={18} />
            Déconnexion
          </Button>
        </div>
      </nav>
      <main className={s.main} id="contenu">
        {error && <p role="alert">{error}</p>}
        <Outlet />
        <footer className={s.footer}>
          InfiMatch © {new Date().getFullYear()}
          <Link to="/mentions-legales">Mentions légales</Link>
        </footer>
      </main>
    </div>
  );
}
