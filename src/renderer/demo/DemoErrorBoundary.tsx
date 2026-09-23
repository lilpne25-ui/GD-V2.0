import React from 'react';

// Aisla la Demo guiada del resto de la aplicacion.
//
// Si la demo (o la carga de su chunk lazy) falla, se muestra un aviso discreto
// y App.tsx sigue funcionando. Esta en el bundle principal a proposito: tiene
// que existir aunque el chunk de la demo no llegue a cargar.

interface Props {
  onReset: () => void;
  children: React.ReactNode;
}

interface State {
  failed: boolean;
}

class DemoErrorBoundary extends React.Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    console.error('[GuidedDemo] La demo se cerró por un error:', error);
  }

  render(): React.ReactNode {
    if (this.state.failed) {
      return (
        <div className="gd-crash" role="alert">
          <span>La demo guiada se cerró por un error. La aplicación sigue operativa.</span>
          <button type="button" onClick={this.props.onReset}>Cerrar aviso</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default DemoErrorBoundary;
