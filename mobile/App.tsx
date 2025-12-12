import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './contexts/AuthContext';
import { FiltersProvider } from './contexts/FiltersContext';
import AppNavigator from './navigation/AppNavigator';

export default function App() {
  return (
    <AuthProvider>
      <FiltersProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </FiltersProvider>
    </AuthProvider>
  );
}
