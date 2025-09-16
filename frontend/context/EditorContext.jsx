import React, { createContext, useContext, useMemo, useReducer } from 'react';

const EditorStateContext = createContext(null);
const EditorDispatchContext = createContext(null);

// ✅ FIX: Use counters instead of Date.now() for consistent server/client rendering
let slideIdCounter = 0;
let elementIdCounter = 0;

const initialSlide = () => ({
  id: `slide_${++slideIdCounter}`, // ✅ FIXED: Was Date.now()
  name: 'Slide 1',
  elements: [],
});

const initialState = {
  slides: [initialSlide()],
  selected: { slideId: null, elementId: null },
  viewport: { width: 1080, height: 1920, scale: 1 },
  ui: { showGrid: false, snapToGrid: true, showAuthModal: false, showShareModal: false },
};

function withSelected(state, updater) {
  const { slideId } = state.selected;
  const sId = slideId ?? state.slides[0]?.id;
  if (!sId) return state;
  const slides = state.slides.map((s) => (s.id === sId ? updater(s) : s));
  return { ...state, slides };
}

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_SLIDE': {
      const slideNumber = state.slides.length + 1;
      const newSlide = { 
        id: `slide_${++slideIdCounter}`, // ✅ FIXED: Was Date.now()
        name: `Slide ${slideNumber}`, 
        elements: [] 
      };
      return { ...state, slides: [...state.slides, newSlide], selected: { slideId: newSlide.id, elementId: null } };
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
        id: `el_${++elementIdCounter}`, // ✅ FIXED: Was Date.now()
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
        elements: slide.elements.map((e) => (e.id === elementId ? { ...e, ...patch, style: { ...e.style, ...(patch.style || {}) } } : e)),
      }));
    }
    case 'ADD_IMAGE': {
      const el = {
        id: `el_${++elementIdCounter}`, // ✅ FIXED: Was Date.now()
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
}

export function EditorProvider({ children, initial }) {
  const [state, dispatch] = useReducer(reducer, initial ? { ...initialState, ...initial } : initialState);
  const stateValue = useMemo(() => state, [state]);
  const dispatchValue = useMemo(() => dispatch, [dispatch]);
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

export default EditorProvider;