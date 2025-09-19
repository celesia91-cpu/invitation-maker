# Navigation UI State Persistence Plan

## Overview
The navigation UI needs a lightweight persistence layer so users can resume where they left off (e.g., which section is active, which panels are collapsed, and their recent destinations). This document proposes HTTP endpoints that follow the patterns already used in `server/index.js` and outlines the data model and storage concerns so the feature can be implemented later.

## Proposed Endpoints
| Method & Path | Description | Auth | Expected Placement in `server/index.js` |
| --- | --- | --- | --- |
| `GET /api/navigation/state` | Returns the last saved navigation state for the authenticated user. Responds with defaults if no state has been saved. | Required (`authenticate(req)`) | Add after the existing `/api/user/tokens` handler because it is another user-scoped fetch that only requires authentication. |
| `PUT /api/navigation/state` | Upserts the navigation state for the authenticated user. Replaces the full state document with the payload provided by the client. | Required (`authenticate(req)`) | Add immediately after the corresponding `GET /api/navigation/state` handler so both routes stay grouped. |
| `PATCH /api/navigation/state` *(optional)* | Allows partial updates (e.g., saving the new `currentSection` without resending history). If omitted, the client can use `PUT` instead. | Required (`authenticate(req)`) | If implemented, colocate with the other navigation state routes. |

### Request/Response Contract
- **GET** returns:
  ```json
  {
    "state": {
      "currentSection": "browse",
      "lastVisited": ["/designs/7", "/designs/12"],
      "collapsedPanels": ["filters"],
      "pinnedCategories": ["wedding"],
      "lastUpdated": "2024-05-11T10:12:30.123Z"
    }
  }
  ```
  - `state` is omitted or `null` if no data exists. The handler can also fall back to defaults on the client.

- **PUT/PATCH** accept a JSON body containing any subset of the fields listed in the data model below. The handler should:
  1. Call `authenticate(req)` to obtain `authUser.id`.
  2. Validate types (e.g., strings for IDs/paths, arrays of strings for histories, booleans for toggles).
  3. Pass the sanitized payload to the persistence layer along with `authUser.id`.
  4. Respond with `200` and the stored document (`{ state: { ... }, saved: true }`).

## Integration Notes for `server/index.js`
Implementation should follow the existing in-memory patterns:
1. **Module Imports** – Add a new `navigationStateStore` module that exposes `getNavigationState(userId)` and `saveNavigationState(userId, payload)`. Import it near the other `*-store.js` modules at the top of `server/index.js`.
2. **Routing** – Inside the main `http.createServer` callback, insert new conditionals after the `/api/user/tokens` handler. The flow mirrors other routes:
   ```js
   if (req.method === 'GET' && req.url === '/api/navigation/state') {
     const authUser = authenticate(req);
     const state = await navigationStateStore.getNavigationState(authUser.id);
     res.writeHead(200, { 'Content-Type': 'application/json' });
     res.end(JSON.stringify({ state }));
     return;
   }
   ```
   The `PUT`/`PATCH` branch will call `readBody(req)` (already defined in the file) to consume JSON payloads before saving.
3. **Error Handling** – On validation failures, respond with `400` just like the purchase endpoint. Unauthorized access should mirror `/api/user/tokens` by letting `authenticate` throw and catching it with the surrounding `try/catch` block.
4. **Rate Limiting** – No additional work is needed because all routes already pass through `rateLimit` at the top of the request handler.

## Data Model
The persisted document is keyed by `userId`. Suggested schema:

| Field | Type | Notes |
| --- | --- | --- |
| `userId` | `string` | Derived from `authUser.id`; not stored in the JSON blob if the storage medium already partitions by user. |
| `currentSection` | `string` | Identifier for the active navigation section/tab. |
| `lastVisited` | `string[]` | Ordered list of the most recently opened design or admin pages (limit to ~10 entries). |
| `collapsedPanels` | `string[]` | IDs of UI panels the user collapsed. |
| `pinnedCategories` | `string[]` | Optional list of category IDs the user pinned or favorited. |
| `showAdminTips` | `boolean` | Example toggle for contextual hints. |
| `lastUpdated` | `string (ISO timestamp)` | Updated by the server when the record changes. |

The structure should remain flexible; additional keys can be added later if the client sends them. Unknown keys can be stored verbatim when using schemaless storage (e.g., JSON blob).

## Storage & Service Dependencies
- **Persistence Layer** – Start with a simple in-memory `Map` (similar to `userTokens`) for local development, exposed through `navigation-state-store.js`. The module can later be swapped for a database-backed implementation without changing the HTTP surface.
- **Durable Storage Options** – When moving beyond development, consider:
  - Cloudflare KV / Durable Objects (aligns with the rest of the project stack).
  - A relational table (`navigation_state`) keyed by `user_id` with a JSON column for the document.
  - A document store such as Firestore or MongoDB if other personalization features are planned.
- **Cache Invalidation** – Add a TTL (e.g., 30 days) if storage costs are a concern. Include `lastUpdated` to help clients decide when to refresh.
- **Testing Hooks** – Mirror other stores by exporting helpers like `__clearAll()` so integration tests can reset state.

## Open Questions / Future Work
- Should anonymous visitors get a temporary state keyed by a cookie? If so, reuse the existing session token infrastructure.
- Decide whether to debounce writes on the client or accept every navigation change (the latter relies on server-side rate limiting).
- If navigation state becomes large, support `PATCH` to avoid resending the full payload on every change.
