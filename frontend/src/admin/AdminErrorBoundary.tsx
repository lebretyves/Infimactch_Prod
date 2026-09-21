import { Component, type ReactNode } from 'react';
import { Button } from '../ui/Button';

export class AdminErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main className="admin-page" style={{ maxWidth: 720, margin: 'auto', padding: 32 }}>
      <h1>L’administration ne peut pas afficher cette page</h1>
      <p role="alert">Les données reçues sont indisponibles ou inattendues. Rechargez la page pour réessayer.</p>
      <p>Si vous veniez de confirmer une action, vérifiez son résultat avant de la recommencer.</p>
      <Button onClick={() => window.location.reload()}>Réessayer</Button>
    </main>;
    return this.props.children;
  }
}
