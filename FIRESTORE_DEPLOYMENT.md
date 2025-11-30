# Firebase Firestore Security Rules Deployment

## Overview
This project uses Firestore for notifications, FCM tokens, and other real-time features. The security rules ensure users can only access their own data.

## Deploy Firestore Rules

### Option 1: Firebase Console (Recommended for quick fix)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **eventhaiti-c5e1f**
3. Navigate to **Firestore Database** → **Rules**
4. Copy the contents of `firestore.rules` from this repository
5. Paste into the rules editor
6. Click **Publish**

### Option 2: Firebase CLI

1. Install Firebase CLI if you haven't:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in this project (if not already done):
   ```bash
   firebase init firestore
   ```
   - Select existing project: **eventhaiti-c5e1f**
   - Use `firestore.rules` as the rules file
   - Don't overwrite if it asks

4. Deploy the rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

## Rules Summary

The `firestore.rules` file includes permissions for:

- ✅ **Notifications**: Users can read/write their own notifications
- ✅ **FCM Tokens**: Users can manage their own push notification tokens
- ✅ **Events**: Public read, organizers can create/update their events
- ✅ **Tickets**: Users can access their own tickets, organizers can see tickets for their events
- ✅ **Promo Codes**: Organizers can manage promo codes for their events
- ✅ **Favorites**: Users can manage their own favorites
- ✅ **Reviews**: Public read, authenticated users can create, authors can update/delete

## Testing

After deploying, test the notifications feature by:

1. Logging in to the app
2. Check if the notification bell appears in the navbar
3. Purchase a ticket (the notification system should create an in-app notification)
4. Verify no permission errors in the browser console

## Current Status

⚠️ **The notification bell is currently showing permission errors because the Firestore rules haven't been deployed yet.**

Once you deploy the rules using one of the methods above, the errors will be resolved and notifications will work properly.
