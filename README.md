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

## Orientation Lock
The app tries to lock mobile and tablet screens to landscape using the
[`screen.orientation.lock`](https://developer.mozilla.org/en-US/docs/Web/API/ScreenOrientation/lock)
API. Support and requirements vary across browsers:

- **Chrome for Android** – requires a user interaction and the page to be in
  full-screen mode before locking the orientation.
- **Safari on iOS** – does not support programmatic orientation locking.

If locking fails or isn’t supported, a rotate prompt overlay guides users to
manually rotate their device. The overlay hides automatically once the device
is in landscape.

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
