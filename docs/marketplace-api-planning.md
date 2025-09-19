# Marketplace API Planning

This document captures the upcoming `/api/marketplace` endpoint that will expose curated design inventory to different client roles. The goal is to ensure both frontend and backend contributors understand the query contract before implementation lands.

## Endpoint Overview

- **Route**: `GET /api/marketplace`
- **Query parameters**:
  - `role` (optional): Limits the dataset to the caller's intended persona. Supported values will include `creator`, `consumer`, and `admin`. Requests without a `role` parameter default to the authenticated user's role as resolved by the session/JWT middleware.
  - Additional filters (e.g., `category`, `search`) will be layered on in later iterations once the role-aware scaffolding is in place.
- **Response envelope**:

  ```json
  {
    "role": "creator",
    "data": [
      {
        "id": "dsgn_001",
        "title": "Art Deco Announcement",
        "thumbnailUrl": "https://cdn.example.com/designs/dsgn_001_thumb.jpg",
        "designer": {
          "id": "user_9",
          "displayName": "River Studio"
        },
        "badges": ["featured", "new"],
        "priceCents": 1299
      }
    ]
  }
  ```

  The `role` field echoes the applied filter so the UI can confirm which persona view it is rendering. Each design payload will be trimmed to fields that make sense for the marketplace grid; future revisions may include analytics snippets (e.g., `conversionRate`) depending on the authenticated role.

## Authorization & Access Control

- All marketplace traffic continues to require a valid session or bearer token. Public, unauthenticated access is out of scope for this phase because design metadata may expose embargoed templates.
- The API should reuse the existing `authenticate()` helper and gracefully reject unknown roles with `400 Bad Request` to avoid leaking role experimentation to general users.
- Admin callers can explicitly request any supported role via `?role=...` so dashboards can preview user experiences. Non-admin callers may only request their own role; attempting to override it should return `403 Forbidden`.
- Downstream filtering inside the store module must also enforce ownership/visibility rules. For example, a `creator` role should only see designs they manage or designs flagged as `creatorVisible`, while a `consumer` role should be limited to listings approved for storefront display.

## Server Implementation Plan

To support the role-based filter, the following code updates are planned:

### `server/index.js`

1. **Parse the query string** on `/api/marketplace` requests so the handler can read an optional `role` parameter.
2. **Resolve the effective role** by defaulting to the authenticated user's role and only honoring the query override when the caller is an admin. Unknown role values should trigger a `400` response.
3. **Pass the role filter into the store** by invoking a new `getMarketplaceDesigns({ role, ...filters })` helper (described below) and forward its structured payload (`{ role, data }`).
4. **Normalize error handling** so authorization failures (`403`) and validation issues (`400`) are surfaced before reaching the store layer, keeping the store focused on data shaping.
5. **Update rate limiting and analytics hooks** (if applicable) to include the resolved role in their logging contexts so usage dashboards can distinguish between creator and consumer traffic.

### `server/designs-store.js`

1. **Add a dedicated `getMarketplaceDesigns` export** that accepts a filter object containing `role`, `category`, and `search` keys. The function should derive the relevant subset from the existing `designs` map without mutating it.
2. **Gate designs by visibility flags**: introduce or reuse metadata such as `design.visibility` or `design.roles` to ensure each role only receives authorized listings. The helper should fall back to the prior user-based ownership checks (`withDesignOwnership`) when the role is `creator`.
3. **Shape the response records** to include nested designer info, pricing, badges, and any other marketplace-facing properties while omitting internal analytics fields that do not apply to the requested role.
4. **Expose lightweight metrics hooks** (e.g., returning `conversionRate` only for admin/admin-preview calls) so higher-privilege roles gain deeper insights without complicating the API contract for consumers.
5. **Maintain backward compatibility** by leaving the existing `getDesignsByUser` flow untouched; new marketplace logic should live alongside current exports to avoid regressions in authenticated design dashboards.

Implementation work will begin once the above contract is signed off, ensuring both the HTTP surface and the data layer support role-aware marketplace browsing.
