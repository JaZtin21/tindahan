# Tindahan (Sari-Sari Store) App — PRD (MVP)

## Problem
Customers often walk around (or message multiple people) to find a specific item. Sari-sari store owners often rely on memory and ad-hoc restocking, so **availability is unclear** and **demand signals are weak**.

## Vision
Bridge the gap between customers and sari-sari store owners by making **nearby availability searchable** and **demand visible**, so:
- customers find what they need faster (and cheaper, by avoiding farther/more expensive options)
- store owners restock smarter and attract more nearby customers

## Target users (personas)
- **Customer**
  - Goals: find an item quickly; minimize walking distance/cost; trust availability
  - Pain points: “out of stock” after traveling; uncertain store hours/location
- **StoreOwner**
  - Goals: keep inventory organized; understand demand; increase sales; reduce dead stock
  - Pain points: manual tracking; no easy way to advertise what’s available nearby
- **Admin (later / minimal in MVP)**
  - Goals: prevent abuse, handle reports, moderate reviews

## MVP scope
### Customer-facing
- **Map discovery**
  - View nearby stores on a map
  - Tap a store marker to see store profile + available items
- **Item search (near me)**
  - Search by item name/category
  - Results ordered by distance with “in stock” visibility
- **Item request**
  - Request an item from a store (or “nearest stores” if store not chosen)
  - Track request status (pending/accepted/declined/fulfilled)
- **Reviews**
  - Rate and review a store

### StoreOwner-facing
- **Store profile**
  - Create/edit store profile (name, description, hours, contact)
  - Pin store location on the map
  - Upload banner/profile photo (MVP can be 1 banner image)
- **Inventory management**
  - Add items (from a canonical catalog when possible)
  - Mark in-stock/out-of-stock (quantity is optional in MVP)
  - Update price (optional but useful)
  - Track “last updated” timestamp (shown to customers)
- **Request management**
  - View incoming requests
  - Accept/decline/mark fulfilled
  - Optionally convert frequent requests into inventory items

## Out of scope (v1 non-goals)
- Payments, delivery logistics, rider dispatch
- Real-time chat (use request notes + owner response status first)
- Complex promotions/loyalty, advanced analytics
- Multi-branch chains and enterprise inventory features

## Core user stories (MVP)
### Customer
- As a customer, I can search “pancit canton” and see the nearest stores that have it in stock.
- As a customer, I can open a store profile and view available items, store hours, and reviews.
- As a customer, I can request an item from a store and get a response (accepted/declined).

### StoreOwner
- As an owner, I can pin my store’s location so nearby customers can find me.
- As an owner, I can update my inventory quickly (toggle in-stock/out-of-stock).
- As an owner, I can see what customers request most to guide restocking.

## Key product decisions (MVP defaults)
- **Maps**: Google Maps JavaScript API for map UI and geocoding.
- **Availability model**: “In stock” boolean + `last_updated` (quantities optional).
- **Trust cues**: show inventory last updated time; show review count + average rating.
- **Cold-start mitigation**: allow owners to create store + inventory with minimal friction; allow customers to request items even if inventory is incomplete.

## Risks & mitigations
- **Stale inventory**
  - Mitigation: show “last updated”; nudge owners; optionally auto-expire “in stock” after N days without updates.
- **Location accuracy / fake stores**
  - Mitigation: basic verification later (phone/OTP); report store; admin review.
- **Spam requests / abuse**
  - Mitigation: rate limits; per-user request quotas; report/block.

## Success metrics (MVP)
- **Activation**
  - % of owners who create a store and add at least 10 inventory items
  - % of customers who perform a search and open a store profile
- **Search usefulness**
  - Search-to-store-click rate
  - “Found item” proxy: request accepted rate or store visit intent (later)
- **Supply-side engagement**
  - Inventory update frequency per owner per week
  - Request response time (median)
- **Retention**
  - WAU/MAU for customers and owners

## MVP launch checklist (documentation-level)
- Minimum viable moderation: report store/review, basic admin tools (even if manual)
- Backups + basic observability (logs, error tracking)
- Google Maps API key management (separate dev/prod keys)

---

## Development Progress (Updated March 11, 2026)

### ✅ Completed Features

#### Theme System
- **Dark/Light Mode Toggle**: Fully functional theme switching with emoji icons (🌙/☀️)
- **Theme Persistence**: Theme preference saved to localStorage and restored on page refresh
- **Tailwind CSS v4 Integration**: Proper dark mode configuration with `@custom-variant dark`
- **Scalable Architecture**: Modular Redux store and component structure

#### Frontend Architecture
- **Redux Store**: Modular slice-based state management with localStorage persistence
- **Component Structure**: Organized folder hierarchy for scalability
- **Navigation**: Extracted TopNav component from App layout
- **Theme Components**: Dedicated theme management folder

### 📁 Current Frontend Structure

```
frontend/src/
├── store/                    # Redux store configuration
│   ├── index.ts              # Main store setup & exports
│   └── slices/               # Redux slices
│       ├── index.ts          # Slice exports
│       ├── userSlice.ts      # User state management
│       ├── themeSlice.ts     # Theme state (with localStorage)
│       └── locationSlice.ts  # Location state
├── theme/                    # Theme system components
│   ├── index.ts              # Theme exports
│   ├── ThemeProvider.tsx     # Theme management & localStorage
│   └── ThemeToggle.tsx       # Theme toggle button
├── components/               # UI components
│   └── navigation/           # Navigation components
│       ├── index.ts          # Navigation exports
│       └── TopNav.tsx        # Header navigation with theme toggle
├── pages/                    # Page components
│   ├── HomePage.tsx          # Home page
│   ├── MapPage.tsx           # Map discovery page (placeholder)
│   └── OwnerPage.tsx         # Store owner page (placeholder)
├── routes/                   # Routing configuration
│   ├── AppNavigator.tsx      # Main router setup
│   └── router.tsx           # Route definitions
├── app/                      # App configuration
│   └── apollo.ts             # GraphQL client setup
├── style.css                 # Global styles & Tailwind v4 config
├── App.tsx                   # Main app layout
└── main.tsx                  # App entry point
```

### 🔧 Technical Implementation Details

#### Redux Theme Management
- **localStorage Integration**: Theme preference loaded on store initialization
- **Persistence**: Automatic save on theme change
- **No Override Issues**: Store respects saved theme on page refresh

#### Tailwind CSS v4 Dark Mode
- **Configuration**: `@custom-variant dark` in CSS file
- **Class-based**: Uses `dark:` prefix for theme-aware styling
- **Smooth Transitions**: Built-in transition animations

#### Component Architecture
- **Separation of Concerns**: Theme, navigation, and layout components separated
- **Scalable Structure**: Easy to add new features and components
- **Clean Imports**: Barrel exports for clean import statements

### 🚀 Next Development Steps

#### Immediate (Map Integration)
- [ ] Google Maps JavaScript API integration
- [ ] Store marker display on map
- [ ] Store profile popups on marker click
- [ ] Item search functionality
- [ ] Distance-based result ordering

#### User Management
- [ ] Authentication system (GraphQL + Apollo)
- [ ] User profile management
- [ ] Store owner registration
- [ ] Customer vs owner role management

#### Store Management
- [ ] Store creation and editing
- [ ] Location pinning on map
- [ ] Inventory management interface
- [ ] Item catalog integration

#### Request System
- [ ] Item request creation
- [ ] Request status tracking
- [ ] Owner request management
- [ ] Request notifications

### 📊 Current Development Status

**Frontend Foundation**: ✅ Complete
- Theme system fully functional
- Scalable architecture established
- Component structure organized
- Redux state management working

**Core Features**: 🚧 In Progress
- Map integration needed
- User authentication pending
- Store management pending
- Request system pending

**Technical Debt**: ✅ Clean
- No major refactoring needed
- Code organized and scalable
- Follows React best practices
- TypeScript properly configured
