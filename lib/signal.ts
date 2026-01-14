/** --- Reactivity Types --- **/

export interface RunningEffect {
  execute: () => void;
  dependencies: Set<Set<RunningEffect>>;
}

export interface Signal<T> {
  (): T;
  set: (nextValue: T) => void;
}

const context: RunningEffect[] = [];

export function signal<T>(value: T): Signal<T> {
  const subscriptions = new Set<RunningEffect>();

  const read: any = () => {
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

  read.set = set;
  return read as Signal<T>;
}

function cleanup(running: RunningEffect) {
  for (const dep of running.dependencies) {
    dep.delete(running);
  }
  running.dependencies.clear();
}

export function effect(fn: () => void) {
  const execute = () => {
    cleanup(running);
    context.push(running);
    try {
      fn();
    } finally {
      context.pop();
    }
  };

  const running: RunningEffect = {
    execute,
    dependencies: new Set()
  };

  execute();
}