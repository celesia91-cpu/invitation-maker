const state = {
  refCount: 0,
  starting: null
};

export async function acquireTestServer(server) {
  state.refCount += 1;
  try {
    if (server.listening) {
      if (state.starting) {
        await state.starting;
      }
    } else {
      if (!state.starting) {
        const startPromise = new Promise((resolve, reject) => {
          const onError = (err) => {
            server.off('error', onError);
            reject(err);
          };
          server.once('error', onError);
          server.listen(0, () => {
            server.off('error', onError);
            resolve();
          });
        });
        state.starting = startPromise.finally(() => {
          state.starting = null;
        });
      }
      await state.starting;
    }

    const address = server.address();
    const baseUrl =
      typeof address === 'string' ? address : `http://127.0.0.1:${address?.port ?? 0}`;

    return {
      baseUrl,
      async release() {
        if (state.refCount === 0) {
          return;
        }
        state.refCount -= 1;
        if (state.refCount === 0) {
          if (state.starting) {
            await state.starting;
          }
          if (server.listening) {
            await new Promise((resolve, reject) => {
              server.close((err) => (err ? reject(err) : resolve()));
            });
          }
        }
      }
    };
  } catch (err) {
    state.refCount = Math.max(0, state.refCount - 1);
    throw err;
  }
}
