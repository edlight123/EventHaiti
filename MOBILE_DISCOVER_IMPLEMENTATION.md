# PWA Discover Page - Complete Feature Documentation

## Current Implementation Status: 🔄 In Progress

---

## 1. TOP BAR / HEADER SECTION ✅ Implemented

### Components:
- **Search Bar** with icon ✅
  - Full-width search input
  - Search icon on the left
  - Real-time search (filters as you type)
  - Placeholder: "Search events, venues, categories..."
  - Filters events by: title, description, venue_name, city, category
  
- **Location Dropdowns** ❌ Not Yet
  - City selector dropdown
  - Subarea/Commune selector (appears if city selected)
  - MapPin icon
  - Shows current selection or "All Cities"
  
- **Filter Button** ✅
  - SlidersHorizontal icon
  - Shows count badge when filters active
  - Opens comprehensive filters modal (modal UI pending)
  - Positioned next to search bar

---

## 2. ACTIVE FILTERS CHIPS ROW ✅ Implemented

### Features:
- **Filter Chips Display** ✅
  - Shows each active filter as a removable chip
  - X icon to remove individual filter
  - Date filter (if not "any")
  - City filter
  - Search query filter
  - Each selected category
  - Price filter (pending)
  - Event type filter (pending)
  
- **Clear All Button** ✅
  - Appears when any filters active
  - Removes all filters at once
  - Red/error color styled

---

## 3. DATE FILTER CHIPS ✅ Implemented

### Current Implementation:
- Label: "WHEN" (uppercase, small, gray)
- Horizontal scrollable chips
- Options:
  - Any Time
  - Today
  - Tomorrow
  - This Week
  - This Weekend
  - Next Week
- Single selection
- Active chip highlighted in primary color

---

## 4. FEATURED CAROUSEL ✅ Implemented

### Features:
- Only shows when NO active filters
- Title: "⭐ Featured This Weekend"
- Subtitle: "The most popular events"
- Uses FeaturedCarousel component
- Shows top 6 events by tickets_sold
- Card-based horizontal scroll

---

## 5. CATEGORY FILTER CHIPS ✅ Implemented

### Current Implementation:
- Label: "CATEGORIES" (uppercase, small, gray)
- Horizontal scrollable chips
- Multi-select enabled
- Categories:
  - Music
  - Sports
  - Arts & Culture
  - Food & Drink
  - Business
  - Technology
  - Health
  - Education
  - Other
- Active chips highlighted in primary color

---

## 6. EVENT SECTIONS (When No Filters) ✅ Fully Implemented

### A. Happening Soon Section ✅ Implemented
- Title: "🔥 Happening Soon"
- Subtitle: "Don't miss these upcoming events"
- Shows next 8 events sorted by date
- **Horizontal scrollable carousel** (280px cards)
- Premium PWA-style cards with images, badges, icons

### B. Near You Section ⚠️ Logic Ready
- Title: "📍 Near You"
- Subtitle: Shows city and commune if set
- Only appears if user location is set
- Filters events by user's city/commune
- State and filtering ready (UI shows when city selected)

### C. Budget Friendly Section ✅ Implemented
- Title: "💰 Budget Friendly"
- Subtitle: "Events under 500 HTG"
- Shows events with ticket_price <= 500
- Up to 8 events
- **Horizontal scrollable carousel**

### D. Online Events Section ✅ Implemented
- Title: "💻 Online Events"
- Subtitle: "Join from anywhere"
- Filters events where:
  - event_type === 'online' OR
  - venue_name includes 'online'
- Up to 8 events
- **Horizontal scrollable carousel**

---

## 7. FILTERED RESULTS VIEW ✅ Implemented

### When Filters Active:
- Shows "Filtered Results" title
- Shows event count: "X events found"
- Displays all matching events
- Empty state if no matches:
  - Icon: 🔍
  - Title: "No events found"
  - Message: "Try adjusting your filters to see more events"

---

## 8. EVENT CARDS ✅ Implemented

### Card Features:
- Banner image
- Category badge overlay (top-left)
- Event title (2 lines max)
- Calendar icon + formatted date
- MapPin icon + venue and city
- Price OR "FREE" badge
- Tap to navigate to EventDetail

---

## 9. COMPREHENSIVE FILTERS MODAL ✅ Fully Implemented

### Modal Sections:

#### A. Date & Time ✅ (Via Date Chips Above)
- Integrated with date filter chips
- Options: Any time, Today, Tomorrow, This week, This weekend, Next week

#### B. Location ✅
- Radio options for all Haiti cities:
  - All Cities (default)
  - Port-au-Prince
  - Cap-Haïtien
  - Gonaïves
  - Les Cayes
  - Pétion-Ville
  - Jacmel
  - Saint-Marc
  - Delmas
  - Carrefour
  - Port-de-Paix
  - Jérémie
  - Hinche

#### C. Categories ✅ (Via Category Chips Above)
- Multi-select via category chips
- All 9 categories: Music, Sports, Arts & Culture, Food & Drink, Business, Technology, Health, Education, Other

#### D. Price Range ✅
- Radio options:
  - Any price
  - Free
  - Under 500 HTG
  - 500-1000 HTG
  - 1000-2500 HTG
  - Over 2500 HTG

#### E. Event Type ✅
- Radio options:
  - All events
  - In-person
  - Online

#### F. Sort By ❌ Not Implemented
- Pending: Relevance, Date, Price, Popularity sorting

### Modal Actions: ✅
- Apply Filters button (closes and applies)
- Reset button (clears modal filters only)
- Close X button

---

## 10. SEARCH FUNCTIONALITY ❌ Not Implemented

### Features:
- Real-time or on-submit search
- Searches across:
  - Event title
  - Event description
  - Venue name
  - City
  - Category
- Case-insensitive
- Maintains other active filters
- Shows in URL as `?search=query`

---

## 11. LOCATION DETECTION ❌ Not Implemented

### Features:
- Detects user's city from profile
- Auto-populates "Near You" section
- Shows location in top bar
- Allows manual override

---

## 12. "SEE ALL" LINKS ❌ Not Implemented

### Features:
- Each section has "See All" link
- Links navigate to filtered view:
  - Happening Soon: `?date=this-week`
  - Near You: `?city={city}`
  - Budget: `?price=%3C%3D500`
  - Online: `?eventType=online`
- Maintains current filters when clicking

---

## 13. EMPTY STATES ✅ Implemented

### Two Types:
- **No Filters, No Events**: 
  - Icon: 📅
  - "No events available"
  - "Check back later"
  
- **Filters Active, No Results**:
  - Icon: 🔍
  - "No events found"
  - "Try adjusting your filters"

---

## IMPLEMENTATION PRIORITY ORDER

### Phase 1: Essential UI (Current)
1. ✅ Date filter chips
2. ✅ Category chips (multi-select)
3. ✅ Featured carousel
4. ✅ Basic event sections
5. ✅ Event cards
6. ✅ Empty states

### Phase 2: Search & Top Bar ✅ COMPLETED
7. ✅ Search bar in header
8. ✅ Active filters chips row
9. ⚠️ Location dropdowns (city/commune) - State ready, UI pending
10. ✅ Filter button with badge

### Phase 3: Advanced Filtering ✅ COMPLETED (except sort)
11. ✅ Comprehensive filters modal
12. ✅ Price range filters (6 options)
13. ✅ Event type filters (All, In-person, Online)
14. ❌ Sort options (pending)

### Phase 4: Location Features
15. ❌ "Near You" section
16. ❌ User location detection
17. ❌ Location-based filtering

### Phase 5: Navigation & Polish
18. ❌ "See All" links
19. ❌ URL parameter sync
20. ❌ Smooth transitions/animations

---

## TECHNICAL NOTES

### Data Fetching:
- PWA uses `getDiscoverEvents()` with 30s caching
- Firestore query: `is_published === true` + `orderBy('start_datetime')`
- Filters applied client-side after fetch
- Mobile should match this pattern

### State Management:
- URL params as source of truth (PWA)
- Mobile uses local state
- Need to implement URL-based routing for deep linking

### Performance:
- PWA uses Suspense for loading states
- Lazy load images
- Pagination not implemented (loads 200 max)

