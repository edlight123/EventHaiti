import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './contexts/AuthContext';
import { AppModeProvider } from './contexts/AppModeContext';
import { FiltersProvider } from './contexts/FiltersContext';
import { I18nProvider } from './contexts/I18nContext';
import AppNavigator from './navigation/AppNavigator';

export default function App() {
  return (
    <AuthProvider>
      <I18nProvider>
        <AppModeProvider>
          <FiltersProvider>
            <AppNavigator />
            <StatusBar style="auto" />
          </FiltersProvider>
        </AppModeProvider>
      </I18nProvider>
    </AuthProvider>
  );
}
