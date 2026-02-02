import React, { Component, type ReactNode } from 'react';
import { View } from 'react-native';

type Props = {
  children: ReactNode;
  fallback: ReactNode;
};

type State = { hasError: boolean };

/**
 * Catches map load errors (e.g. Android "API key not found") and shows fallback instead of crashing.
 */
export class MapErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('Map failed to load, showing fallback:', error?.message);
  }

  render() {
    if (this.state.hasError) {
      return <View style={{ minHeight: 140 }}>{this.props.fallback}</View>;
    }
    return this.props.children;
  }
}
