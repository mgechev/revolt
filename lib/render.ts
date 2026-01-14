import { effect } from "./signal";
import {
  View,
  ElementNode,
  ConditionalNode,
  IteratorNode,
  ViewHTMLElement,
  isElement,
  isConditional,
  isIterator
} from "./view";

/** --- Rendering Engine --- **/

export const render = (view: View, root: Node): Node | Node[] => {
  if (isConditional(view)) {
    return renderCondition(view, root);
  }
  if (isIterator(view)) {
    return renderIterator(view, root);
  }
  if (Array.isArray(view)) {
    const result: Node[] = [];
    for (const child of view) {
      const rendered = render(child, root);
      if (Array.isArray(rendered)) result.push(...rendered);
      else result.push(rendered);
    }
    return result;
  }
  if (typeof view === "function") {
    return renderDynamicText(view as () => string, root);
  }
  if (isElement(view)) {
    return renderElement(view, root);
  }

  // Handle primitive strings/numbers
  const node = document.createTextNode(String(view ?? ""));
  root.appendChild(node);
  return node;
};

const renderDynamicText = (view: () => string, root: Node): Text => {
  const node = document.createTextNode(view());
  effect(() => {
    const text = view();
    node.textContent = text;
  });
  root.appendChild(node);
  return node;
};

const renderCondition = (view: ConditionalNode, root: Node): Node | Node[] => {
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

const renderIterator = (view: IteratorNode, root: Node): Node | Node[] => {
  let result: Node | Node[] | undefined;
  effect(() => {
    const collection = view.collection();
    if (result) {
      destroy(result);
    }
    result = render(collection.map(view.items), root);
  });
  return result ?? [];
};

const renderElement = (view: ElementNode, root: Node): HTMLElement => {
  const element = document.createElement(view.name) as ViewHTMLElement;

  if (view.attributes) {
    for (const attribute in view.attributes) {
      const binding = view.attributes[attribute];
      if (typeof binding === 'function') {
        effect(() => {
          const value = binding();
          if (value === false) {
            element.removeAttribute(attribute);
            return;
          }
          element.setAttribute(attribute, value);
        });
      } else {
        if (binding === false) {
          element.removeAttribute(attribute);
        } else {
          element.setAttribute(attribute, String(binding));
        }
      }
    }
  }

  if (view.events) {
    for (const event in view.events) {
      element.addEventListener(event, view.events[event]);
    }
  }

  element.view = view;
  root.appendChild(element);

  if (view.children) {
    let children = view.children;
    if (typeof children === 'function') {
      const evaluated = children();
      if (Array.isArray(evaluated)) {
        render(evaluated, element);
      } else {
        render(evaluated, element);
      }
    } else {
      render(children, element);
    }
  }

  if (view.ref) {
    view.ref(element);
  }

  return element;
};

const destroy = (node: Node | Node[]): void => {
  if (Array.isArray(node)) {
    for (const child of node) {
      destroy(child);
    }
  } else {
    node.parentElement?.removeChild(node);

    const view = (node as ViewHTMLElement)?.view;
    if (!view || !view.events) {
      return;
    }

    for (const event in view.events) {
      node.removeEventListener(event, view.events[event]);
    }
  }
};
