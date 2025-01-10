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
  if (typeof view === "string") {
    const node = document.createTextNode(view);
    root.append(node);
    return node;
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
    if (isDynamicBinding(binding)) {
      effect(() => {
        const value = binding();
        if (value === false) {
          element.removeAttribute(attribute);
          return;
        }
        element.setAttribute(attribute, value);
      });
      continue;
    }
    element.setAttribute(attribute, binding);
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
