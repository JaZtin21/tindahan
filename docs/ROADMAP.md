# Roadmap — Tindahan

## Guiding principles
- **Inventory freshness over complexity**: add features that increase accuracy and updates.
- **Trust and safety early**: verification and reporting before “marketplace money”.
- **Geospatial + catalog foundations first**: these support everything later (orders, delivery, promos).

## v1 (MVP) — Map + Inventory + Requests
Deliverables:
- Store owner can create store, pin location, upload banner
- Owner can manage inventory (in-stock + last-updated, optional price)
- Customer can search item near location and see nearest stores
- Customer can create item requests; owner can accept/decline/fulfill
- Reviews and rating summary

Operational focus:
- Simple moderation: report store/review (manual admin)
- Abuse prevention: rate limits, request quotas
- Observability: logs + basic metrics

## v1.1 — Quality & retention
Improve usefulness and reduce staleness:
- Inventory “freshness nudges” for owners
- Suggested restock list from request frequency
- Better search matching (synonyms, spelling tolerance)
- Store hours + “open now” indicator
- Saved/favorite stores and recent searches

## v1.2 — Trust & verification
Reduce fake listings and improve confidence:
- Owner phone verification (OTP)
- Store verification options (community validation, admin verification badge)
- Review integrity: prevent spam, limit to verified users, detect duplicates
- Customer safety: report/block store; store can block abusive users

## v2 — Orders (pickup-first)
Introduce commerce carefully:
- “Reserve for pickup” orders (no delivery yet)
- Order statuses: pending/confirmed/ready/collected/cancelled
- Optional payment: cash on pickup (start), then online payments
- Owner lightweight order management

Key prerequisite:
- Stronger inventory model for ordered items (quantity + reservation holds)

## v2.1 — Payments (optional, region/legal dependent)
Options:
- Cash on pickup as default
- Online payments via local provider integration

Risks:
- chargebacks/disputes
- compliance and KYC for payouts (if platform handles money)

## v3 — Delivery + logistics (only if validated)
If demand exists:
- Customer chooses delivery
- Rider/partner integration (or third-party delivery APIs)
- Delivery fee estimation, tracking, proof of delivery

## v4 — Growth features
- Promotions: featured items, bundles, time-based deals
- Loyalty: stamps, points
- Insights for owners: best-sellers, demand heatmap
- Multi-branch stores and staff accounts

## Tech roadmap (supporting evolution)
- OpenAPI spec + generated client for frontend
- Background jobs (e.g., reminders, summary emails) via a job runner
- Optional realtime updates (SSE/WebSockets) for request/order status
- Search upgrade path:
  - Postgres trigram/FTS first
  - Later: dedicated search (Meilisearch/Elasticsearch) if needed

## “Kill criteria” (when to stop/redirect)
- If owners don’t update inventory weekly even with nudges, shift emphasis to:
  - request-based demand + “confirm availability” flows
  - lighter-weight “usually has this item” heuristics
- If customers don’t trust listings, prioritize verification and freshness cues over new features.

