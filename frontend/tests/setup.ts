import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";

import { server } from "./mocks/server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// jsdom doesn't implement matchMedia; ThemeContext uses it to read the OS
// color-scheme preference on first load.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

// jsdom doesn't implement scrolling; ChatPanel auto-scrolls to the newest message.
if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {};
}

