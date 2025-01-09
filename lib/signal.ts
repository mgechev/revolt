// Ryan's implementation from https://dev.to/ryansolid/building-a-reactive-library-from-scratch-1i0p

const context: any = [];

export type ReadableSignal<T> = () => T;

export interface WritableSignal<T> extends ReadableSignal<T> {
  set(value: T): void;
}

export type Effect = () => void;

export function signal<T>(value: T): WritableSignal<T> {
  const subscriptions = new Set<any>();

  const read = (): T => {
    const running = context[context.length - 1];
    if (running) {
      subscriptions.add(running);
      running.dependencies.add(subscriptions);
    }
    return value;
  };

  const set = (nextValue: T) => {
    value = nextValue;
    for (const sub of [...subscriptions]) {
      sub.execute();
    }
  };

  (read as any).set = set;
  return read as WritableSignal<T>;
}

function cleanup(running) {
  for (const dep of running.dependencies) {
    dep.delete(running);
  }
  running.dependencies.clear();
}

export function effect(fn: Effect) {
  const execute = () => {
    cleanup(running);
    context.push(running);
    try {
      fn();
    } finally {
      context.pop();
    }
  };

  const running: any = {
    execute,
    dependencies: new Set()
  };

  execute();
}