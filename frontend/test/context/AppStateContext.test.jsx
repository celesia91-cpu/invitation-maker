import { createAppStateValue, initialState, reducer } from '../../context/AppStateContext.jsx';

describe('AppStateContext reducer', () => {
  const clone = (value) => {
    if (typeof structuredClone === 'function') {
      return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
  };

  const deepFreeze = (obj) => {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }
    Object.freeze(obj);
    Object.getOwnPropertyNames(obj).forEach((prop) => {
      const value = obj[prop];
      if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        deepFreeze(value);
      }
    });
    return obj;
  };

  const createState = (overrides = {}) => ({
    ...clone(initialState),
    ...overrides,
  });

  test('SET_SLIDES replaces the slides collection', () => {
    const previousSlides = [{ id: 'a' }];
    const nextSlides = [{ id: 'b' }];
    const state = createState({ slides: previousSlides });

    const result = reducer(state, { type: 'SET_SLIDES', slides: nextSlides });

    expect(result).not.toBe(state);
    expect(result.slides).toBe(nextSlides);
    expect(state.slides).toBe(previousSlides);
  });

  test('SET_ACTIVE_INDEX coerces to a non-negative integer', () => {
    const state = createState({ activeIndex: 5 });

    const result = reducer(state, { type: 'SET_ACTIVE_INDEX', index: -3.7 });

    expect(result.activeIndex).toBe(0);
    expect(state.activeIndex).toBe(5);
  });

  test('SET_PLAYING toggles playback state', () => {
    const state = createState({ playing: false });

    const result = reducer(state, { type: 'SET_PLAYING', playing: 'truthy' });

    expect(result.playing).toBe(true);
    expect(state.playing).toBe(false);
  });

  test('SET_WORK_SIZE updates work dimensions immutably', () => {
    const workSize = { w: 100, h: 100 };
    const state = createState({ workSize });

    const result = reducer(state, { type: 'SET_WORK_SIZE', w: 640.5, h: 480.2 });

    expect(result.workSize).toEqual({ w: 640, h: 480 });
    expect(result.workSize).not.toBe(workSize);
    expect(state.workSize).toBe(workSize);
  });

  test('UPDATE_IMG_STATE merges patches without mutating previous state', () => {
    const imgState = { has: false, natW: 200, natH: 100, scale: 1 };
    const state = createState({ imgState });

    const result = reducer(state, { type: 'UPDATE_IMG_STATE', patch: { scale: 2, natH: 250 } });

    expect(result.imgState).toMatchObject({ has: false, natW: 200, natH: 250, scale: 2 });
    expect(result.imgState).not.toBe(imgState);
    expect(state.imgState).toBe(imgState);
  });

  test('ADD_TEXT_LAYER appends a new layer only to the targeted slide', () => {
    const slides = [
      { id: 'one', layers: [{ text: 'keep', left: 0, top: 0 }] },
      { id: 'two', layers: [{ text: 'existing', left: 5, top: 5 }] },
    ];
    const state = createState({ slides, activeIndex: 1 });
    deepFreeze(state);

    const result = reducer(state, { type: 'ADD_TEXT_LAYER', text: 'New layer' });

    expect(result.slides).not.toBe(slides);
    expect(result.slides[0]).toBe(slides[0]);
    expect(result.slides[1]).not.toBe(slides[1]);
    expect(result.slides[1].layers).toHaveLength(2);
    expect(result.slides[1].layers[1]).toMatchObject({ text: 'New layer', left: 16, top: 16 });
    expect(slides[1].layers).toHaveLength(1);
  });

  test('UPDATE_TEXT_LAYER patches only the targeted text layer', () => {
    const layers = [
      { text: 'first', color: '#fff', left: 10, top: 10 },
      { text: 'second', color: '#000', left: 20, top: 20 },
    ];
    const slides = [{ id: 'slide', layers }];
    const state = createState({ slides, activeIndex: 0 });
    deepFreeze(state);

    const result = reducer(state, {
      type: 'UPDATE_TEXT_LAYER',
      layer: 1,
      patch: { text: 'updated', color: '#f00' },
    });

    expect(result.slides[0]).not.toBe(slides[0]);
    expect(result.slides[0].layers).not.toBe(layers);
    expect(result.slides[0].layers[0]).toBe(layers[0]);
    expect(result.slides[0].layers[1]).toMatchObject({ text: 'updated', color: '#f00', left: 20, top: 20 });
    expect(result.slides[0].layers[1]).not.toBe(layers[1]);
    expect(layers[1].text).toBe('second');
  });

  test('REMOVE_TEXT_LAYER removes a layer without touching siblings', () => {
    const layers = [
      { id: 'a', text: 'first' },
      { id: 'b', text: 'second' },
      { id: 'c', text: 'third' },
    ];
    const slides = [{ id: 'slide', layers }];
    const state = createState({ slides, activeIndex: 0 });
    deepFreeze(state);

    const result = reducer(state, { type: 'REMOVE_TEXT_LAYER', layer: 1 });

    expect(result.slides[0]).not.toBe(slides[0]);
    expect(result.slides[0].layers).toHaveLength(2);
    expect(result.slides[0].layers[0]).toBe(layers[0]);
    expect(result.slides[0].layers[1]).toBe(layers[2]);
    expect(layers).toHaveLength(3);
  });

  test('SET_TOKEN_BALANCE stores integer balances only', () => {
    const state = createState({ tokenBalance: 7 });

    const result = reducer(state, { type: 'SET_TOKEN_BALANCE', value: 12.9 });

    expect(result.tokenBalance).toBe(12);
    expect(state.tokenBalance).toBe(7);
  });

  test('SET_USER_ROLE normalizes falsy roles to guest and trims strings', () => {
    const state = createState({ userRole: 'guest' });

    const next = reducer(state, { type: 'SET_USER_ROLE', role: '  Admin  ' });
    expect(next.userRole).toBe('Admin');

    const fallback = reducer(next, { type: 'SET_USER_ROLE', role: '' });
    expect(fallback.userRole).toBe('guest');
  });

  test('SET_USER_ROLE returns the same reference when the role is unchanged', () => {
    const state = createState({ userRole: 'creator' });

    const result = reducer(state, { type: 'SET_USER_ROLE', role: 'creator' });

    expect(result).toBe(state);
  });
});

describe('AppStateContext action creators', () => {
  const createValue = () => {
    const dispatch = jest.fn();
    const value = createAppStateValue(initialState, dispatch);
    return { dispatch, value };
  };

  test('setSlides dispatches SET_SLIDES', () => {
    const { dispatch, value } = createValue();
    const slides = [{ id: 'new' }];

    value.setSlides(slides);

    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SLIDES', slides });
  });

  test('setActiveIndex dispatches SET_ACTIVE_INDEX', () => {
    const { dispatch, value } = createValue();

    value.setActiveIndex(3);

    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_ACTIVE_INDEX', index: 3 });
  });

  test('setPlaying dispatches SET_PLAYING', () => {
    const { dispatch, value } = createValue();

    value.setPlaying(true);

    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PLAYING', playing: true });
  });

  test('setWorkSize dispatches SET_WORK_SIZE', () => {
    const { dispatch, value } = createValue();

    value.setWorkSize(800, 600);

    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_WORK_SIZE', w: 800, h: 600 });
  });

  test('updateImgState dispatches UPDATE_IMG_STATE', () => {
    const { dispatch, value } = createValue();
    const patch = { scale: 2 };

    value.updateImgState(patch);

    expect(dispatch).toHaveBeenCalledWith({ type: 'UPDATE_IMG_STATE', patch });
  });

  test('addTextLayer dispatches ADD_TEXT_LAYER', () => {
    const { dispatch, value } = createValue();

    value.addTextLayer('hello', 2);

    expect(dispatch).toHaveBeenCalledWith({ type: 'ADD_TEXT_LAYER', text: 'hello', index: 2 });
  });

  test('updateTextLayer dispatches UPDATE_TEXT_LAYER', () => {
    const { dispatch, value } = createValue();
    const patch = { text: 'updated' };

    value.updateTextLayer(1, patch, 3);

    expect(dispatch).toHaveBeenCalledWith({ type: 'UPDATE_TEXT_LAYER', layer: 1, patch, index: 3 });
  });

  test('removeTextLayer dispatches REMOVE_TEXT_LAYER', () => {
    const { dispatch, value } = createValue();

    value.removeTextLayer(4, 1);

    expect(dispatch).toHaveBeenCalledWith({ type: 'REMOVE_TEXT_LAYER', layer: 4, index: 1 });
  });

  test('setTokenBalance dispatches SET_TOKEN_BALANCE', () => {
    const { dispatch, value } = createValue();

    value.setTokenBalance(42);

    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_TOKEN_BALANCE', value: 42 });
  });

  test('setUserRole dispatches SET_USER_ROLE', () => {
    const { dispatch, value } = createValue();

    value.setUserRole('admin');

    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_USER_ROLE', role: 'admin' });
  });

  test('resetUserRole dispatches SET_USER_ROLE with the guest role', () => {
    const { dispatch, value } = createValue();

    value.resetUserRole();

    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_USER_ROLE', role: initialState.userRole });
  });
});
