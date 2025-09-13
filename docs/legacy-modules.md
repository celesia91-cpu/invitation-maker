# Legacy Module Overview

This document summarizes key exports and DOM operations in legacy modules
prior to the React refactor.

## auth-ui-manager.js
- **Exports**: `AuthUIManager` class with methods like `initialize`, `logout`,
  `showModal`, `hideModal`, `validateEmailInput`, `checkSession`, etc.
- **DOM Usage**:
  - `document.getElementById` to retrieve modal and form elements.
  - `addEventListener` on forms, modal backdrop and document for user
    interactions.
  - Direct manipulation of element classes and styles to show/hide the modal
    and provide validation feedback.

## slide-manager.js
- **Exports**: numerous functions including `playSlides`, `stopSlides`,
  `switchToSlide`, `previousSlide`, `nextSlide`, `resetOpacities`, and
  `destroySlideManager`.
- **DOM Usage**:
  - `document.querySelector`/`querySelectorAll` to access slide layers and
    toolbar elements.
  - `document.getElementById` for slide containers and controls.
  - Manipulation of element styles and attributes to drive animations and UI
    updates.

## text-manager.js
- **Exports**: `enterTextEditMode`, `exitTextEditMode`, `isInEditMode`,
  `getEditingElement`, `addTextLayer` and various helpers.
- **DOM Usage**:
  - `document.getElementById` to locate the work area.
  - `document.createElement` to build new text layers and `appendChild` to add
    them to the DOM.
  - `addEventListener` for click, double‑click and input events on text
    elements.
  - Direct style manipulation for editing behavior and positioning.

These notes guided the creation of the new React components which replace the
imperative DOM logic with stateful React patterns.
