# Admin Analytics - Quick Reference Guide

## 🎯 What's New

The admin analytics page at `/admin/analytics` now features a comprehensive dashboard with 6 main sections:

## 📊 Sections

### 1. Overview Tab
**What you'll see:**
- Revenue snapshot with key metrics
- Recent user growth (last 7 days)
- Top performing events
- Conversion funnel visualization
- Top organizer rankings

**Use case:** Quick daily check of platform health

---

### 2. Revenue Tab
**What you'll see:**
- Total revenue (USD with FX spread)
- Multi-currency breakdown (HTG & USD)
- Payment method analysis (Stripe, MonCash, NatCash)
- FX spread profit tracking
- Exchange rate analytics
- **NEW:** Time range filters (All Time, 7d, 30d, 90d)

**Use case:** Financial reporting and revenue tracking

---

### 3. User Growth Tab
**What you'll see:**
- Line chart showing daily signups
- Total users, attendees, and organizers counts
- Percentage breakdowns
- Period selectors (7, 14, 30, 60, 90 days)
- Growth trends visualization

**Use case:** Monitor user acquisition and retention

---

### 4. Events Tab
**What you'll see:**
- **Top 10 Events** ranked by success score (0-100)
  - Success score based on: sales%, reviews, favorites, recency
  - Visual progress circles
  - Links to event pages
- **Category Popularity**
  - Last 30 days ticket sales by category
  - Percentage bars
  - Ticket counts

**Use case:** Identify successful event patterns and popular categories

---

### 5. Conversion Tab
**What you'll see:**
- Overall conversion rate (views → purchases)
- **Funnel stages:**
  1. Event Views (estimated)
  2. Favorites (actual)
  3. Purchases (actual)
- Stage-by-stage conversion rates
- Visual funnel with progress bars
- Conversion insights

**Use case:** Optimize user journey and increase conversions

---

### 6. Organizers Tab
**What you'll see:**
- Top 10 organizers by ticket sales
- Medal badges for top 3 performers
- Per organizer:
  - Total tickets sold
  - Number of events
  - Average rating
  - Average tickets per event
- Summary statistics

**Use case:** Identify top performers and opportunities for growth

---

## 🎨 Visual Features

- **Interactive Charts:** Line charts with Recharts for smooth animations
- **Color-Coded Metrics:** Easy-to-scan gradient cards
- **Progress Indicators:** Circular and bar progress visualizations
- **Responsive Design:** Works on desktop, tablet, and mobile
- **Icon System:** Lucide icons for visual hierarchy
- **Loading States:** Spinners for better UX
- **Empty States:** Helpful messages when no data exists

---

## 🔧 Technical Details

### API Endpoints
```
GET /api/admin/analytics-data?type=user-growth&days=30
GET /api/admin/analytics-data?type=top-events&limit=10
GET /api/admin/analytics-data?type=categories&days=30
GET /api/admin/analytics-data?type=conversion&days=30
GET /api/admin/analytics-data?type=organizers&limit=10
GET /api/admin/analytics-data?type=overview
```

### Components Structure
```
app/admin/analytics/page.tsx
  └─ AdminAnalyticsTabs.tsx (main tabs component)
      ├─ AdminRevenueAnalytics.tsx (with time filters)
      ├─ UserGrowthAnalytics.tsx (with line chart)
      ├─ EventPerformanceAnalytics.tsx (rankings + categories)
      ├─ ConversionFunnelAnalytics.tsx (funnel visualization)
      └─ OrganizerRankingsAnalytics.tsx (top performers)
```

---

## 📈 Key Metrics Explained

### Success Score (Events)
Calculated as:
- **40 points:** Ticket sales % (tickets sold / capacity)
- **30 points:** Average review rating (out of 5)
- **20 points:** Favorites count (normalized)
- **10 points:** Recency bonus (upcoming events)

### Conversion Rates
- **Favorite Rate:** (Favorites / Views) × 100
- **Purchase Rate:** (Purchases / Favorites) × 100
- **Overall Conversion:** (Purchases / Views) × 100

### User Types
- **Attendees:** Regular users who purchase tickets
- **Organizers:** Users who create and manage events

---

## 💡 Tips

1. **Start with Overview** for a quick daily snapshot
2. **Use Revenue filters** to analyze specific time periods
3. **Check User Growth** weekly to track acquisition trends
4. **Review Events tab** to understand what's working
5. **Monitor Conversion** to optimize marketing efforts
6. **Recognize top Organizers** for partnerships/incentives

---

## 🚀 Navigation

1. Go to `/admin/analytics`
2. Click any tab to switch views
3. Use time filters where available
4. Click on links to drill into details
5. All data auto-refreshes every 2 minutes

---

## ⚡ Quick Stats

- **6 Main Tabs** for different analytics views
- **5 New Components** with rich visualizations
- **1 New API Route** with 6+ endpoints
- **Interactive Charts** with Recharts
- **Mobile Responsive** design throughout
- **Real-time Filters** for time-based analysis

Enjoy your comprehensive analytics dashboard! 🎉
