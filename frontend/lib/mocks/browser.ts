import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);

export async function initMocks() {
  // Start MSW service worker to intercept all API calls with mock data for demo
  await worker.start({
    onUnhandledRequest: "bypass", // allow non-mocked requests to pass through
    serviceWorker: {
      url: "/mockServiceWorker.js",
    },
  });
}
