import axios from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

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
