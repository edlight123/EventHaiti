# Firebase Storage Setup Instructions

## Issue
CORS errors blocking file uploads from the web application to Firebase Storage.

## Solution Steps

### Method 1: Configure CORS (Recommended for Production)

1. **Install Google Cloud CLI** (if not already installed):
   - Visit: https://cloud.google.com/sdk/docs/install
   - Follow installation instructions for your OS

2. **Authenticate with Google Cloud**:
   ```bash
   gcloud auth login
   ```

3. **Set your Firebase project**:
   ```bash
   gcloud config set project event-haiti
   ```

4. **Apply CORS configuration**:
   ```bash
   gsutil cors set cors.json gs://event-haiti.firebasestorage.app
   ```

5. **Verify CORS configuration**:
   ```bash
   gsutil cors get gs://event-haiti.firebasestorage.app
   ```

### Method 2: Update Storage Security Rules (Quick Fix)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **event-haiti**
3. Navigate to: **Storage** → **Rules**
4. Replace with these rules:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to upload verification images
    match /verification/{userId}/{allPaths=**} {
      allow read: if request.auth != null || resource.metadata.isPublic == true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Default: deny all other access
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

5. Click **Publish**

### Method 3: Make Bucket Public (NOT RECOMMENDED - Security Risk)

Only use this for testing. Go to Storage Rules and use:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

## After Setup

Once you've configured CORS or updated Storage Rules, try the verification flow again. The uploads should work without CORS errors.

## Troubleshooting

If still having issues:

1. **Check Firebase Storage is enabled**:
   - Go to Firebase Console → Storage
   - Ensure Storage is activated for your project

2. **Verify bucket name**:
   - Should be: `event-haiti.firebasestorage.app`

3. **Check browser console** for any new errors

4. **Clear browser cache** and try again
