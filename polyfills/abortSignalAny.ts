type AbortSignalAny = (signals: AbortSignal[]) => AbortSignal;

type AbortSignalConstructorWithAny = {
  any?: AbortSignalAny;
};

const abortSignalConstructor = AbortSignal as unknown as AbortSignalConstructorWithAny;

if (typeof abortSignalConstructor.any !== "function") {
  abortSignalConstructor.any = (signals: AbortSignal[]): AbortSignal => {
    const controller = new AbortController();
    const inputSignals = [...signals];

    if (inputSignals.some((signal) => signal.aborted)) {
      controller.abort();
      return controller.signal;
    }

    const removeListeners: Array<() => void> = [];

    const abortCombinedSignal = (): void => {
      removeListeners.forEach((removeListener) => removeListener());

      if (!controller.signal.aborted) {
        controller.abort();
      }
    };

    inputSignals.forEach((signal) => {
      signal.addEventListener("abort", abortCombinedSignal, { once: true });
      removeListeners.push(() => {
        signal.removeEventListener("abort", abortCombinedSignal);
      });
    });

    return controller.signal;
  };
}

export {};
