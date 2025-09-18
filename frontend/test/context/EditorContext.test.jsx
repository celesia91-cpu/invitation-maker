import React from 'react';
import { renderHook, act } from '@testing-library/react';
import EditorProvider, {
  useEditor,
  useEditorDispatch,
  useEditorState,
  __getEditorTestInternals,
} from '../../context/EditorContext.jsx';

const clone = (value) => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};

const testInternals = __getEditorTestInternals();

const createReducerHarness = (initialOverrides) => testInternals.createHarness(initialOverrides);

describe('EditorContext reducer', () => {
  test('ADD_SLIDE appends new slides with incremented ids and selects them', () => {
    const { initialState, reducer, counters } = createReducerHarness();
    const state = clone(initialState);
    const beforeSlides = counters.slideIdCounter.current;

    const firstResult = reducer(state, { type: 'ADD_SLIDE' });

    const afterFirstSlide = counters.slideIdCounter.current;
    expect(afterFirstSlide).toBe(beforeSlides + 1);
    expect(firstResult.slides).toHaveLength(state.slides.length + 1);
    const addedSlide = firstResult.slides[firstResult.slides.length - 1];
    expect(addedSlide).toMatchObject({ id: `slide_${afterFirstSlide}`, name: `Slide ${firstResult.slides.length}` });
    expect(firstResult.selected).toEqual({ slideId: addedSlide.id, elementId: null });
    expect(state.slides).toHaveLength(1);

    const beforeSecond = counters.slideIdCounter.current;
    const secondResult = reducer(firstResult, { type: 'ADD_SLIDE' });
    const afterSecond = counters.slideIdCounter.current;

    expect(afterSecond).toBe(beforeSecond + 1);
    expect(secondResult.slides).toHaveLength(3);
    expect(secondResult.slides[2].id).toBe(`slide_${afterSecond}`);
    expect(secondResult.selected.slideId).toBe(`slide_${afterSecond}`);
  });

  test('SELECT_SLIDE focuses the requested slide and clears element selection', () => {
    const { initialState, reducer } = createReducerHarness();
    const base = clone(initialState);
    const firstSlideId = base.slides[0].id;
    const withAdditionalSlide = reducer(base, { type: 'ADD_SLIDE' });
    const state = { ...withAdditionalSlide, selected: { slideId: withAdditionalSlide.selected.slideId, elementId: 'el_temp' } };

    const result = reducer(state, { type: 'SELECT_SLIDE', slideId: firstSlideId });

    expect(result.selected).toEqual({ slideId: firstSlideId, elementId: null });
    expect(result.slides[0]).toBe(withAdditionalSlide.slides[0]);
  });

  test('ADD_TEXT creates a text element with defaults and increments element id counter', () => {
    const { initialState, reducer, counters } = createReducerHarness();
    const slideId = initialState.slides[0].id;
    const base = { ...clone(initialState), selected: { slideId, elementId: null } };
    const beforeElements = counters.elementIdCounter.current;

    const result = reducer(base, { type: 'ADD_TEXT', content: 'Hello world' });

    const afterElements = counters.elementIdCounter.current;
    expect(afterElements).toBe(beforeElements + 1);
    const [element] = result.slides[0].elements;
    expect(element).toMatchObject({
      id: `el_${afterElements}`,
      type: 'text',
      content: 'Hello world',
      x: 100,
      y: 100,
      width: 400,
      height: 80,
    });
    expect(element.style).toMatchObject({ color: '#111', fontFamily: 'Arial, sans-serif', fontSize: 48, textAlign: 'center' });
    expect(base.slides[0].elements).toHaveLength(0);
  });

  test('UPDATE_TEXT patches the targeted element while preserving untouched properties', () => {
    const { initialState, reducer } = createReducerHarness();
    const slideId = initialState.slides[0].id;
    const base = { ...clone(initialState), selected: { slideId, elementId: null } };
    const withText = reducer(base, { type: 'ADD_TEXT', content: 'Original' });
    const textId = withText.slides[0].elements[0].id;

    const result = reducer(withText, {
      type: 'UPDATE_TEXT',
      elementId: textId,
      patch: { content: 'Updated', style: { color: '#fefefe' } },
    });

    const [updated] = result.slides[0].elements;
    expect(updated.content).toBe('Updated');
    expect(updated.style).toMatchObject({
      color: '#fefefe',
      fontFamily: 'Arial, sans-serif',
      fontSize: 48,
      textAlign: 'center',
    });
    expect(withText.slides[0].elements[0].content).toBe('Original');
  });

  test('ADD_IMAGE appends images with predictable identifiers', () => {
    const { initialState, reducer, counters } = createReducerHarness();
    const slideId = initialState.slides[0].id;
    const base = { ...clone(initialState), selected: { slideId, elementId: null } };
    const withText = reducer(base, { type: 'ADD_TEXT', content: 'First element' });
    const beforeImage = counters.elementIdCounter.current;

    const result = reducer(withText, { type: 'ADD_IMAGE', src: '/cat.png', fit: 'contain' });

    const afterImage = counters.elementIdCounter.current;
    expect(afterImage).toBe(beforeImage + 1);
    expect(withText.slides[0].elements).toHaveLength(1);
    expect(result.slides[0].elements).toHaveLength(2);
    const imageElement = result.slides[0].elements[1];
    expect(imageElement).toMatchObject({ id: `el_${afterImage}`, type: 'image', src: '/cat.png', fit: 'contain' });
  });

  test('DELETE_ELEMENT removes only the specified element from the selected slide', () => {
    const { initialState, reducer } = createReducerHarness();
    const slideId = initialState.slides[0].id;
    const base = { ...clone(initialState), selected: { slideId, elementId: null } };
    const withText = reducer(base, { type: 'ADD_TEXT', content: 'Keep me' });
    const withImage = reducer(withText, { type: 'ADD_IMAGE', src: '/remove.png' });
    const [textElement, imageElement] = withImage.slides[0].elements;

    const result = reducer(withImage, { type: 'DELETE_ELEMENT', elementId: textElement.id });

    expect(result.slides[0].elements).toHaveLength(1);
    expect(result.slides[0].elements[0]).toBe(imageElement);
    expect(withImage.slides[0].elements).toHaveLength(2);
  });

  test('SELECT_ELEMENT records the focused element while keeping the selected slide', () => {
    const { initialState, reducer } = createReducerHarness();
    const slideId = initialState.slides[0].id;
    const base = { ...clone(initialState), selected: { slideId, elementId: null } };
    const withText = reducer(base, { type: 'ADD_TEXT', content: 'Selectable' });
    const elementId = withText.slides[0].elements[0].id;

    const result = reducer(withText, { type: 'SELECT_ELEMENT', elementId });

    expect(result.selected).toEqual({ slideId, elementId });
  });

  test('SET_VIEWPORT updates dimensions and optionally the scale', () => {
    const { initialState, reducer } = createReducerHarness();
    const base = clone(initialState);
    const custom = { ...base, viewport: { width: 320, height: 240, scale: 0.75 } };

    const resized = reducer(custom, { type: 'SET_VIEWPORT', width: 800, height: 600 });
    expect(resized.viewport).toEqual({ width: 800, height: 600, scale: 0.75 });

    const rescaled = reducer(resized, { type: 'SET_VIEWPORT', width: 1024, height: 768, scale: 2 });
    expect(rescaled.viewport).toEqual({ width: 1024, height: 768, scale: 2 });
  });
});

describe('EditorProvider hooks', () => {
  test('useEditorState throws outside of the provider', () => {
    expect(() => renderHook(() => useEditorState())).toThrow(
      'useEditorState must be used within EditorProvider'
    );
  });

  test('useEditorDispatch throws outside of the provider', () => {
    expect(() => renderHook(() => useEditorDispatch())).toThrow(
      'useEditorDispatch must be used within EditorProvider'
    );
  });

  test('useEditor throws outside of the provider', () => {
    expect(() => renderHook(() => useEditor())).toThrow('useEditorState must be used within EditorProvider');
  });

  test('useEditorState and useEditorDispatch share live state when actions dispatch', () => {
    const wrapper = ({ children }) => <EditorProvider>{children}</EditorProvider>;

    const { result } = renderHook(
      () => {
        const state = useEditorState();
        const dispatch = useEditorDispatch();
        return { state, dispatch };
      },
      { wrapper }
    );

    expect(result.current.state.slides).toHaveLength(1);

    act(() => {
      result.current.dispatch({ type: 'ADD_SLIDE' });
    });

    const { slideIdCounter: currentSlideCounter } = testInternals.getLatestCounters();
    expect(result.current.state.slides).toHaveLength(2);
    expect(result.current.state.slides[1].id).toBe(`slide_${currentSlideCounter}`);
    expect(result.current.state.selected.slideId).toBe(`slide_${currentSlideCounter}`);
  });

  test('useEditor returns state and dispatch that react to updates', () => {
    const wrapper = ({ children }) => <EditorProvider>{children}</EditorProvider>;

    const { result } = renderHook(() => useEditor(), { wrapper });

    act(() => {
      const [, dispatch] = result.current;
      dispatch({ type: 'ADD_TEXT', content: 'From hook' });
    });

    const [state] = result.current;
    expect(state.slides[0].elements).toHaveLength(1);
    expect(state.slides[0].elements[0].content).toBe('From hook');
  });
});
