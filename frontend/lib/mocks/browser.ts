import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);

export function initMocks() {
  if (typeof window === "undefined") return Promise.resolve();

  const isDev = process.env.NODE_ENV === "development";
  const isLocalhostApi = (process.env.NEXT_PUBLIC_API_URL || "").includes("localhost") || 
                         !(process.env.NEXT_PUBLIC_API_URL);

  if (isDev && isLocalhostApi) {
    console.log("[MSW] Conditional Mocking Engine Active (Developer Mode)");
    return worker.start({
      onUnhandledRequest: "bypass",
    });
  }

  return Promise.resolve();
}
