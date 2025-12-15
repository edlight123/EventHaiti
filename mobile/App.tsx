import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './contexts/AuthContext';
import { AppModeProvider } from './contexts/AppModeContext';
import { FiltersProvider } from './contexts/FiltersContext';
import AppNavigator from './navigation/AppNavigator';

export default function App() {
  return (
    <AuthProvider>
      <AppModeProvider>
        <FiltersProvider>
          <AppNavigator />
          <StatusBar style="auto" />
        </FiltersProvider>
      </AppModeProvider>
    </AuthProvider>
  );
}
