import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useAppMode } from '../contexts/AppModeContext';
import { COLORS } from '../config/brand';
import { getVerificationRequest } from '../lib/verification';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';

// Attendee Screens
import HomeScreen from '../screens/HomeScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import TicketsScreen from '../screens/TicketsScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Organizer Screens
import OrganizerDashboardScreen from '../screens/organizer/OrganizerDashboardScreen';
import OrganizerEventsScreen from '../screens/organizer/OrganizerEventsScreen';
import OrganizerScanScreen from '../screens/organizer/OrganizerScanScreen';
import OrganizerEventManagementScreen from '../screens/organizer/OrganizerEventManagementScreen';
import CreateEventFlowRefactored from '../screens/organizer/CreateEventFlowRefactored';
import TicketScannerScreen from '../screens/organizer/TicketScannerScreen';
import EventAttendeesScreen from '../screens/organizer/EventAttendeesScreen';
import SendEventUpdateScreen from '../screens/organizer/SendEventUpdateScreen';

// Detail Screens
import EventDetailScreen from '../screens/EventDetailScreen';
import EventTicketsScreen from '../screens/EventTicketsScreen';
import TicketDetailScreen from '../screens/TicketDetailScreen';
import OrganizerProfileScreen from '../screens/OrganizerProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

// Verification Screens
import OrganizerVerificationScreen from '../screens/verification/OrganizerVerificationScreen';
import OrganizerInfoFormScreen from '../screens/verification/OrganizerInfoFormScreen';
import GovernmentIDUploadScreen from '../screens/verification/GovernmentIDUploadScreen';
import SelfieUploadScreen from '../screens/verification/SelfieUploadScreen';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  EventDetail: { eventId: string };
  EventTickets: { eventId: string };
  TicketDetail: { ticketId: string };
  OrganizerProfile: { organizerId: string };
  Notifications: { userId: string };
  OrganizerEventManagement: { eventId: string };
  OrganizerVerification: undefined;
  OrganizerInfoForm: { onComplete?: () => void };
  GovernmentIDUpload: { onComplete?: () => void };
  SelfieUpload: { onComplete?: () => void };
  CreateEvent: undefined;
  TicketScanner: { eventId: string };
  EventAttendees: { eventId: string };
  SendEventUpdate: { eventId: string; eventTitle: string };
  EditEvent: { eventId: string };
};

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type AttendeeTabParamList = {
  Home: undefined;
  Discover: undefined;
  Favorites: undefined;
  Tickets: undefined;
  Profile: undefined;
};

export type OrganizerTabParamList = {
  Dashboard: undefined;
  MyEvents: undefined;
  Scan: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AttendeeTab = createBottomTabNavigator<AttendeeTabParamList>();
const OrganizerTab = createBottomTabNavigator<OrganizerTabParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
    </AuthStack.Navigator>
  );
}

function AttendeeTabNavigator() {
  return (
    <AttendeeTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Discover') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Favorites') {
            iconName = focused ? 'heart' : 'heart-outline';
          } else if (route.name === 'Tickets') {
            iconName = focused ? 'ticket' : 'ticket-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        headerShown: false,
      })}
    >
      <AttendeeTab.Screen name="Home" component={HomeScreen} />
      <AttendeeTab.Screen name="Discover" component={DiscoverScreen} />
      <AttendeeTab.Screen name="Favorites" component={FavoritesScreen} />
      <AttendeeTab.Screen name="Tickets" component={TicketsScreen} />
      <AttendeeTab.Screen name="Profile" component={ProfileScreen} />
    </AttendeeTab.Navigator>
  );
}

function OrganizerTabNavigator() {
  return (
    <OrganizerTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Dashboard') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'MyEvents') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Scan') {
            iconName = focused ? 'qr-code' : 'qr-code-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        headerShown: false,
      })}
    >
      <OrganizerTab.Screen name="Dashboard" component={OrganizerDashboardScreen} />
      <OrganizerTab.Screen 
        name="MyEvents" 
        component={OrganizerEventsScreen}
        options={{ title: 'My Events' }}
      />
      <OrganizerTab.Screen name="Scan" component={OrganizerScanScreen} />
      <OrganizerTab.Screen name="Profile" component={ProfileScreen} />
    </OrganizerTab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading, userProfile } = useAuth();
  const { mode, isLoading: modeLoading } = useAppMode();
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    checkVerificationStatus();
  }, [userProfile?.id]);

  const checkVerificationStatus = async () => {
    if (!userProfile?.id) {
      setIsVerified(false);
      return;
    }

    try {
      const verification = await getVerificationRequest(userProfile.id);
      setIsVerified(verification?.status === 'approved');
    } catch (error) {
      setIsVerified(false);
    }
  };

  if (loading || modeLoading) {
    return null; // or a loading screen
  }

  // Determine which tab navigator to show based on mode and user role/verification
  const canUseOrganizerMode = 
    userProfile?.role === 'organizer' || 
    userProfile?.role === 'admin' || 
    isVerified;
  
  const MainTabNavigator = 
    mode === 'organizer' && canUseOrganizerMode
      ? OrganizerTabNavigator
      : AttendeeTabNavigator;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen name="EventDetail" component={EventDetailScreen} />
            <Stack.Screen name="EventTickets" component={EventTicketsScreen} />
            <Stack.Screen name="TicketDetail" component={TicketDetailScreen} />
            <Stack.Screen name="OrganizerProfile" component={OrganizerProfileScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: true, headerTitle: 'Notifications' }} />
            <Stack.Screen 
              name="OrganizerVerification" 
              component={OrganizerVerificationScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="OrganizerInfoForm" 
              component={OrganizerInfoFormScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="GovernmentIDUpload" 
              component={GovernmentIDUploadScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="SelfieUpload" 
              component={SelfieUploadScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen name="OrganizerEventManagement" component={OrganizerEventManagementScreen} options={{ headerShown: true, headerTitle: 'Manage Event' }} />
            <Stack.Screen name="CreateEvent" component={CreateEventFlowRefactored} options={{ headerShown: false }} />
            <Stack.Screen name="TicketScanner" component={TicketScannerScreen} options={{ headerShown: false }} />
            <Stack.Screen name="EventAttendees" component={EventAttendeesScreen} options={{ headerShown: false }} />
            <Stack.Screen name="SendEventUpdate" component={SendEventUpdateScreen} options={{ headerShown: false }} />
            <Stack.Screen name="EditEvent" component={CreateEventFlowRefactored} options={{ headerShown: false }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
