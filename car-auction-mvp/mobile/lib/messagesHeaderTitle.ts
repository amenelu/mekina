type Listener = () => void;

const DEFAULT_MESSAGES_TITLE = "messages";

let currentTitle = DEFAULT_MESSAGES_TITLE;
const listeners = new Set<Listener>();

export function getMessagesHeaderTitle() {
  return currentTitle;
}

export function setMessagesHeaderTitle(title?: string | null) {
  const nextTitle = title?.trim() || DEFAULT_MESSAGES_TITLE;
  if (nextTitle === currentTitle) {
    return;
  }

  currentTitle = nextTitle;
  listeners.forEach((listener) => listener());
}

export function resetMessagesHeaderTitle() {
  setMessagesHeaderTitle(DEFAULT_MESSAGES_TITLE);
}

export function subscribeMessagesHeaderTitle(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
