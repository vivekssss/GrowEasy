import { describe, it, expect, vi } from "vitest";
import { POST } from "@/app/api/import/route";
import { NextRequest } from "next/server";


vi.mock("@google/genai", () => {
  class GoogleGenAI {
    models = {
      generateContent: vi.fn().mockResolvedValue({
        text: JSON.stringify({
          results: [
            {
              originalIndex: 0,
              isSkipped: false,
              skipReason: null,
              extracted: {
                created_at: "2026-05-13 14:20:48",
                name: "John Doe",
                email: "john.doe@example.com",
                country_code: "+91",
                mobile_without_country_code: "9876543210",
                company: "GrowEasy",
                city: "Mumbai",
                state: "Maharashtra",
                country: "India",
                lead_owner: "test@gmail.com",
                crm_status: "GOOD_LEAD_FOLLOW_UP",
                crm_note: null,
                data_source: "leads_on_demand",
                possession_time: null,
                description: null
              }
            }
          ]
        })
      })
    };
  }

  return {
    GoogleGenAI,
    Type: {
      OBJECT: "OBJECT",
      ARRAY: "ARRAY",
      STRING: "STRING",
      INTEGER: "INTEGER",
      BOOLEAN: "BOOLEAN"
    }
  };
});

describe("POST /api/import", () => {
  it("processes records successfully via mocked Gemini model", async () => {
    
    process.env.GEMINI_API_KEY = "dummy-api-key";

    const reqBody = {
      records: [
        {
          originalIndex: 0,
          data: {
            "First Name": "John",
            "Last Name": "Doe",
            "Email Id": "john.doe@example.com",
            "Primary Contact": "+919876543210"
          }
        }
      ],
      originalHeaders: ["First Name", "Last Name", "Email Id", "Primary Contact"]
    };

    const request = new NextRequest("http://localhost/api/import", {
      method: "POST",
      body: JSON.stringify(reqBody),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.results).toBeDefined();
    expect(json.results).toHaveLength(1);
    
    const lead = json.results[0].extracted;
    expect(lead.name).toBe("John Doe");
    expect(lead.crm_status).toBe("GOOD_LEAD_FOLLOW_UP");
    expect(lead.email).toBe("john.doe@example.com");
  });
  
  it("returns error status when process.env.GEMINI_API_KEY is not defined", async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const reqBody = {
      records: [],
      originalHeaders: []
    };

    const request = new NextRequest("http://localhost/api/import", {
      method: "POST",
      body: JSON.stringify(reqBody),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);

    const json = await response.json();
    expect(json.error).toContain("Gemini API key is not configured");

    
    process.env.GEMINI_API_KEY = originalKey;
  });
});
