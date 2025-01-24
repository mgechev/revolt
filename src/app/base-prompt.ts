export const basePrompt = `

Here is a sample framework and a minimal application implemented with it that is in the app.js file. You are a professional web developer.
Use the specified framework and the sample app to develop a tetris game with this framework. Output the tetris game in JavaScript:


// signal.ts - signal implementation
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

function cleanup(running: any) {
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
    dependencies: new Set<any>()
  };

  execute();
}

// view.ts - view structure

import { ReadableSignal } from "./signal";

export type Binding = (() => string);
export type EventListener = <K extends keyof GlobalEventHandlersEventMap>(event: GlobalEventHandlersEventMap[K]) => void;

export interface When {
  condition: ReadableSignal<boolean>;
  then: View;
  else?: View;
}

export interface For<T> {
  collection: ReadableSignal<T>;
  items: (item: T, index: number) => ViewNode;
}

export interface ElementConfig {
  name: keyof HTMLElementTagNameMap;
  attributes?: Record<string, (() => false|string)>;
  children?: View;
  events?: {[key in keyof GlobalEventHandlersEventMap]?: EventListener};
  ref?: (node: Element) => void;
}

export type ViewNode = Binding | ElementConfig | When | For<any>;

export type View = ViewNode | ViewNode[] | View[];

export type Component = (() => View);

export const isElement = (node: any) => {
  return node.name !== undefined;
};

export const isDynamicBinding = (binding: (() => false|string)): binding is (() => false|string) => {
  return typeof binding === 'function';
};

export const isConditional = <T>(node: any): node is When => {
  return node.condition !== undefined;
};

export const isIterator = <T>(node: any): node is For<T> => {
  return node.collection !== undefined;
};


// render.ts - rendering implementation
import { effect } from "./signal";
import {
  ElementConfig,
  For,
  isConditional,
  isDynamicBinding,
  isIterator,
  View,
  When,
  EventListener
} from "./view";

export const render = (view: View, root: Element): Node | Node[] => {
  if (isConditional(view)) {
    return renderCondition(view, root);
  }
  if (isIterator(view)) {
    return renderIterator(view, root);
  }
  if (view instanceof Array) {
    const result: Node[] = [];
    for (const child of view) {
      result.push(render(child, root) as Node);
    }
    return result;
  }
  if (typeof view === "function") {
    return renderDynamicText(view, root);
  }
  return renderElement(view, root);
};

const renderDynamicText = (view: () => string, root: Element) => {
  const node = document.createTextNode(view());
  effect(() => {
    const text = view();
    node.textContent = text;
  });
  root.append(node);
  return node;
};

const renderCondition = (view: When, root: Element) => {
  let dom: Node | Node[] | undefined;
  effect(() => {
    const result = view.condition();
    if (dom) {
      destroy(dom);
    }
    if (result) {
      dom = render(view.then, root);
    } else if (view.else) {
      dom = render(view.else, root);
    }
  });
  return dom ?? [];
};

const renderIterator = (view: For<any>, root: Element) => {
  let collection = view.collection();
  let result: Node | Node[] | undefined;
  effect(() => {
    collection = view.collection();
    if (result) {
      destroy(result);
    }
    result = render(collection.map(view.items), root);
  });
  return result ?? [];
};

const renderElement = (view: ElementConfig, root: Element) => {
  const element = document.createElement(view.name);
  for (const attribute in view.attributes) {
    const binding = view.attributes[attribute];
    effect(() => {
      const value = binding();
      if (value === false) {
        element.removeAttribute(attribute);
        return;
      }
      element.setAttribute(attribute, value);
    });
  }
  for (const event in view.events) {
    element.addEventListener(event, view.events[event as keyof GlobalEventHandlersEventMap] as EventListener);
  }
  (element as any).view = view;
  root.append(element);
  if (view.children) {
    render(view.children, element);
  }
  if (view.ref) {
    view.ref(element);
  }
  return element;
};

const destroy = (node: Node | Node[]) => {
  if (node instanceof Array) {
    for (const child of node) {
      destroy(child);
    }
  } else {
    node.parentElement?.removeChild(node);
    const view = (node as any)?.view;
    if (!view) {
      return;
    }
    for (const event in view.events) {
      node.removeEventListener(event, view.events[event]);
    }
  }
};


// app.js - sample application
const Massive = () => {
    const arr = new Array(10000).fill('0');
    return {
        name: 'div',
        children: arr
    };
};
const Checkbox = (checked) => {
    return {
        name: "input",
        attributes: {
            type: () => "checkbox",
            checked
        },
    };
};
const TodoApp = () => {
    const todos = signal(["Buy milk", "Create a framework"]);
    let inputElement;
    const addTodo = () => {
        if (!inputElement) {
            return;
        }
        todos.set([...todos(), inputElement.value]);
        inputElement.value = "";
    };
    return [
        {
            name: "h1",
            children: () => "Todo App",
        },
        {
            name: "input",
            attributes: {
                type: () => "text",
            },
            ref(input) {
                inputElement = input;
            },
            events: {
                keydown(e) {
                    const event = e;
                    if (event.code === "Enter") {
                        addTodo();
                    }
                }
            },
        },
        {
            name: "button",
            children: () => "Add todo",
            events: {
                click: addTodo,
            },
        },
        {
            name: "ul",
            children: {
                collection: todos,
                items(item) {
                    return {
                        name: "li",
                        children: () => item,
                        events: {
                            click() {
                                todos.set(todos().filter((t) => t !== item));
                            },
                        },
                    };
                },
            }
        },
    ];
};
const App = () => {
    const state = signal(0);
    const bgColor = signal("red");
    setInterval(() => {
        state.set(state() + 1);
        bgColor.set(state() % 2 === 0 ? "red" : "blue");
    }, 1000);
    return {
        name: "section",
        children: [
            TodoApp(),
            {
                name: "div",
                attributes: {
                    id: () => "app",
                    style: () => \`background: \${bgColor()}; width: 70px; height: 50px; color: white; text-align: center; line-height: 50px;\`,
                },
                children: [() => \`Timer: \${state()}\`],
            },
            Checkbox(() => (state() % 2 === 0 ? "checked" : false)),
            {
                condition: () => state() % 2 === 0,
                then: Massive(),
                else: () => "Odd",
            },
        ],
        events: {
            click() {
                state.set(0);
            },
        },
    };
};
render(App(), document.body);

Using the framework and given the sample app as an example
`;