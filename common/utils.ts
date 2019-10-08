// Min and max are inclusive
export function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max + 1 - min) + min);
}

export function debounce<R, ARGS extends any[]>(context: any,
                                                fn: (...args: ARGS) => R,
                                                ms: number):
  (...args: ARGS) => R|null {

  let lastCall = 0;

  return (...argv: ARGS) => {
    const now = (new Date()).getTime();

    if (now - lastCall >= ms) {
      lastCall = now;
      return fn.call(context, ...argv);
    }

    return null;
  };
}

export function timeout(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function waitForCondition(predicate: () => boolean,
                                       interval: number,
                                       attempts: number): Promise<boolean> {
  for (let i = 0; i < attempts; ++i) {
    await timeout(interval);
    if (predicate()) {
      return true;
    }
  }
  return false;
}
