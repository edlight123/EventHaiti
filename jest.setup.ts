import '@testing-library/jest-dom'

// Set up test encryption key (32 bytes = 44 chars base64)
// This is a dummy key for testing only - never use in production
process.env.PAYOUT_DETAILS_ENCRYPTION_KEY = 'wYp6EYT6yLJiU9EJrfTe/cawmj5uq5TW7QDfmyMqqo8='
