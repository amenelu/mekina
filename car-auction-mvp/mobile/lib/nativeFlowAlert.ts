import { Alert, Platform } from "react-native";

type WebDialogButton = {
  text: string;
  variant?: "primary" | "cancel" | "destructive";
  onPress?: () => void | Promise<void>;
};

type WebDialogOptions = {
  title: string;
  message: string;
  buttons: WebDialogButton[];
};

const WEB_ALERT_STYLE_ID = "mekina-web-alert-styles";

function canUseWebDialog() {
  return (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    typeof document !== "undefined"
  );
}

function ensureWebAlertStyles() {
  if (document.getElementById(WEB_ALERT_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = WEB_ALERT_STYLE_ID;
  style.textContent = `
    .mekina-web-alert-overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: rgba(7, 10, 15, 0.72);
      backdrop-filter: blur(7px);
    }
    .mekina-web-alert-card {
      position: relative;
      width: min(420px, 100%);
      border: 1px solid #313843;
      border-radius: 14px;
      background: #1c212b;
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
      padding: 22px;
      color: #f8f8f8;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      outline: none;
    }
    .mekina-web-alert-close {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 34px;
      height: 34px;
      border: 1px solid transparent;
      border-radius: 999px;
      background: transparent;
      color: #8a94a3;
      font-size: 22px;
      line-height: 30px;
      cursor: pointer;
    }
    .mekina-web-alert-close:hover {
      border-color: #313843;
      background: #14181f;
      color: #f8f8f8;
    }
    .mekina-web-alert-close:focus-visible {
      outline: 3px solid rgba(163, 112, 247, 0.35);
      outline-offset: 2px;
    }
    .mekina-web-alert-topline {
      width: 42px;
      height: 3px;
      border-radius: 999px;
      background: #a370f7;
      margin-bottom: 16px;
    }
    .mekina-web-alert-title {
      margin: 0;
      font-size: 20px;
      line-height: 1.25;
      font-weight: 750;
      letter-spacing: 0;
    }
    .mekina-web-alert-message {
      margin-top: 10px;
      color: #c8ced8;
      font-size: 14px;
      line-height: 1.55;
      white-space: pre-line;
    }
    .mekina-web-alert-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 22px;
    }
    .mekina-web-alert-button {
      min-height: 42px;
      border: 1px solid #313843;
      border-radius: 9px;
      padding: 0 16px;
      color: #f8f8f8;
      background: #14181f;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
    }
    .mekina-web-alert-button:hover {
      border-color: #4a5361;
      background: #202633;
    }
    .mekina-web-alert-button:focus-visible {
      outline: 3px solid rgba(163, 112, 247, 0.35);
      outline-offset: 2px;
    }
    .mekina-web-alert-button-primary {
      border-color: #a370f7;
      background: #a370f7;
      color: #ffffff;
    }
    .mekina-web-alert-button-primary:hover {
      border-color: #b892ff;
      background: #b083fb;
    }
    .mekina-web-alert-button-destructive {
      border-color: #e35d6a;
      background: #e35d6a;
      color: #ffffff;
    }
    .mekina-web-alert-button-destructive:hover {
      border-color: #f27b86;
      background: #ec6d78;
    }
  `;
  document.head.appendChild(style);
}

function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string
) {
  const element = document.createElement(tag);
  element.className = className;
  return element;
}

function showWebDialog({ title, message, buttons }: WebDialogOptions) {
  ensureWebAlertStyles();

  const overlay = createElement("div", "mekina-web-alert-overlay");
  const card = createElement("div", "mekina-web-alert-card");
  const closeButton = createElement("button", "mekina-web-alert-close");
  const topline = createElement("div", "mekina-web-alert-topline");
  const titleElement = createElement("h2", "mekina-web-alert-title");
  const messageElement = createElement("div", "mekina-web-alert-message");
  const actions = createElement("div", "mekina-web-alert-actions");
  const titleId = `mekina-web-alert-title-${Date.now()}`;
  const safeButtons = buttons.length
    ? buttons
    : [{ text: "OK", variant: "primary" as const }];
  let closed = false;

  titleElement.id = titleId;
  titleElement.textContent = title;
  messageElement.textContent = message;
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-modal", "true");
  card.setAttribute("aria-labelledby", titleId);
  card.tabIndex = -1;
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Close alert");
  closeButton.textContent = "×";

  const getDismissButton = (): WebDialogButton =>
    safeButtons.find((button) => button.variant === "cancel") || {
      text: "Dismiss",
      variant: "cancel",
    };

  const close = (button: WebDialogButton) => {
    if (closed) return;
    closed = true;
    document.removeEventListener("keydown", handleKeyDown);
    overlay.remove();
    void button.onPress?.();
  };

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== "Escape") return;
    close(getDismissButton());
  }

  closeButton.addEventListener("click", () => close(getDismissButton()));

  safeButtons.forEach((button) => {
    const buttonElement = createElement("button", "mekina-web-alert-button");
    buttonElement.type = "button";
    buttonElement.textContent = button.text;
    if (button.variant === "destructive") {
      buttonElement.classList.add("mekina-web-alert-button-destructive");
    } else if (button.variant !== "cancel") {
      buttonElement.classList.add("mekina-web-alert-button-primary");
    }
    buttonElement.addEventListener("click", () => close(button));
    actions.appendChild(buttonElement);
  });

  overlay.addEventListener("click", (event) => {
    if (event.target !== overlay) return;
    close(getDismissButton());
  });

  card.append(closeButton, topline, titleElement, messageElement, actions);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  document.addEventListener("keydown", handleKeyDown);

  const preferredButton =
    actions.querySelector<HTMLButtonElement>(".mekina-web-alert-button-primary") ||
    actions.querySelector<HTMLButtonElement>("button");
  window.setTimeout(() => {
    (preferredButton || card).focus();
  }, 0);
}

export function showNativeFlowAlert(
  title: string,
  message: string,
  onPress?: () => void | Promise<void>,
  buttonText = "OK"
) {
  if (canUseWebDialog()) {
    showWebDialog({
      title,
      message,
      buttons: [{ text: buttonText, variant: "primary", onPress }],
    });
    return;
  }

  Alert.alert(title, message, [{ text: buttonText, onPress }]);
}

export function showNativeFlowConfirm({
  title,
  message,
  confirmText,
  cancelText = "Cancel",
  destructive = false,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  if (canUseWebDialog()) {
    showWebDialog({
      title,
      message,
      buttons: [
        { text: cancelText, variant: "cancel" },
        {
          text: confirmText,
          variant: destructive ? "destructive" : "primary",
          onPress: onConfirm,
        },
      ],
    });
    return;
  }

  Alert.alert(title, message, [
    { text: cancelText, style: "cancel" },
    {
      text: confirmText,
      style: destructive ? "destructive" : "default",
      onPress: onConfirm,
    },
  ]);
}
