import { http, HttpResponse } from "msw";
import { DEMO } from "../constants";
import {
  mockPatientList,
  mockPatients,
  priyaForecastPayload,
  vikramForecastPayload,
  mockGuardianCircle,
  mockCityInventory,
  mockMatches
} from "./fixtures";
import type { ApiResponse, HbReadingResponse, MobilizationStatusResponse } from "@/../shared/contracts/api.types";

// In-memory state tracking for dynamic demo transitions
let dynamicSureshStatus: "pending" | "active" = "pending";
let dynamicMatchStatus: "pending" | "approved" = "pending";
const sessionReadings: any[] = [];

export const handlers = [
  // 1. Health Ping
  http.get("*/health", () => {
    return HttpResponse.json({
      status: "ok",
      version: "1.0.0",
    });
  }),

  // 2. List Patients
  http.get("*/api/v1/patients", () => {
    return HttpResponse.json({
      success: true,
      data: mockPatientList,
      error: null,
    });
  }),

  // 3. Get Patient Detail
  http.get("*/api/v1/patients/:patient_id", ({ params }) => {
    const { patient_id } = params;
    const patient = mockPatients.find((p) => p.id === patient_id);

    if (!patient) {
      return HttpResponse.json(
        {
          success: false,
          data: null,
          error: { code: "PATIENT_NOT_FOUND", message: "Patient was not found." },
        },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: {
        ...patient,
        demographics_verified: true,
        phenotype_flags_verified: true,
      },
      error: null,
    });
  }),

  // 4. Get Forecast
  http.get("*/api/v1/patients/:patient_id/forecast", ({ params }) => {
    const { patient_id } = params;
    
    if (patient_id === DEMO.VIKRAM_ID) {
      return HttpResponse.json({
        success: true,
        data: vikramForecastPayload,
        error: null,
      });
    }

    // Embed session readings dynamically
    const baseForecast = { ...priyaForecastPayload };
    baseForecast.historical_readings = [
      ...priyaForecastPayload.historical_readings,
      ...sessionReadings,
    ];

    return HttpResponse.json({
      success: true,
      data: baseForecast,
      error: null,
    });
  }),

  // 5. Log Hb Reading
  http.post("*/api/v1/patients/:patient_id/hb-reading", async ({ params, request }) => {
    const { patient_id } = params;
    const body = (await request.json()) as any;

    const newReading = {
      id: `reading_logged_${Date.now()}`,
      patient_id: patient_id as string,
      hb_value: Number(body.hb_value),
      reading_date: body.reading_date || new Date().toISOString().split("T")[0]!,
      post_transfusion: !!body.post_transfusion,
      units_transfused: body.post_transfusion ? Number(body.units_transfused || 2) : null,
      hb_rise_per_unit: body.post_transfusion ? 1.85 : null,
    };

    sessionReadings.push(newReading);

    return HttpResponse.json({
      success: true,
      data: {
        ...newReading,
        message: "Hemoglobin reading successfully saved to database.",
      } as HbReadingResponse,
      error: null,
    });
  }),

  // 6. Get Guardian Circle
  http.get("*/api/v1/patients/:patient_id/guardian-circle", ({ params }) => {
    // Dynamic Suresh confirmation details
    const baseCircle = { ...mockGuardianCircle };
    baseCircle.guardians = mockGuardianCircle.guardians.map((g) => {
      if (g.id === DEMO.GUARDIAN_SURESH_ID) {
        return {
          ...g,
          status: dynamicSureshStatus,
        };
      }
      return g;
    });

    // Update Scores based on Suresh confirmation
    if (dynamicSureshStatus === "active") {
      baseCircle.coverage_score = 100; // All 8 active!
      baseCircle.engagement_score = 98;
      baseCircle.mobilization_status = "confirmed";
    }

    return HttpResponse.json({
      success: true,
      data: baseCircle,
      error: null,
    });
  }),

  // 7. Mobilize Guardian Circle
  http.post("*/api/v1/patients/:patient_id/guardian-circle/mobilize", ({ params }) => {
    dynamicSureshStatus = "active"; // Suresh instantly confirms in demo transition

    return HttpResponse.json({
      success: true,
      data: {
        patient_id: params.patient_id as string,
        mobilization_status: "confirmed" as const,
        active_channels: ["sms", "whatsapp"],
        contacted_count: 8,
        message: "SMS and WhatsApp broadcasts successfully dispatched. Suresh confirmed active.",
      } as MobilizationStatusResponse,
      error: null,
    });
  }),

  // 8. Get City Grid Inventory
  http.get("*/api/v1/grid/city/:city_code", () => {
    // Dynamic match status update
    const baseGrid = { ...mockCityInventory };
    baseGrid.active_matches = mockMatches.map((m) => ({
      ...m,
      status: dynamicMatchStatus as any,
    }));

    if (dynamicMatchStatus === "approved") {
      baseGrid.city_health_score = 85; // Health score goes up!
    }

    return HttpResponse.json({
      success: true,
      data: baseGrid,
      error: null,
    });
  }),

  // 9. Approve Match
  http.post("*/api/v1/grid/matches/:match_id/approve", () => {
    dynamicMatchStatus = "approved"; // Match becomes approved

    return HttpResponse.json({
      success: true,
      data: "Transfer match successfully approved. Stocks updated in database.",
      error: null,
    });
  }),

  // 10. Saathi AI Chatbot Assistant message queries
  http.post("*/api/v1/chatbot/message", async ({ request }) => {
    const { message } = (await request.json()) as any;
    const lowerMessage = (message || "").toLowerCase();

    let reply = "";
    let context_detected: any = {};

    if (lowerMessage.includes("priya") && (lowerMessage.includes("hb") || lowerMessage.includes("hemoglobin"))) {
      reply = "Priya Sharma's current hemoglobin is 7.2 g/dL, recorded on Oct 20, 2024. Her next transfusion is predicted for Nov 03, 2024 (92% confidence range: Nov 01 - Nov 05).";
      context_detected = {
        patient_name: "Priya Sharma",
        current_hb: 7.2,
      };
    } else if (lowerMessage.includes("raju") && (lowerMessage.includes("eligible") || lowerMessage.includes("donation"))) {
      reply = "Raju Prasad's next eligible donation date is November 10, 2024 (currently in cooldown). He has donated 5 times overall with an average response latency of 1.5 hours.";
      context_detected = {
        guardian_name: "Raju Prasad",
        next_eligible_date: "2024-11-10",
      };
    } else if (lowerMessage.includes("suresh") && (lowerMessage.includes("status") || lowerMessage.includes("pending"))) {
      reply = "Suresh Kumar's donation status is currently pending. He is next eligible starting October 20, 2024, and has a response latency average of 8.2 hours.";
      context_detected = {
        guardian_name: "Suresh Kumar",
        next_eligible_date: "2024-10-20",
      };
    } else if (lowerMessage.includes("alloimmunization")) {
      reply = "Alloimmunization occurs when a patient develops antibodies against foreign red blood cell antigens from multiple transfusions. Vikram Reddy is flagged for severe alloimmunization in the current cycle (+0.9 g/dL rise/unit delta anomaly), which requires extended Kell-negative and Duffy-negative matched donor inventory.";
    } else if (lowerMessage.includes("vikram") && (lowerMessage.includes("hb") || lowerMessage.includes("hemoglobin"))) {
      reply = "Vikram Reddy's current Hb is 6.8 g/dL, recorded on Oct 20, 2024. He is flagged for severe alloimmunization, and his next transfusion is predicted for Nov 07, 2024.";
      context_detected = {
        patient_name: "Vikram Reddy",
        current_hb: 6.8,
      };
    } else {
      reply = "I'm Saathi, your RaktaSetu assistant. Ask me about Priya's Hb levels, Raju's eligibility date, Suresh's pending status, or alloimmunization warnings in our network.";
    }

    return HttpResponse.json({
      success: true,
      data: {
        reply,
        context_detected,
      },
      error: null,
    });
  }),

  // 11. Reset Sandbox Mocks
  http.post("*/api/v1/reset-demo", () => {
    resetDemoMocks();
    return HttpResponse.json({
      success: true,
      data: "Clinical sandbox environment successfully reset.",
      error: null,
    });
  }),
];
export const resetDemoMocks = () => {
  dynamicSureshStatus = "pending";
  dynamicMatchStatus = "pending";
  sessionReadings.length = 0;
};
