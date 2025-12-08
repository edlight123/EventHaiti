# EventHaiti Mobile App

React Native mobile application for EventHaiti built with Expo.

## Features

- 🎭 Browse upcoming events
- 🎫 View and manage tickets
- 🔐 Firebase authentication
- 📱 Cross-platform (iOS & Android)
- 🎨 Native UI components

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo Go app (for testing on physical device)
- iOS Simulator (Mac only) or Android Emulator

## Setup

1. **Install dependencies:**
   ```bash
   cd mobile
   npm install
   ```

2. **Configure Firebase:**
   - Copy `.env.example` to `.env`
   - Add your Firebase configuration from the web app's Firebase project
   ```bash
   cp .env.example .env
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

## Running the App

### On Physical Device (Easiest)
1. Install Expo Go from App Store (iOS) or Play Store (Android)
2. Run `npm start`
3. Scan the QR code with your camera (iOS) or Expo Go app (Android)

### On iOS Simulator (Mac only)
```bash
npm run ios
```

### On Android Emulator
```bash
npm run android
```

### On Web Browser
```bash
npm run web
```

## Project Structure

```
mobile/
├── config/           # App configuration (Firebase, brand colors)
├── contexts/         # React contexts (Auth, etc.)
├── navigation/       # Navigation setup
├── screens/          # App screens
│   ├── auth/         # Login, Signup screens
│   ├── HomeScreen.tsx
│   ├── DiscoverScreen.tsx
│   ├── TicketsScreen.tsx
│   └── ProfileScreen.tsx
├── components/       # Reusable components (to be added)
├── services/         # API services (to be added)
└── App.tsx          # Root component
```

## Current Status

✅ **Implemented:**
- Authentication (Login/Signup)
- Home screen with event listing
- Bottom tab navigation
- Profile screen
- Firebase integration

🚧 **Coming Soon:**
- Event detail page
- Ticket purchase
- QR code generation
- Push notifications
- Event search and filters
- Organizer features

## Development

### Adding New Screens
1. Create screen component in `screens/`
2. Add to navigation in `navigation/AppNavigator.tsx`
3. Update TypeScript types for navigation params

### Firebase Configuration
The app shares the same Firebase project as the web app. No additional setup needed beyond environment variables.

## Building for Production

### iOS
```bash
npm run build:ios
```

### Android
```bash
npm run build:android
```

## Testing

Run on multiple devices and screen sizes to ensure responsive design.

## Contributing

This mobile app is part of the EventHaiti ecosystem. See main README for contribution guidelines.

## License

Same as the main EventHaiti project.
