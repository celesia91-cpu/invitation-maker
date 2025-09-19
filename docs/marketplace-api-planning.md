# Marketplace API

The `/api/marketplace` endpoint surfaces curated design inventory to authenticated clients while enforcing role-aware visibility.

## Request contract

- **Method**: `GET`
- **Path**: `/api/marketplace`
- **Query parameters**:
  - `role` (optional): Preview results for a specific persona. The server defaults to the authenticated user's role, treating the legacy `user` role as the `consumer` marketplace view. Admins may supply any supported value; non-admin callers receive `403 Forbidden` if they try to override their own role. Unknown roles return `400 Bad Request`.
  - `category` (optional): Narrows listings to a specific category id. Values must match `^[\w-]+$` once trimmed.
  - `search` (optional): Case-insensitive substring match applied to titles, categories, and designer display names. Queries longer than 100 characters are rejected to keep lookups inexpensive.

## Authorization behaviour

All marketplace calls require a valid session or bearer token. The server resolves the effective role before consulting the data layer:

1. Authenticate the caller via the existing JWT helper.
2. Derive the baseline role from the JWT payload (`user` values are mapped to `consumer`).
3. Allow admins to preview other roles via `?role=...`; other callers are restricted to their own role.
4. Reject unrecognised roles with `400` before querying the store.

## Response shape

The handler forwards the structured payload produced by `getMarketplaceDesigns({ role, category, search })` in `server/designs-store.js`:

```json
{
  "role": "consumer",
  "data": [
    {
      "id": "3",
      "title": "Premium Event Template",
      "thumbnailUrl": "/images/corporate-thumb.png",
      "category": "corporate",
      "badges": ["premium", "new"],
      "priceCents": 2499,
      "premium": true,
      "designer": {
        "id": "studio-omega",
        "displayName": "Studio Omega"
      }
    }
  ]
}
```

### Role-specific fields

- **Creators** receive a `flags` object describing admin template metadata (`isAdminTemplate`, `managedByAdminId`).
- **Admins** receive additional insights: the raw visibility map (`creator`, `consumer`, `admin` flags), `managedByAdminId`, and the latest conversion rate pulled from the analytics store.

### Visibility rules

`getMarketplaceDesigns` filters the in-memory `designs` map using the per-role visibility flags stored on each design record:

- `creator` view includes designs marked `visibility.creator`.
- `consumer` view includes designs marked `visibility.consumer`.
- `admin` view bypasses visibility checks but still reports the visibility matrix for auditing.

Category and search filters are applied after the visibility check. Results are sorted by design id for deterministic responses, and prices are normalised into `priceCents` integers. Designer metadata is derived from the ownership map so marketplace cards can display consistent attribution.

## Tests

`server/__tests__/marketplace.test.js` exercises the helper to confirm consumer, creator, and admin roles each receive the expected listings and that unsupported roles are rejected. The admin test also verifies conversion rates are surfaced when analytics data exists.
