# digital-invitation-maker

## Project Overview
A lightweight, browser-based tool for creating and sharing digital invitations.
The app lets you customize text and images, manage slides, and distribute your event details with ease.

![Demo of core features](Comp%201.webm)

## Setup
1. Clone the repository.
2. No build step is required; all source files are included.

```bash
git clone <repository-url>
cd invitation-maker
```

## Build & Run Instructions
Open `index.html` in your browser or serve the project with a static server:

```bash
npx http-server
```
Then navigate to the provided local URL to explore the app.

## Testing
Run the Jest suite from the repository root so both frontend and backend contributors use the same entry point:

```bash
npm test
# Example: filter to a specific suite
npm test -- PreviewModal
```

The root `npm test` command simply proxies to the frontend runner, so backend developers can execute the latest UI checks without switching directories.

## Orientation Guidance
Mobile and tablet screens are no longer forced into landscape orientation.
Instead, when the device is held in portrait, a rotate prompt overlay guides
users to manually rotate their device. The overlay hides automatically once
the device is in landscape.

By removing forced orientation locking, the app improves compatibility and
accessibility across browsers and devices.

## Contribution Guidelines
- Fork the repository and create pull requests for enhancements.
- Follow existing code style and write clear commit messages.
- Run any available tests before submitting.

## Module Usage
To interact with the app from other modules, import the named exports:

```javascript
import { initializeApp, appInstance } from './main.js';

await initializeApp();
// `appInstance` is a live binding to the running application
```
 
## Image Editing Controls
The editor supports basic background image adjustments:

- Drag corner handles to resize the background image or bounding box.
- Hold **Shift** while dragging a corner to shear the background image/bounding box.

## Transform State Ownership
`image-manager.js` is the single source of truth for background image transforms.
Other modules should modify the shared `imgState`, call `setTransforms()`, and let it
sync via `syncImageCoordinates()` rather than writing to `slide.image.*` directly.

## Backend API
Start the development server:

```bash
npm start
```

### GET `/api/designs`
Returns all saved designs for the authenticated user. Authentication is
validated via a JWT passed either as a `Bearer` token or a `session`
cookie.

**Response JSON Schema**
```json
{
  "type": "array",
  "items": {
    "type": "object",
    "required": ["id", "title", "thumbnailUrl", "updatedAt"],
    "properties": {
      "id": { "type": "string" },
      "title": { "type": "string" },
      "thumbnailUrl": { "type": "string", "format": "uri" },
      "updatedAt": { "type": "string", "format": "date-time" }
    }
  }
}
```

## Database Maintenance
A foreign key now links `rsvps.customer_id` to `customers.id`. Before applying the migration, use the helper scripts to ensure data integrity:

```bash
# Report orphan RSVPs (use --purge to delete them)
node scripts/check-orphan-rsvps.js

# One-time cleanup deleting orphaned RSVPs
node scripts/cleanup-orphan-rsvps.js
```

Apply the SQL in `migrations/202405241200_add_rsvps_customer_fk.sql` with your migration tool of choice.
