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
