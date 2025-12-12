# 🧪 EventHaiti Mobile App - Testing Guide

## ✅ Server Status: RUNNING

Your Expo server is live with:
- **Tunnel Mode:** Connected via ngrok
- **QR Code:** Visible in terminal (scan with Expo Go)
- **Account:** Logged in as edlight123
- **Firebase:** Connected to event-haiti project

## 📱 Quick Test Steps

### 1️⃣ Reload the App
On your iPhone in Expo Go:
- **Shake the device** to open Expo menu
- Tap **"Reload"** to load the updated code

### 2️⃣ Test Google Sign-In
1. On the login screen, tap **"🌐 Continue with Google (Web)"**
2. Browser should open to eventhaiti.vercel.app
3. Sign in with Google on the web
4. When done, switch back to Expo Go app
5. **You should be logged in!**

### 3️⃣ Check Events (Home Tab)
- Should show events from your Firebase
- Pull down to refresh
- Tap an event to see details
- Check that event info displays correctly

### 4️⃣ Test Search (Discover Tab)
- Use search bar to find events
- Try filtering by category (Music, Sports, etc.)
- Try filtering by location
- Results should update immediately

### 5️⃣ Test Favorites (Favorites Tab)
1. Go to any event detail (from Home or Discover)
2. Tap the **❤️ heart icon** to favorite
3. Go to **Favorites tab**
4. Event should appear there
5. Tap heart again to unfavorite
6. Should disappear from favorites

### 6️⃣ Check Profile (Profile Tab)
- Should show your name and email
- Should show ticket count and favorite count
- Tap "Sign Out" to test logout

## 🔍 What to Verify

### Events Should Show:
- ✅ Event title
- ✅ Event date and time
- ✅ Location
- ✅ Price (if applicable)
- ✅ Event image/banner

### Data Sources:
All data comes from your **event-haiti** Firebase:
- Events from `events` collection
- Categories from `categories` collection
- User info from `users` collection
- Favorites from `event_favorites` collection

### Navigation Should Work:
- ✅ Bottom tabs switch screens
- ✅ Tapping events opens detail screen
- ✅ Back button returns to previous screen
- ✅ All screens load without crashing

## 🎯 Expected Behavior

### Google Sign-In Flow:
1. **Tap Google button** → Opens browser
2. **Sign in on web** → Uses your existing Google OAuth
3. **Switch back to app** → Should auto-login
4. **Firebase syncs** → Session shared between web and mobile

**Note:** The browser approach is by design - Expo Go doesn't support native Google Sign-In. Your web OAuth setup is being reused!

### Event Loading:
- **First load:** May take 30-60 seconds to fetch from Firebase
- **Pull to refresh:** Should reload events quickly
- **Empty state:** Shows message if no events found

### Favorites:
- **Add favorite:** Heart turns red
- **Remove favorite:** Heart goes back to outline
- **Synced:** Favorites saved to Firebase immediately

## 🐛 Troubleshooting

### If no events show:
1. Check internet connection
2. Pull down to refresh on Home screen
3. Make sure events exist in Firebase with `is_published: true`
4. Check that event dates are in the future

### If Google Sign-In doesn't work:
1. Make sure browser opens when you tap the button
2. Sign in with Google on the web
3. Switch back to Expo Go manually
4. Wait a few seconds for session to sync

### If app crashes:
1. Shake device → Reload
2. If still crashing, close Expo Go completely
3. Scan QR code again to reopen

### If favorites don't save:
1. Make sure you're logged in
2. Check internet connection
3. Try tapping heart again

## 📊 Sample Test Flow

**Complete Test (5 minutes):**

1. **Login** (30 seconds)
   - Tap "🌐 Continue with Google (Web)"
   - Sign in on browser
   - Return to app
   - ✅ Should be logged in

2. **Browse Events** (1 minute)
   - Scroll through Home tab
   - ✅ Events should load
   - Tap an event
   - ✅ Details should show

3. **Search** (1 minute)
   - Go to Discover tab
   - Search for "music"
   - ✅ Results should filter
   - Try category filter
   - ✅ Results should update

4. **Favorites** (1 minute)
   - Open any event
   - Tap heart icon
   - ✅ Heart turns red
   - Go to Favorites tab
   - ✅ Event appears there
   - Tap heart again
   - ✅ Event disappears

5. **Profile** (30 seconds)
   - Go to Profile tab
   - ✅ Name and email show
   - ✅ Stats show correct counts
   - Tap Sign Out
   - ✅ Returns to login

6. **Re-login** (30 seconds)
   - Sign in again
   - ✅ Favorites still saved
   - ✅ Profile info retained

## ✨ Summary

**Your app is fully connected to Firebase and should be pulling:**
- ✅ All published events
- ✅ Event categories
- ✅ User profiles
- ✅ Favorites
- ✅ Organizer info

**Test all 5 tabs** to confirm everything works!

If you see data in each screen, **your mobile app is 100% working!** 🎉
