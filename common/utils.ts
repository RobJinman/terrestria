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
