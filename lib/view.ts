/** --- View & DOM Types --- **/

export type View =
  | ElementNode
  | ConditionalNode
  | IteratorNode
  | View[]
  | (() => any)
  | string
  | number
  | null
  | undefined;

export interface ElementNode {
  name: string;
  attributes?: Record<string, string | number | boolean | (() => any)>;
  events?: Record<string, EventListener>;
  children?: View | (() => View[]);
  ref?: (el: HTMLElement) => void;
}

export interface ConditionalNode {
  condition: () => any;
  then: View;
  else?: View;
}

export interface IteratorNode {
  collection: () => any[];
  items: (item: any, index: number) => View;
}

// Extension to handle the custom .view property assigned in renderElement
export interface ViewHTMLElement extends HTMLElement {
  view?: ElementNode;
}

/** --- Type Guards --- **/

export const isElement = (node: any): node is ElementNode => {
  return node && (node as ElementNode).name !== undefined;
};

export const isConditional = (node: any): node is ConditionalNode => {
  return node && (node as ConditionalNode).condition !== undefined;
};

export const isIterator = (node: any): node is IteratorNode => {
  return node && (node as IteratorNode).collection !== undefined;
};
