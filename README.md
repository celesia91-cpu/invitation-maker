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

