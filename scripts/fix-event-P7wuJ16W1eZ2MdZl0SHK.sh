#!/bin/bash

# Migration script to fix ticket tiers for event P7wuJ16W1eZ2MdZl0SHK
# Run this after deployment completes

echo "Fixing ticket tiers for event P7wuJ16W1eZ2MdZl0SHK..."

curl -X POST https://eventhaiti.vercel.app/api/admin/fix-ticket-tiers \
  -H "Content-Type: application/json" \
  -d '{"eventId":"P7wuJ16W1eZ2MdZl0SHK"}' \
  -b "$(curl -s https://eventhaiti.vercel.app/api/auth/session | grep -o 'session=[^;]*')"

echo ""
echo "Migration complete! Check the event page now."
