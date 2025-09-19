# Admin Design Management API Plan

This planning document outlines the upcoming administrative endpoints for managing invitation designs. It focuses on server responsibilities, authentication requirements, and the structure of the JSON payloads that the frontend and backend teams should align on before implementation.

## Access Control & Authentication
- **Audience**: Platform administrators who oversee community-submitted designs.
- **Authentication**: Reuse the existing JWT/session authentication, but the token **must** carry an `admin` role claim (e.g. `{ "roles": ["admin"] }`). Requests without this role receive a `403 Forbidden` response even if the token is otherwise valid.
- **Transport**: All endpoints are served over HTTPS. Tokens are sent via `Authorization: Bearer <token>` headers or the existing `session` cookie.
- **Rate limiting**: Mirror the standard API defaults (currently 60 requests/minute). Admin clients should surface throttling errors to the operator.

## Design Resource Shape
Each API response returns design records with the following structure. Fields marked optional may be omitted when their values are `null`.

```json
{
  "id": "dsgn_123",
  "ownerId": "user_42",
  "title": "Summer Gala",
  "status": "draft",           // enum: draft | published | archived
  "thumbnailUrl": "https://cdn.example.com/designs/dsgn_123/thumb.png",
  "updatedAt": "2024-05-22T18:11:41.120Z",
  "createdAt": "2024-05-19T11:07:05.993Z",
  "slides": [
    {
      "id": "slide_1",
      "layout": "cover",
      "components": [
        { "type": "text", "value": "Welcome" },
        { "type": "image", "assetId": "asset_9" }
      ]
    }
  ],
  "tags": ["featured", "wedding"],
  "notes": "Optional moderation notes."
}
```

## Endpoints
The admin endpoints live under the `/api/admin/designs` namespace and operate on the design resource described above.

### GET `/api/admin/designs`
Retrieves a paginated list of all designs visible to the administrator.

- **Query parameters**
  - `page` (default: `1`) — 1-indexed page selector.
  - `pageSize` (default: `25`, max: `100`) — number of designs per page.
  - `status` — optional filter (`draft`, `published`, `archived`).
  - `ownerId` — optional filter to inspect a single user’s submissions.
  - `search` — optional text search across titles and tags.
- **Response** `200 OK`

```json
{
  "data": [
    { "id": "dsgn_123", "title": "Summer Gala", "status": "draft", "ownerId": "user_42", "updatedAt": "2024-05-22T18:11:41.120Z", "thumbnailUrl": "https://..." }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "total": 87
  }
}
```

### POST `/api/admin/designs`
Creates a new design on behalf of an end user or for the shared template library.

- **Request body**

```json
{
  "ownerId": "user_42",                // optional; when omitted the design becomes a shared template
  "title": "New Admin Template",
  "status": "draft",
  "thumbnailUrl": "https://cdn.example.com/designs/new-template/thumb.png",
  "slides": [...],
  "tags": ["featured"],
  "notes": "Initial moderation review notes"
}
```

- **Response** `201 Created`

```json
{
  "id": "dsgn_987",
  "ownerId": "user_42",
  "title": "New Admin Template",
  "status": "draft",
  "thumbnailUrl": "https://cdn.example.com/designs/new-template/thumb.png",
  "updatedAt": "2024-05-25T14:03:21.554Z",
  "createdAt": "2024-05-25T14:03:21.554Z"
}
```

- **Validation errors**: respond with `422 Unprocessable Entity` and an error array (`[{ "field": "title", "message": "Title is required" }]`).

### PUT `/api/admin/designs/:id`
Performs a full replacement of the design payload.

- **Request body**: same shape as `POST` but must include all required top-level fields.
- **Response** `200 OK`: returns the updated design record.
- **Errors**:
  - `404 Not Found` if the design does not exist.
  - `409 Conflict` when attempting to overwrite a design that was updated more recently (optimistic concurrency via `If-Unmodified-Since` header).

### PATCH `/api/admin/designs/:id`
Applies partial updates. Intended for moderation updates (status changes, notes) without resubmitting the slides payload.

- **Request body**: any subset of mutable fields (`title`, `status`, `thumbnailUrl`, `slides`, `tags`, `notes`).
- **Response** `200 OK`: returns the updated design record.

### DELETE `/api/admin/designs/:id`
Soft-deletes a design so it no longer appears in end-user listings.

- **Response** `204 No Content`.
- **Behavior**: sets the internal `status` to `archived` and records the admin’s user ID for audit logs. A future restore endpoint may be added if needed.

## Error Responses
All endpoints share a common error envelope:

```json
{
  "error": {
    "type": "authorization_error",   // e.g. validation_error | not_found | server_error
    "message": "Administrator role required"
  }
}
```

## Logging & Auditing
- Record admin user ID, timestamp, target design ID, and payload diff for each mutating request.
- Retain audit logs for at least 180 days to support compliance reviews.
- Emit structured logs so our observability stack (Datadog) can alert on abnormal patterns (e.g., repeated deletions by the same admin).

## Outstanding Questions
- Should published designs be immutable except for status and notes? This may simplify moderation but requires confirmation from product.
- Do admins need batch endpoints (e.g., bulk status changes)? Current plan assumes single-resource operations.
- Confirm whether admin-created templates should bypass the standard review workflow.
