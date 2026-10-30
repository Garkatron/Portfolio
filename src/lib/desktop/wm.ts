// Thin desktop-oriented layer over SLAOS (https://github.com/Garkatron/SLAOS).
//
// SLAOS owns window/process lifecycle; it deliberately leaves the *look* and
// the direct-manipulation bits (drag, focus order) to the frame factory. This
// module supplies a frame that matches the portfolio's editor style and adds:
//   - pointer dragging from the title bar,
//   - click-to-focus (z-index stacking + `.is-focused`),
//   - a small registry so the taskbar can focus windows by id.
import {
  WindowManager,
  type FrameParts,
  type WindowControls,
  type WindowHandle,
  type WindowProps,
} from "slaos";

export interface OsWindowLabels {
  close: string;
  minimize: string;
  maximize: string;
}

export interface OsWindowProps extends WindowProps {
  /** Stable app key ("route", "player", "syslog"); used by the taskbar. */
  appId: string;
  labels?: OsWindowLabels;
  /** Called when the window is raised (click, spawn, taskbar). */
  onFocus?: () => void;
}

let zCounter = 10;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function focusFrame(frame: HTMLElement): void {
  zCounter += 1;
  frame.style.zIndex = String(zCounter);
  const stage = frame.parentElement;
  stage?.querySelectorAll<HTMLElement>(".os-window").forEach((win) => {
    win.classList.toggle("is-focused", win === frame);
  });
}

function initialPosition(
  props: OsWindowProps,
  stage: DOMRect,
  width: number,
  height: number,
): [number, number] {
  const pad = 16;
  const x =
    typeof props.initialX === "number"
      ? props.initialX
      : props.initialX === "left"
        ? pad
        : props.initialX === "right"
          ? stage.width - width - pad
          : (stage.width - width) / 2;
  const y =
    typeof props.initialY === "number"
      ? props.initialY
      : props.initialY === "top"
        ? pad
        : props.initialY === "bottom"
          ? stage.height - height - pad
          : (stage.height - height) / 2;
  return [
    clamp(x, 0, Math.max(0, stage.width - width)),
    clamp(y, 0, Math.max(0, stage.height - height)),
  ];
}

function buildFrame(container: HTMLElement, props: OsWindowProps): FrameParts {
  const stage = container.getBoundingClientRect();
  const pad = 16;
  const width = clamp(props.width, 240, Math.max(240, stage.width - pad * 2));
  const height = clamp(props.height, 160, Math.max(160, stage.height - pad * 2));
  const [left, top] = initialPosition(props, stage, width, height);

  const frame = document.createElement("section");
  frame.className = "os-window";
  frame.dataset.app = props.appId;
  frame.setAttribute("role", "dialog");
  frame.setAttribute("aria-label", props.title ?? "Window");
  frame.style.left = `${left}px`;
  frame.style.top = `${top}px`;
  frame.style.width = `${width}px`;
  frame.style.height = `${height}px`;
  frame.style.minWidth = `${props.minWidth ?? 240}px`;
  frame.style.minHeight = `${props.minHeight ?? 160}px`;

  const bar = document.createElement("div");
  bar.className = "os-window-bar";

  const dots = document.createElement("span");
  dots.className = "os-window-dots";
  dots.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 3; i++) dots.append(document.createElement("i"));

  const title = document.createElement("span");
  title.className = "os-window-title px";
  title.textContent = props.title ?? "window";

  const controls = document.createElement("span");
  controls.className = "os-window-controls";
  const labels = props.labels ?? { close: "Close", minimize: "Minimize", maximize: "Maximize" };

  const makeControl = (name: string, label: string, glyph: string) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `os-ctrl os-ctrl-${name}`;
    button.setAttribute("aria-label", label);
    button.title = label;
    button.textContent = glyph;
    return button;
  };

  const minimize = makeControl("min", labels.minimize, "─");
  const maximize = makeControl("max", labels.maximize, "□");
  const close = makeControl("close", labels.close, "×");
  controls.append(minimize, maximize, close);
  bar.append(dots, title, controls);

  const body = document.createElement("div");
  body.className = "os-window-body";
  const content = document.createElement("div");
  content.className = "os-window-content";
  body.append(content);

  const resizer = document.createElement("span");
  resizer.className = "os-resize";
  resizer.setAttribute("aria-hidden", "true");

  frame.append(bar, body, resizer);

  resizer.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    focusFrame(frame);

    const stageRect = container.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = frame.offsetWidth;
    const startHeight = frame.offsetHeight;
    const left = parseFloat(frame.style.left) || 0;
    const top = parseFloat(frame.style.top) || 0;
    const minWidth = props.minWidth ?? 240;
    const minHeight = props.minHeight ?? 160;
    const maxWidth = Math.max(minWidth, stageRect.width - left);
    const maxHeight = Math.max(minHeight, stageRect.height - top);

    const onMove = (move: PointerEvent) => {
      frame.style.width = `${clamp(startWidth + move.clientX - startX, minWidth, maxWidth)}px`;
      frame.style.height = `${clamp(startHeight + move.clientY - startY, minHeight, maxHeight)}px`;
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  });

  // Raise on any interaction, including clicks on the content.
  frame.addEventListener("pointerdown", () => {
    focusFrame(frame);
    props.onFocus?.();
  });

  // Drag by the title bar. Buttons keep their own click handling.
  bar.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    if ((event.target as Element).closest("button")) return;
    event.preventDefault();

    const stageRect = container.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = parseFloat(frame.style.left) || 0;
    const startTop = parseFloat(frame.style.top) || 0;
    const maxLeft = Math.max(0, stageRect.width - frame.offsetWidth);
    const maxTop = Math.max(0, stageRect.height - frame.offsetHeight);

    const onMove = (move: PointerEvent) => {
      frame.style.left = `${clamp(startLeft + move.clientX - startX, 0, maxLeft)}px`;
      frame.style.top = `${clamp(startTop + move.clientY - startY, 0, maxTop)}px`;
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      frame.classList.remove("is-dragging");
    };

    frame.classList.add("is-dragging");
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  });

  bar.addEventListener("dblclick", (event) => {
    if ((event.target as Element).closest("button")) return;
    maximize.click();
  });

  const controlsHandle: WindowControls = { close, hidden: minimize, maximize };

  return {
    frame,
    getContent: () => content,
    ready: Promise.resolve(controlsHandle),
  };
}

export class DesktopWM {
  private readonly wm: WindowManager;
  private readonly frames = new Map<number, HTMLElement>();
  private readonly pending: HTMLElement[] = [];

  constructor(container: HTMLElement) {
    this.wm = new WindowManager(container, <P extends WindowProps>(props: P): FrameParts => {
      const parts = buildFrame(container, props as unknown as OsWindowProps);
      this.pending.push(parts.frame);
      return parts;
    });
  }

  /**
   * Opens a window and paints it once. The view receives the element the
   * caller can fill with static HTML or a Preact root.
   */
  async open(
    props: OsWindowProps,
    view: (root: HTMLElement) => void,
  ): Promise<WindowHandle> {
    const handle = await this.wm.spawn({ view: (root) => view(root) }, props);
    const frame = this.pending.shift();
    if (frame) this.frames.set(handle.id, frame);
    handle.render(() => {});
    return handle;
  }

  focus(id: number): void {
    const frame = this.frames.get(id);
    if (frame) focusFrame(frame);
  }
}
