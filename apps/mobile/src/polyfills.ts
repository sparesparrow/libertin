// Keep this module free of application imports. index.js must evaluate it
// before importing App because MSW inspects Web APIs during module loading.
import 'web-streams-polyfill';

type PolyfillGlobals = Record<string, any>;
const globals = globalThis as unknown as PolyfillGlobals;

// Hermes does not expose the complete browser event API expected by MSW 2's
// shared WebSocket/interceptor modules. These lightweight event shims are for
// mock-mode interception only; native networking remains React Native's.
if (typeof globals.Event === 'undefined') {
  globals.Event = class EventPolyfill {
    type: string;
    bubbles: boolean;
    cancelable: boolean;
    defaultPrevented = false;

    constructor(type: string, init: { bubbles?: boolean; cancelable?: boolean } = {}) {
      this.type = type;
      this.bubbles = init.bubbles ?? false;
      this.cancelable = init.cancelable ?? false;
    }

    preventDefault() {
      if (this.cancelable) this.defaultPrevented = true;
    }

    stopPropagation() {}
    stopImmediatePropagation() {}
  };
}

if (typeof globals.EventTarget === 'undefined') {
  globals.EventTarget = class EventTargetPolyfill {
    private listeners: Record<string, Set<(event: any) => void>> = {};

    addEventListener(type: string, listener: ((event: any) => void) | null) {
      if (!listener) return;
      (this.listeners[type] ??= new Set()).add(listener);
    }

    removeEventListener(type: string, listener: ((event: any) => void) | null) {
      if (listener) this.listeners[type]?.delete(listener);
    }

    dispatchEvent(event: { type: string }) {
      for (const listener of this.listeners[event.type] ?? []) listener(event);
      return true;
    }
  };
}

if (typeof globals.MessageEvent === 'undefined') {
  const EventBase = globals.Event as new (type: string, init?: Record<string, unknown>) => any;
  globals.MessageEvent = class MessageEventPolyfill extends EventBase {
    data: unknown;
    origin: string;
    lastEventId: string;
    source: unknown;
    ports: unknown[];

    constructor(type: string, init: Record<string, any> = {}) {
      super(type, init);
      this.data = init.data ?? null;
      this.origin = init.origin ?? '';
      this.lastEventId = init.lastEventId ?? '';
      this.source = init.source ?? null;
      this.ports = init.ports ?? [];
    }
  };
}

if (typeof globals.BroadcastChannel === 'undefined') {
  const EventTargetBase = globals.EventTarget as new () => any;
  globals.BroadcastChannel = class BroadcastChannelPolyfill extends EventTargetBase {
    name: string;

    constructor(name: string) {
      super();
      this.name = name;
    }

    postMessage(_message: unknown) {}
    close() {}
  };
}

// The React Native XHR implementation omits this browser constructor, which
// MSW's XHR interceptor can reference while it initializes.
if (typeof globals.XMLHttpRequestUpload === 'undefined') {
  globals.XMLHttpRequestUpload = class XMLHttpRequestUploadPolyfill {};
}

if (typeof globals.Document === 'undefined') {
  globals.Document = class DocumentPolyfill {};
}
