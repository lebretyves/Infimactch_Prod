import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '@/context/AuthContext';

export function ProtectedRoute() {
  const location=useLocation();
  const { isAuthenticated, isLoading, error, refresh } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: '2rem' }}>
        <p>Vérification de la session en cours…</p>
      </div>
    );
  }

  if (error) return <div role="alert"><p>{error}</p><button onClick={() => void refresh()}>Réessayer</button></div>;

  if (!isAuthenticated) {
    return <Navigate to="/connexion" replace state={{from:location.pathname+location.search+location.hash}} />;
  }

  return <Outlet />;
}
