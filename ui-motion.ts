export type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void | Promise<void>) => { finished: Promise<void> };
};

export function runUiTransition(update: () => void) {
  const documentWithTransitions = document as ViewTransitionDocument;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!documentWithTransitions.startViewTransition || reduceMotion) {
    update();
    return;
  }

  documentWithTransitions.startViewTransition(update);
}
