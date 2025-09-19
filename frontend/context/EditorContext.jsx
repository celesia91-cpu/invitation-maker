import React, { createContext, useContext, useMemo, useReducer, useRef } from 'react';

const EditorStateContext = createContext(null);
const EditorDispatchContext = createContext(null);

const DEFAULT_SELECTED = { slideId: null, elementId: null };
const DEFAULT_VIEWPORT = { width: 1080, height: 1920, scale: 1 };
const DEFAULT_UI = {
  showGrid: false,
  snapToGrid: true,
  showAuthModal: false,
  showShareModal: false,
};

const SLIDE_PREFIX = 'slide_';
const ELEMENT_PREFIX = 'el_';

function parseNumericSuffix(value, prefix) {
  if (typeof value !== 'string') return 0;
  if (!value.startsWith(prefix)) return 0;
  const suffix = Number.parseInt(value.slice(prefix.length), 10);
  return Number.isFinite(suffix) ? suffix : 0;
}

function createEditorCounters(initial) {
  const slideIdCounter = { current: 0 };
  const elementIdCounter = { current: 0 };

  if (initial?.slides?.length) {
    initial.slides.forEach((slide) => {
      slideIdCounter.current = Math.max(
        slideIdCounter.current,
        parseNumericSuffix(slide.id, SLIDE_PREFIX)
      );

      if (Array.isArray(slide.elements)) {
        slide.elements.forEach((element) => {
          elementIdCounter.current = Math.max(
            elementIdCounter.current,
            parseNumericSuffix(element.id, ELEMENT_PREFIX)
          );
        });
      }
    });
  }

  return {
    slideIdCounter,
    elementIdCounter,
    nextSlideId() {
      slideIdCounter.current += 1;
      return `${SLIDE_PREFIX}${slideIdCounter.current}`;
    },
    nextElementId() {
      elementIdCounter.current += 1;
      return `${ELEMENT_PREFIX}${elementIdCounter.current}`;
    },
  };
}

const initialSlide = (counters) => ({
  id: counters.nextSlideId(),
  name: 'Slide 1',
  elements: [],
});

function createInitialState(counters, overrides) {
  const { slides, selected, viewport, ui, ...rest } = overrides ?? {};

  return {
    slides: slides ?? [initialSlide(counters)],
    selected: selected ?? { ...DEFAULT_SELECTED },
    viewport: viewport ?? { ...DEFAULT_VIEWPORT },
    ui: ui ?? { ...DEFAULT_UI },
    ...rest,
  };
}

const initialState = (() => {
  const counters = createEditorCounters();
  return createInitialState(counters);
})();

function withSelected(state, updater) {
  const { slideId } = state.selected;
  const sId = slideId ?? state.slides[0]?.id;
  if (!sId) return state;
  const slides = state.slides.map((s) => (s.id === sId ? updater(s) : s));
  return { ...state, slides };
}

function createEditorReducer(counters) {
  return function reducer(state, action) {
    switch (action.type) {
      case 'ADD_SLIDE': {
        const slideNumber = state.slides.length + 1;
        const newSlide = {
          id: counters.nextSlideId(),
          name: `Slide ${slideNumber}`,
          elements: [],
        };
        return {
          ...state,
          slides: [...state.slides, newSlide],
          selected: { slideId: newSlide.id, elementId: null },
        };
      }
      case 'RENAME_SLIDE': {
        const { slideId, name } = action;
        const slides = state.slides.map((s) => (s.id === slideId ? { ...s, name } : s));
        return { ...state, slides };
      }
      case 'REMOVE_SLIDE': {
        const { slideId } = action;
        const slides = state.slides.filter((s) => s.id !== slideId);
        const nextSelectedId = slides[0]?.id ?? null;
        return { ...state, slides, selected: { slideId: nextSelectedId, elementId: null } };
      }
      case 'SELECT_SLIDE': {
        return { ...state, selected: { slideId: action.slideId, elementId: null } };
      }
      case 'ADD_TEXT': {
        const el = {
          id: counters.nextElementId(),
          type: 'text',
          x: action.x ?? 100,
          y: action.y ?? 100,
          width: action.width ?? 400,
          height: action.height ?? 80,
          rotation: 0,
          content: action.content ?? 'Edit me',
          style: {
            color: '#111',
            fontFamily: 'Arial, sans-serif',
            fontSize: 48,
            fontWeight: 600,
            textAlign: 'center',
          },
        };
        return withSelected(state, (slide) => ({ ...slide, elements: [...slide.elements, el] }));
      }
      case 'UPDATE_TEXT': {
        const { elementId, patch } = action;
        return withSelected(state, (slide) => ({
          ...slide,
          elements: slide.elements.map((e) =>
            e.id === elementId
              ? { ...e, ...patch, style: { ...e.style, ...(patch.style || {}) } }
              : e
          ),
        }));
      }
      case 'ADD_IMAGE': {
        const el = {
          id: counters.nextElementId(),
          type: 'image',
          x: action.x ?? 100,
          y: action.y ?? 100,
          width: action.width ?? 400,
          height: action.height ?? 300,
          rotation: 0,
          src: action.src ?? '',
          fit: action.fit ?? 'cover',
        };
        return withSelected(state, (slide) => ({ ...slide, elements: [...slide.elements, el] }));
      }
      case 'UPDATE_IMAGE': {
        const { elementId, patch } = action;
        return withSelected(state, (slide) => ({
          ...slide,
          elements: slide.elements.map((e) => (e.id === elementId ? { ...e, ...patch } : e)),
        }));
      }
      case 'SELECT_ELEMENT': {
        return { ...state, selected: { ...state.selected, elementId: action.elementId } };
      }
      case 'MOVE_ELEMENT': {
        const { elementId, x, y } = action;
        return withSelected(state, (slide) => ({
          ...slide,
          elements: slide.elements.map((e) => (e.id === elementId ? { ...e, x, y } : e)),
        }));
      }
      case 'RESIZE_ELEMENT': {
        const { elementId, width, height } = action;
        return withSelected(state, (slide) => ({
          ...slide,
          elements: slide.elements.map((e) => (e.id === elementId ? { ...e, width, height } : e)),
        }));
      }
      case 'DELETE_ELEMENT': {
        const { elementId } = action;
        return withSelected(state, (slide) => ({
          ...slide,
          elements: slide.elements.filter((e) => e.id !== elementId),
        }));
      }
      case 'SET_VIEWPORT': {
        const { width, height, scale } = action;
        return { ...state, viewport: { width, height, scale: scale ?? state.viewport.scale } };
      }
      case 'SET_SCALE': {
        return { ...state, viewport: { ...state.viewport, scale: action.scale } };
      }
      case 'TOGGLE_MODAL': {
        const { key, value } = action;
        return { ...state, ui: { ...state.ui, [key]: value ?? !state.ui[key] } };
      }
      default:
        return state;
    }
  };
}

const testInternals = {
  latestCounters: null,
  setLatestCounters(counters) {
    testInternals.latestCounters = counters;
  },
  getLatestCounters() {
    const counters = testInternals.latestCounters;
    if (!counters) {
      return { slideIdCounter: 0, elementIdCounter: 0 };
    }
    return {
      slideIdCounter: counters.slideIdCounter.current,
      elementIdCounter: counters.elementIdCounter.current,
    };
  },
  createHarness(initialOverrides) {
    const counters = createEditorCounters(initialOverrides);
    return {
      counters,
      initialState: createInitialState(counters, initialOverrides),
      reducer: createEditorReducer(counters),
    };
  },
};

export function EditorProvider({ children, initial }) {
  const countersRef = useRef(null);

  if (!countersRef.current) {
    countersRef.current = createEditorCounters(initial);
  }

  const reducer = useMemo(() => createEditorReducer(countersRef.current), [countersRef]);
  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    () => createInitialState(countersRef.current, initial)
  );
  const stateValue = useMemo(() => state, [state]);
  const dispatchValue = useMemo(() => dispatch, [dispatch]);

  testInternals.setLatestCounters(countersRef.current);

  return (
    <EditorStateContext.Provider value={stateValue}>
      <EditorDispatchContext.Provider value={dispatchValue}>{children}</EditorDispatchContext.Provider>
    </EditorStateContext.Provider>
  );
}

export function useEditorState() {
  const ctx = useContext(EditorStateContext);
  if (!ctx) throw new Error('useEditorState must be used within EditorProvider');
  return ctx;
}

export function useEditorDispatch() {
  const ctx = useContext(EditorDispatchContext);
  if (!ctx) throw new Error('useEditorDispatch must be used within EditorProvider');
  return ctx;
}

export function useEditor() {
  return [useEditorState(), useEditorDispatch()];
}

export function __getEditorTestInternals() {
  return {
    createHarness: testInternals.createHarness,
    getLatestCounters: testInternals.getLatestCounters,
  };
}

export { initialState, createEditorReducer };
export default EditorProvider;
