# Settlement Status Cron Job Setup

## Overview
The settlement status cron job automatically updates earnings records from 'pending' to 'ready' when the 7-day hold period has passed after an event.

## Vercel Cron Configuration

### Already Added to vercel.json
```json
{
  "path": "/api/cron/update-settlement-status",
  "schedule": "0 2 * * *"
}
```

This runs daily at 2:00 AM UTC.

## Environment Variables Required

Add to Vercel dashboard (Settings > Environment Variables):

```bash
CRON_SECRET=your-secure-random-string-here
```

Generate a secure random string:
```bash
# On Mac/Linux
openssl rand -base64 32

# Or use
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Security

The cron endpoint requires a Bearer token:
```
Authorization: Bearer <CRON_SECRET>
```

Vercel Cron automatically includes this header when calling the endpoint.

## Manual Testing

To test manually:

```bash
# Set your cron secret
export CRON_SECRET="your-secret-here"

# Call the endpoint
curl -X GET https://your-domain.com/api/cron/update-settlement-status \
  -H "Authorization: Bearer $CRON_SECRET"
```

Expected response:
```json
{
  "success": true,
  "timestamp": "2024-12-18T02:00:00.000Z",
  "pendingUpdated": 5,
  "lockedUnlocked": 2,
  "failed": 0,
  "total": 7
}
```

## What It Does

1. **Finds pending earnings** that have passed their settlement date
2. **Updates status** from 'pending' to 'ready'
3. **Unlocks locked earnings** that have available balance and passed settlement date
4. **Returns summary** of updated records

## Monitoring

Check Vercel Logs for cron execution:
1. Go to Vercel Dashboard
2. Select your project
3. Click "Functions" or "Logs"
4. Filter by `/api/cron/update-settlement-status`

Look for these log entries:
- `🕐 Starting settlement status update cron job...`
- `📊 Found X earnings ready for settlement`
- `✅ Updated earnings for event {eventId}`
- `🎉 Cron job completed`

## Troubleshooting

**Cron not running:**
- Verify vercel.json is deployed
- Check CRON_SECRET is set in environment variables
- View logs in Vercel dashboard

**Updates not happening:**
- Check `settlementReadyDate` format (must be ISO string)
- Verify `settlementStatus` is 'pending'
- Check Firestore indexes are deployed

**Manual trigger:**
```bash
# From your local environment
curl -X POST http://localhost:3000/api/cron/update-settlement-status \
  -H "Authorization: Bearer your-local-secret"
```

## Alternative Schedulers

### Google Cloud Scheduler
```bash
gcloud scheduler jobs create http update-settlement \
  --schedule="0 2 * * *" \
  --uri="https://your-domain.com/api/cron/update-settlement-status" \
  --http-method=GET \
  --headers="Authorization=Bearer YOUR_CRON_SECRET"
```

### GitHub Actions
Create `.github/workflows/cron-settlement.yml`:
```yaml
name: Update Settlement Status
on:
  schedule:
    - cron: '0 2 * * *'
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - name: Call Cron Endpoint
        run: |
          curl -X GET ${{ secrets.APP_URL }}/api/cron/update-settlement-status \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

## Schedule Recommendations

- **Production**: Daily at 2 AM UTC (low traffic time)
- **Testing**: Every hour during development
- **High Volume**: Multiple times per day (every 6 hours)

Adjust schedule in vercel.json:
```json
"schedule": "0 */6 * * *"  // Every 6 hours
"schedule": "0 2 * * *"     // Daily at 2 AM
"schedule": "0 * * * *"     // Every hour
```

## Next Steps

1. ✅ Add CRON_SECRET to Vercel environment variables
2. ✅ Deploy to Vercel (cron is already configured in vercel.json)
3. ✅ Monitor first execution in logs
4. ✅ Verify earnings status updates correctly
