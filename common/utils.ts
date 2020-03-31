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

export function inRange(x: number, min: number, max: number) {
  return x >= min && x <= max;
}

export function clamp(x: number, min: number, max: number) {
  return Math.min(Math.max(x, min), max);
}

export function union<T>(A: Set<T>, B: Set<T>): Set<T> {
  const C = new Set<T>(A);

  for (let b of B) {
    C.add(b);
  }

  return C;
}

export function addSetToSet<T>(src: Set<T>, dest: Set<T>) {
  for (let x of src) {
    dest.add(x);
  }
}

export function addToMapOfSets<K, V>(map: Map<K, Set<V>>, key: K, value: V) {
  if (!map.has(key)) {
    map.set(key, new Set<V>());
  }
  const values = map.get(key);
  if (values) {
    values.add(value);
  }
}
