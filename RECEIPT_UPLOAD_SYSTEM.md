# Payment Receipt Upload System

## Overview
Implemented a comprehensive payment receipt upload system to track and verify all payout disbursements made to organizers. This ensures transparent record-keeping and provides proof of payment for every transaction.

## Features Implemented

### 1. Receipt Upload Component (`PayoutReceiptUpload.tsx`)
**Location:** `/components/admin/PayoutReceiptUpload.tsx`

**Features:**
- Drag-and-drop file upload interface
- Support for multiple file formats: JPG, PNG, WebP, PDF
- File size validation (max 5MB)
- Real-time preview for image files
- PDF indicator for document files
- Upload progress indication with loading states
- Success/error feedback messages
- Ability to replace existing receipts
- View current receipt with download link

**Usage:**
```tsx
<PayoutReceiptUpload
  payoutId="payout_123"
  organizerId="org_456"
  currentReceiptUrl={existingUrl}
  onUploadComplete={(url) => setReceiptUrl(url)}
/>
```

### 2. Receipt Viewer Component (`PayoutReceiptViewer.tsx`)
**Location:** `/components/admin/PayoutReceiptViewer.tsx`

**Features:**
- Image preview with zoom capability
- PDF document indicator
- Download functionality
- Metadata display (upload date, reference ID)
- Compact and full view modes

**Usage:**
```tsx
<PayoutReceiptViewer
  receiptUrl={payout.receiptUrl}
  uploadedAt={payout.receiptUploadedAt}
  paymentReferenceId={payout.paymentReferenceId}
  compact={false}
/>
```

### 3. Upload API Endpoint
**Location:** `/app/api/admin/upload-receipt/route.ts`

**Endpoints:**

#### POST `/api/admin/upload-receipt`
Upload a payment receipt for a payout.

**Authentication:** Admin only (Bearer token required)

**Request:**
- Method: `POST`
- Headers: `Authorization: Bearer <firebase_token>`
- Body: `FormData` with fields:
  - `file`: Receipt file (JPG, PNG, WebP, or PDF)
  - `payoutId`: Payout document ID
  - `organizerId`: Organizer ID

**Response:**
```json
{
  "success": true,
  "receiptUrl": "https://storage.googleapis.com/...",
  "message": "Receipt uploaded successfully"
}
```

**Validations:**
- Admin authentication required
- File type must be JPG, PNG, WebP, or PDF
- File size must be under 5MB
- Payout must exist

**Storage:**
- Path: `payout-receipts/{organizerId}/{payoutId}/{timestamp}.{ext}`
- Public read access (for organizers and admins)
- Metadata includes: uploadedBy, uploadedAt, payoutId, organizerId

#### DELETE `/api/admin/upload-receipt`
Delete an existing receipt.

**Query Parameters:**
- `payoutId`: Payout document ID
- `organizerId`: Organizer ID

### 4. Payout Schema Updates
**Location:** `/lib/firestore/payout.ts`

**New Fields Added to Payout Interface:**
```typescript
{
  // Receipt confirmation (required for completed payouts)
  receiptUrl?: string           // Firebase Storage URL to receipt image
  receiptUploadedBy?: string    // Admin userId who uploaded receipt
  receiptUploadedAt?: string    // Timestamp of receipt upload
}
```

### 5. Admin Payout Queue Integration
**Location:** `/app/admin/payouts/AdminPayoutQueue.tsx`

**Updates:**
- Receipt upload required before marking payout as paid
- Validation prevents marking as paid without receipt
- Receipt upload section in "Mark Paid" modal
- Modal size increased to accommodate upload component
- Error handling for missing receipts

**Workflow:**
1. Admin clicks "Mark Paid" on a pending payout
2. Modal opens with payment reference field and receipt upload
3. Admin enters payment reference ID
4. Admin uploads receipt proof (bank transfer screenshot, MonCash confirmation, etc.)
5. System validates receipt is uploaded
6. Admin clicks "Mark Paid" to complete
7. Payout status updated to 'completed' with receipt URL stored

### 6. Firebase Storage Rules
**Location:** `/storage.rules`

**New Rule Added:**
```plaintext
match /payout-receipts/{organizerId}/{payoutId}/{allPaths=**} {
  // Read: Organizer can view their receipts, admins can view all
  allow read: if request.auth != null && (
    request.auth.uid == organizerId ||
    request.auth.token.email in ['admin@emails.com']
  );
  
  // Write/Delete: Admin only
  allow write, delete: if request.auth != null && 
    request.auth.token.email in ['admin@emails.com'];
}
```

## Security Features

1. **Admin-Only Upload:** Only admin users can upload/delete receipts
2. **Authentication Required:** All operations require valid Firebase auth token
3. **Path-Based Security:** Storage rules enforce access based on organizerId
4. **File Validation:** Server-side validation of file type and size
5. **Audit Trail:** Tracks who uploaded receipt and when

## File Organization

```
payout-receipts/
├── {organizerId}/
│   └── {payoutId}/
│       ├── {timestamp1}.jpg    # Receipt image
│       ├── {timestamp2}.png    # Replacement receipt
│       └── {timestamp3}.pdf    # Receipt document
```

## Usage Workflow

### For Admins (Disbursement Process)

1. **View Ended Events:**
   - Navigate to `/admin/disbursements`
   - See all events that have ended
   - View organizer bank account details
   - Calculate net payout amounts

2. **Process Payment:**
   - Click "Mark Paid" on eligible payout
   - Enter payment reference ID (bank transaction ID, MonCash reference, etc.)
   - Upload payment receipt:
     - Bank transfer: Screenshot of bank confirmation
     - MonCash: Screenshot of MonCash confirmation
     - NatCash: Screenshot of NatCash confirmation
   - Add optional notes
   - Submit to mark payout as completed

3. **Verify Payment:**
   - View receipt in payout history
   - Download receipt for records
   - Share receipt with organizer if requested

### For Organizers

1. **View Payout History:**
   - Navigate to `/organizer/payouts`
   - See completed payouts with receipt links
   - Download receipts as proof of payment

## Benefits

1. **Accountability:** Every payment has verifiable proof
2. **Transparency:** Organizers can verify payments were sent
3. **Audit Trail:** Complete record of all disbursements
4. **Dispute Resolution:** Receipts serve as evidence in disputes
5. **Financial Tracking:** Easy to match receipts with bank statements
6. **Compliance:** Meets record-keeping requirements

## Error Handling

- **Missing Receipt:** Clear error message if admin tries to mark paid without receipt
- **Invalid File:** Validation for file type and size
- **Upload Failures:** Graceful error handling with retry capability
- **Storage Errors:** Fallback handling if storage deletion fails
- **Auth Errors:** Clear authentication error messages

## Future Enhancements

- [ ] Automatic receipt generation for MonCash/NatCash API payments
- [ ] OCR to extract payment details from receipt images
- [ ] Receipt verification against payment amounts
- [ ] Email receipt copies to organizers automatically
- [ ] Bulk receipt upload for multiple payouts
- [ ] Receipt expiration warnings (for old payouts without receipts)
- [ ] Integration with accounting software

## Testing Checklist

- [x] Build compiles successfully
- [ ] Receipt upload works with JPG images
- [ ] Receipt upload works with PNG images
- [ ] Receipt upload works with PDF documents
- [ ] File size validation (reject >5MB)
- [ ] File type validation (reject invalid formats)
- [ ] Admin-only access enforcement
- [ ] Non-admin users cannot upload receipts
- [ ] Receipt viewer displays images correctly
- [ ] Receipt viewer shows PDF indicator
- [ ] Download functionality works
- [ ] Mark paid validates receipt requirement
- [ ] Receipt metadata stored correctly
- [ ] Storage rules enforced correctly
- [ ] Receipt deletion works
- [ ] Organizers can view their receipts

## Deployment Notes

1. **Firebase Storage:** Ensure Firebase Storage is enabled
2. **Storage Rules:** Deploy updated storage.rules
3. **Admin Emails:** Configure ADMIN_EMAILS environment variable
4. **CORS:** Ensure Firebase Storage CORS allows domain access
5. **Monitoring:** Monitor storage usage and costs

## Cost Considerations

- **Storage:** ~$0.026/GB/month for receipt storage
- **Network:** ~$0.12/GB for downloads
- **Operations:** Free tier likely sufficient (50k reads/day, 20k writes/day)

**Estimate:** For 1000 payouts/month with 2MB avg receipts = 2GB storage + minimal network = ~$0.10/month
