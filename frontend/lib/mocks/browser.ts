import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);

export function initMocks() {
  // MSW disabled — frontend calls real FastAPI backend (RDS database)
  return Promise.resolve();
}
