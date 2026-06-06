import axios from "axios";
import { fetchAuthSession } from "aws-amplify/auth";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor — inject Cognito JWT token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Ignore if session not active
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — unified error formatting (no auth redirects)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const customError = {
      code: "INTERNAL_ERROR",
      message: "A communication exception has occurred with the clinical server.",
      detail: error?.message || "Unknown Axios connection issue.",
    };

    if (error.response?.data) {
      const apiResponse = error.response.data;
      if (apiResponse.error) {
        customError.code = apiResponse.error.code || "INTERNAL_ERROR";
        customError.message = apiResponse.error.message || customError.message;
        customError.detail = apiResponse.error.detail || customError.detail;
      } else if (apiResponse.detail) {
        customError.code = "VALIDATION_ERROR";
        customError.message = "The clinical data sent fails server-side validation checks.";
        customError.detail = JSON.stringify(apiResponse.detail);
      }
    }

    console.error(`[API Connection Exception][${customError.code}]:`, customError);
    return Promise.reject(customError);
  }
);
