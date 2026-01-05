# Payout Settings Redesign - Complete Implementation

## Overview

Complete redesign of the mobile payout settings page with a wizard-like flow, multi-destination support, and comprehensive verification workflows with bidirectional notifications.

## ✅ Completed Features

### Backend Notification Infrastructure (commit: 4eba5c8)

**New Files:**
- `lib/notifications/payout-verification.ts`: Centralized notification helpers
  - `notifyAdminsOfVerificationSubmission()`: Sends notifications to all admins when organizer submits verification
  - `notifyOrganizerVerificationApproved()`: Notifies organizer on verification approval
  - `notifyOrganizerVerificationRejected()`: Notifies organizer on verification rejection
  - `notifyOrganizerVerificationNeedsInfo()`: Notifies organizer when more info needed

- `app/api/admin/verification-status/route.ts`: Admin endpoint to update verification status
  - POST endpoint requiring admin authentication
  - Updates verification document status in Firestore
  - Triggers appropriate organizer notification based on status change
  - Supports statuses: `verified`, `rejected`, `needs_info`

**Updated Files:**
- `app/api/organizer/submit-bank-verification/route.ts`: Added admin notification trigger
- `app/api/organizer/submit-identity-verification/route.ts`: Added admin notification trigger
- `app/api/organizer/submit-phone-verification/route.ts`: Added organizer success notification

### Mobile UI Redesign (commit: 57e87a2)

**New Screen:**
- `mobile/screens/organizer/OrganizerPayoutSettingsScreenV2.tsx` (986 lines)

**Updated Files:**
- `mobile/navigation/AppNavigator.tsx`: Updated to use V2 screen

## 🎨 User Experience Flow

### 1. Initial State (No Destinations)
```
┌─────────────────────────────────┐
│  Identity Verification Banner   │  ← Shows if not verified
│  [Verify Identity] button       │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│     Empty State                 │
│  💰 Wallet Icon                 │
│  "No Payout Methods"            │
│  Description text               │
│  [+ Add Payout Method]          │
└─────────────────────────────────┘
```

### 2. Add Method Selection Modal
```
┌─────────────────────────────────┐
│  Add Payout Method              │
│  Choose how you want to receive │
│                                 │
│  ┌───────────────────────────┐ │
│  │ 💳 Bank Account         > │ │
│  │ Direct to your bank       │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ 📱 MonCash / NatCash    > │ │
│  │ Mobile money account      │ │
│  └───────────────────────────┘ │
│                                 │
│  [Cancel]                       │
└─────────────────────────────────┘
```

### 3. Bank Account Form
```
Full-screen modal with form fields:
- Account Holder Name * (required)
- Bank Name * (required)
- Account Number * (required)
- Routing Number (optional)
- SWIFT Code (optional)

[Save Bank Account] button
```

### 4. Post-Save Alert
```
Alert: "Bank Account Added"
Message: "Your bank account has been saved. 
         You must verify it before you can receive payouts."

Actions:
- [Verify Now] → Opens verification upload modal
- [Later] → Returns to destination list
```

### 5. Verification Document Upload
```
┌─────────────────────────────────┐
│  Verify Bank Account            │
│                                 │
│  ℹ️ Info Card:                  │
│  - Your account number          │
│  - Your name                    │
│  - Your bank name               │
│                                 │
│  Document Type:                 │
│  [Bank Statement] [Void Check]  │
│  [Utility Bill]                 │
│                                 │
│  [📄 Choose Document]           │
│                                 │
│  ✅ Document selected: image.jpg│
│                                 │
│  [Submit for Review]            │
│                                 │
│  "Your document will be reviewed│
│   within 1-2 business days"     │
└─────────────────────────────────┘
```

### 6. Destination List View
```
┌─────────────────────────────────┐
│  Payout Methods         [+ Add] │
├─────────────────────────────────┤
│  💳 Bank of America             │
│  John Smith                     │
│  •••• 1234                      │
│  [Under Review] status pill     │
│  [View Status]                  │
├─────────────────────────────────┤
│  💳 Chase Bank                  │
│  John Smith                     │
│  •••• 5678                      │
│  [✓ Verified] status pill       │
│  (no action needed)             │
└─────────────────────────────────┘
```

## 🎯 Status Badge System

| Status | Color | Icon | Label | Action Available |
|--------|-------|------|-------|-----------------|
| `not_started` | Gray | ⊗ | Not Verified | Verify Now |
| `pending` | Blue | ⏱ | Under Review | View Status |
| `verified` | Green | ✓ | Verified | None |
| `failed` | Red | ⚠ | Needs Attention | Verify Now |

## 🔔 Notification Flows

### Organizer Submits Verification
```
Organizer uploads document
     ↓
Backend stores document in Firestore
     ↓
Trigger: notifyAdminsOfVerificationSubmission()
     ↓
Query all users with role 'admin' or 'super_admin'
     ↓
Create notification for each admin:
  Type: 'payout_verification_submitted'
  Title: 'New Verification Submission'
  Message: '{OrganizerName} submitted {documentType} for review'
  ActionUrl: '/admin/verifications/{documentId}'
```

### Admin Reviews Verification
```
Admin reviews document in web panel
     ↓
Admin updates status via POST /api/admin/verification-status
     ↓
Backend updates verificationDocuments/{docId}
     ↓
Trigger notification based on status:

If verified:
  → notifyOrganizerVerificationApproved()
  → "Your {documentType} has been approved!"

If rejected:
  → notifyOrganizerVerificationRejected()
  → "Your {documentType} was rejected. Reason: {reason}"

If needs_info:
  → notifyOrganizerVerificationNeedsInfo()
  → "More information needed for {documentType}"
```

## 🏗️ Architecture

### Data Model

**Payout Destinations** (`organizers/{id}/payoutDestinations/{destId}`):
```typescript
{
  id: string
  type: 'bank' | 'moncash'
  isPrimary: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
  
  // Bank-specific (encrypted)
  bankName?: string
  accountName?: string
  accountNumber?: string  // encrypted
  accountNumberLast4?: string
  routingNumber?: string
  swiftCode?: string
  
  // MonCash-specific (encrypted)
  provider?: 'moncash' | 'natcash'
  phoneNumber?: string  // encrypted
  phoneNumberLast4?: string
}
```

**Verification Documents** (`organizers/{id}/verificationDocuments/{docId}`):
```typescript
{
  type: 'identity' | 'phone' | 'bank_statement' | 'void_check' | 'utility_bill'
  status: 'pending' | 'verified' | 'failed'
  storageUrl: string
  destinationId?: string  // for bank/phone verification
  submittedAt: Timestamp
  reviewedAt?: Timestamp
  reviewedBy?: string
  rejectionReason?: string
}
```

**Notifications** (`users/{userId}/notifications/{notificationId}`):
```typescript
{
  type: string  // 'payout_verification_submitted', 'payout_verification_approved', etc.
  title: string
  message: string
  actionUrl?: string
  metadata?: Record<string, any>
  read: boolean
  createdAt: Timestamp
}
```

### Backend Endpoints

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/organizer/payout-destinations/bank` | GET | List all bank destinations | Organizer |
| `/api/organizer/payout-destinations/bank` | POST | Add new bank destination | Organizer |
| `/api/organizer/payout-destinations/bank` | DELETE | Remove bank destination | Organizer |
| `/api/organizer/submit-bank-verification` | POST | Upload bank verification doc | Organizer |
| `/api/organizer/submit-identity-verification` | POST | Upload identity doc | Organizer |
| `/api/organizer/submit-phone-verification` | POST | Verify phone with code | Organizer |
| `/api/admin/verification-status` | POST | Update verification status | Admin |

### Mobile Screen Structure

```
OrganizerPayoutSettingsScreenV2
├── Loading State (spinner + text)
├── Main View
│   ├── Header (back button + title)
│   ├── Identity Verification Banner (if needed)
│   ├── Empty State (if no destinations)
│   │   └── [Add Payout Method] button
│   └── Destination List (if destinations exist)
│       ├── Section Header ([Add] button)
│       └── Destination Cards
│           ├── Icon + Details
│           ├── Status Badge
│           └── Action Button (if not verified)
├── Add Method Modal (slide from bottom)
│   ├── Bank Account option
│   └── MonCash option
├── Bank Form Modal (full screen)
│   └── Form fields + [Save] button
├── MonCash Form Modal (full screen)
│   └── Form fields + [Save] button
└── Verification Modal (full screen)
    ├── Info card (requirements)
    ├── Document type selector (chips)
    ├── [Choose Document] button
    ├── Selected file indicator
    └── [Submit for Review] button
```

## 🔐 Security Features

1. **Identity Verification Requirement**: Must complete identity verification before adding any payout methods
2. **Encrypted Storage**: Sensitive bank/phone details encrypted using `lib/security/encryption.ts`
3. **Admin-Only Status Updates**: Only admins can approve/reject verifications
4. **Bearer Token Auth**: All backend requests require valid Firebase auth token
5. **Document Upload**: Secure storage in Firebase Storage with signed URLs

## 📱 Mobile Features

- **Responsive Design**: Adapts to different screen sizes
- **Safe Area Support**: Respects device notches and home indicators
- **Loading States**: Clear feedback during all async operations
- **Error Handling**: User-friendly error messages via Alert dialogs
- **Image Picker Integration**: Native image selection for document uploads
- **FormData Support**: Proper multipart/form-data uploads for files
- **Refresh on Focus**: Automatically reloads data when screen gains focus

## 🧪 Testing Checklist

### Identity Verification
- [ ] Banner shows when identity not verified
- [ ] Can't add payout methods without identity verification
- [ ] Alert prompts to verify identity
- [ ] Banner disappears after identity verified

### Bank Account Flow
- [ ] Can open add method modal
- [ ] Can select bank account option
- [ ] Form validates required fields
- [ ] Save shows loading state
- [ ] Alert offers "Verify Now" after save
- [ ] New destination appears in list
- [ ] Status badge shows "Not Verified"

### Verification Upload
- [ ] Can open verification modal from destination card
- [ ] Can select document type (chips work)
- [ ] Can pick image from library
- [ ] Selected file shows confirmation
- [ ] Submit button disabled until file selected
- [ ] Submit shows loading state
- [ ] Success alert confirms submission
- [ ] Status badge updates to "Under Review"

### Admin Notification
- [ ] Admin receives notification when organizer submits
- [ ] Notification includes organizer name
- [ ] Notification includes document type
- [ ] Notification has link to review page

### Status Updates
- [ ] Admin can approve verification
- [ ] Organizer receives approval notification
- [ ] Status badge updates to "Verified"
- [ ] "Verify Now" button disappears
- [ ] Admin can reject verification
- [ ] Organizer receives rejection notification with reason
- [ ] Status badge updates to "Needs Attention"
- [ ] Admin can request more info
- [ ] Organizer receives needs_info notification

### Multiple Destinations
- [ ] Can add multiple bank accounts
- [ ] Each destination shows independently
- [ ] Each requires separate verification
- [ ] Can have mix of verified/unverified
- [ ] Primary destination marked correctly

### MonCash Flow (TODO)
- [ ] Can select MonCash option
- [ ] Form shows provider selector
- [ ] Phone verification required
- [ ] Separate verification workflow

## 🚀 Deployment Notes

### Environment Requirements
- Firebase Admin SDK configured
- Firebase Storage bucket for document uploads
- Notification system enabled
- Admin role in Firestore user documents

### Post-Deployment Steps
1. Verify admin users have `role: 'admin'` or `role: 'super_admin'` in Firestore
2. Test notification delivery end-to-end
3. Verify document uploads to Storage
4. Test encrypted data decryption
5. Monitor verification submission volume
6. Set up admin dashboard for reviewing verifications

## 📊 Metrics to Track

- Verification submission rate
- Verification approval rate
- Time to verification (submission → approval)
- Rejection reasons (categorized)
- Multiple destination adoption rate
- Notification open rates (admin/organizer)

## 🛠️ Future Enhancements

1. **MonCash Backend**: Implement multi-destination support for MonCash similar to bank accounts
2. **Batch Review**: Admin bulk approval/rejection
3. **Auto-Verification**: OCR-based automatic document verification for certain cases
4. **Document Templates**: Sample documents/guides for organizers
5. **Status History**: Timeline view of verification status changes
6. **Push Notifications**: Real-time push via Firebase Cloud Messaging
7. **In-App Chat**: Direct messaging between admin and organizer for verification issues
8. **Analytics Dashboard**: Organizer view of payout destination performance

## 📝 Related Commits

- `46d2c95`: Mobile Stripe Connect payouts + routing
- `6b20578`: Mobile Firebase auth persistence typecheck fix
- `c7c9212`: Mobile payout verification statuses fix
- `52756f0`: Mobile earnings settings navigation fix
- `4eba5c8`: Backend: add payout verification notifications ✅
- `57e87a2`: Mobile: redesigned payout settings with wizard flow ✅

## 🐛 Known Issues / TODOs

1. **MonCash Multi-Destination**: Backend endpoint not yet implemented
2. **Document Preview**: No preview before upload (future enhancement)
3. **Verification History**: Can't see past verification attempts
4. **Destination Editing**: Can't edit existing destination details (must delete/re-add)
5. **Primary Destination Management**: No UI to change which destination is primary

## 📚 Documentation References

- [Firebase Storage Rules](../storage.rules)
- [Firestore Security Rules](../firestore.rules)
- [Payout System Architecture](../PAYOUT_SYSTEM.md)
- [Notification Helpers](../lib/notifications/helpers.ts)
- [Encryption Module](../lib/security/encryption.ts)
