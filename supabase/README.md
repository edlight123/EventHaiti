# Supabase Setup Instructions

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization and fill in:
   - Project name: `eventhaiti` (or your preferred name)
   - Database password: (generate a strong password and save it)
   - Region: Choose closest to Haiti (US East recommended)
4. Click "Create new project" and wait for it to provision

## 2. Run Database Schema

1. In your Supabase dashboard, go to the SQL Editor
2. Click "New Query"
3. Copy and paste the entire contents of `/supabase/schema.sql`
4. Click "Run" or press `Ctrl+Enter`
5. Verify that all tables were created successfully

## 3. Configure Environment Variables

1. In your Supabase dashboard, go to Settings → API
2. Copy your project URL and anon/public key
3. Create a `.env.local` file in the root of your project:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Replace `your_project_url_here` and `your_anon_key_here` with your actual values.

## 4. Optional: Enable Storage for Event Banners

If you want to enable image uploads for event banners:

1. Go to Storage in your Supabase dashboard
2. Create a new bucket called `event-banners`
3. Set it to public
4. Add the following RLS policy:

```sql
-- Allow authenticated users to upload images
CREATE POLICY "Organizers can upload event banners"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-banners' AND
  auth.role() = 'authenticated'
);

-- Allow anyone to view images
CREATE POLICY "Anyone can view event banners"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-banners');
```

## 5. Verify Setup

Run your Next.js app:

```bash
npm install
npm run dev
```

The app should now connect to your Supabase backend!

## Troubleshooting

- If you get "Invalid API key" errors, double-check your `.env.local` file
- If RLS policies aren't working, make sure you're authenticated
- Check the Supabase logs in the dashboard for any database errors
