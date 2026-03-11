# UX flows (MVP) — Tindahan

## Primary surfaces
- **Customer mode**: search + map + store profile + request flow
- **Owner mode**: store setup + inventory management + requests inbox

## Customer journeys

### Journey A: “Find nearest store with item”
1. **Landing / Map**
   - Shows map centered on user location (permission request).
   - Search bar: “Search item (e.g., eggs, noodles)”
2. **Search results (map + list)**
   - Markers for matching stores.
   - List view sorted by distance.
   - Each result shows:
     - store name + banner thumbnail
     - distance (m/km)
     - stock indicator (in stock / uncertain)
     - “Updated X ago” (inventory staleness cue)
3. **Store profile**
   - Banner photo, store name, rating summary, hours/contact (if provided)
   - “Available items” section (filterable)
   - Primary action: **Request item**

Acceptance criteria:
- Searching “pancit canton” within 2km returns stores ordered by distance.
- Each store shows last inventory update time (or “not updated yet”).

### Journey B: “Request an item”
1. From store profile (or search result quick action), tap **Request item**
2. **Request form**
   - Item (pre-filled if coming from search; otherwise choose from catalog or free-text)
   - Quantity (optional)
   - Note (optional): “Please reserve until …”
3. **Request status screen**
   - Status chips: pending / accepted / declined / fulfilled / cancelled
   - Owner response notes (when present)

UX notes:
- Keep request creation friction low; don’t require phone number in MVP.
- Show expected behavior: “Owner usually responds within X hours” (later: personalized).

### Journey C: “Leave a review”
1. From store profile: tap **Write review**
2. Rate 1–5 + optional text
3. Review is visible in store profile review list

## Store owner journeys

### Journey D: “Create store and pin location”
1. **Owner onboarding**
   - Role selection: Customer / StoreOwner (or “Switch to owner mode”)
2. **Create store**
   - Store name, description
   - Address input + map pin
   - Banner upload (optional)
3. **Confirmation**
   - Store appears on map
   - Prompt: “Add your first items”

Acceptance criteria:
- Owner can set location by dropping a pin or typing address.
- Store is searchable once created (if active).

### Journey E: “Manage inventory quickly”
1. **Inventory dashboard**
   - Search/add catalog items (autocomplete)
   - Table/list of inventory items
2. **Fast update interactions**
   - Toggle “In stock” on/off
   - Optional price field
   - “Last updated” auto-updates on change

UX notes:
- Default to boolean stock; quantities can be added later without breaking UX.
- Provide a one-tap “Mark all as checked today” (optional) to encourage freshness.

### Journey F: “Handle item requests”
1. **Requests inbox**
   - Tabs/filters: pending, accepted, declined, fulfilled
   - Each row shows item, qty, customer name, time
2. **Request detail**
   - Accept/decline/fulfilled actions
   - Optional response note: “Yes, available until 5pm”
3. **Optional inventory tie-in**
   - If item is repeatedly requested, quick action: “Add to inventory”

Acceptance criteria:
- Owner can accept/decline/fulfill a request and customer sees status update.

## Key screens (MVP)
### Customer
- Map + search bar
- Search results list (synced with map)
- Store profile (items + request CTA)
- Request status list/detail
- Reviews list + review form

### Owner
- Store setup/edit
- Inventory list + add item modal
- Requests inbox + request detail

## UX trust cues (critical)
- Always show **inventory last updated** in customer views.
- If last updated exceeds a threshold (e.g. 7 days), label as **“May be outdated”**.
- For stores without inventory entries, show **“Inventory not set yet — you can request items”**.

