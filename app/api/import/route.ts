import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { records, originalHeaders } = await req.json();

    if (!records || !Array.isArray(records)) {
      return NextResponse.json(
        { error: "Invalid payload: 'records' must be an array." },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key is not configured. Please add GEMINI_API_KEY in Settings > Secrets." },
        { status: 500 }
      );
    }

    // Lazy initialize the modern @google/genai client with the API key inside the handler
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    // Define the strict structured response schema using the @google/genai Type enum
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        results: {
          type: Type.ARRAY,
          description: "List of mapped and skipped records corresponding to the input records.",
          items: {
            type: Type.OBJECT,
            properties: {
              originalIndex: { 
                type: Type.INTEGER, 
                description: "The zero-based index of the record in the input batch." 
              },
              isSkipped: { 
                type: Type.BOOLEAN, 
                description: "True if the record contains neither an email nor a mobile number, or is otherwise invalid." 
              },
              skipReason: { 
                type: Type.STRING, 
                description: "The reason for skipping (e.g., 'Missing email and mobile number'). Null if not skipped." 
              },
              extracted: {
                type: Type.OBJECT,
                description: "The mapped GrowEasy CRM lead object.",
                properties: {
                  created_at: { 
                    type: Type.STRING, 
                    description: "Lead creation date, must be convertible using JavaScript new Date(created_at). Format: YYYY-MM-DD HH:mm:ss. If raw date is missing, use current date/time." 
                  },
                  name: { 
                    type: Type.STRING, 
                    description: "Lead full name. If split into First Name/Last Name, concatenate them. Null if missing." 
                  },
                  email: { 
                    type: Type.STRING, 
                    description: "Primary email. If multiple emails exist, use the first, and append the rest to crm_note." 
                  },
                  country_code: { 
                    type: Type.STRING, 
                    description: "Country dialing code (e.g., +91, +1). Null if missing." 
                  },
                  mobile_without_country_code: { 
                    type: Type.STRING, 
                    description: "Mobile phone number without country code. If multiple numbers exist, use the first, and append the rest to crm_note." 
                  },
                  company: { 
                    type: Type.STRING, 
                    description: "Company name. Null if missing." 
                  },
                  city: { 
                    type: Type.STRING, 
                    description: "City name. Null if missing." 
                  },
                  state: { 
                    type: Type.STRING, 
                    description: "State name. Null if missing." 
                  },
                  country: { 
                    type: Type.STRING, 
                    description: "Country name. Null if missing." 
                  },
                  lead_owner: { 
                    type: Type.STRING, 
                    description: "Email address or name of the lead owner. Null if missing." 
                  },
                  crm_status: { 
                    type: Type.STRING, 
                    description: "Lead status. Map raw status to exactly one of: GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE. Map other terms contextually. Null if missing." 
                  },
                  crm_note: { 
                    type: Type.STRING, 
                    description: "Remarks, follow-up logs, other comments, or extra emails/mobile numbers. Concat multiple notes if needed. Null if missing." 
                  },
                  data_source: { 
                    type: Type.STRING, 
                    description: "Lead acquisition source. MUST match one of: leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots. Null if not confidently matched." 
                  },
                  possession_time: { 
                    type: Type.STRING, 
                    description: "Property possession time or timeframe. Null if missing." 
                  },
                  description: { 
                    type: Type.STRING, 
                    description: "Additional description, requirements, or logs. Null if missing." 
                  },
                },
              },
            },
            required: ["originalIndex", "isSkipped"],
          },
        },
      },
      required: ["results"],
    };

    const systemInstruction = `You are the core AI Mapper for GrowEasy CRM.
Your task is to take messy raw CSV records (represented as key-value JSON objects) and intelligently map, clean, and extract them into the standard GrowEasy CRM lead schema.

Strict Extraction and Mapping Rules:
1. CRM Status Mapping (crm_status):
   - You MUST map the raw status string into exactly one of these allowed values: GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE.
   - For example:
     * "Interested", "Reschedule", "Demo scheduled", "Follow up" -> GOOD_LEAD_FOLLOW_UP
     * "No response", "Busy", "Ringing", "Did not connect" -> DID_NOT_CONNECT
     * "Junk", "Wrong number", "Not interested", "Spam" -> BAD_LEAD
     * "Won", "Done", "Sale closed", "Closed", "Deal done", "Onboarding" -> SALE_DONE
   - If the raw data does not have a status or is completely ambiguous, leave it as null.

2. Data Source Mapping (data_source):
   - You MUST map raw campaign, source, or plot terms into exactly one of these allowed values: leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots.
   - If none match confidently, leave it as null.

3. Date Format (created_at):
   - Format the lead creation date so it is convertible using JavaScript: new Date(created_at).
   - Recommended format: "YYYY-MM-DD HH:mm:ss" (e.g. "2026-05-13 14:20:48").
   - If the raw row contains no date/time, use the current date/time (approx. 2026-07-06 23:24:00 or current date).

4. Handle Multiple Emails and Mobile Numbers:
   - If a record has multiple email addresses, extract the first one into the 'email' field. Append any additional email addresses into 'crm_note' with a label like "Additional Emails: ...".
   - If a record has multiple phone/mobile numbers, extract the first mobile into 'mobile_without_country_code' and its dial code into 'country_code'. Append the additional phone numbers into 'crm_note' with a label like "Additional Phones: ...".

5. Skip Condition (CRITICAL):
   - If a record contains NEITHER an email nor a mobile number, you MUST set isSkipped to true and skipReason to 'Missing email and mobile number'. In this case, set 'extracted' to null.
   - Otherwise, set isSkipped to false and skipReason to null.

Parse all input records carefully, maps columns semantically, and returns structured data matching the schema.`;

    const prompt = `Here are the original headers of the CSV file for structural context:
${JSON.stringify(originalHeaders)}

Process the following batch of raw CSV records:
${JSON.stringify(records)}`;

    // Call the Gemini API with structured JSON output configured
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.1, // Low temperature for high precision and strict rule compliance
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini API.");
    }

    const parsedResults = JSON.parse(text);
    return NextResponse.json(parsedResults);
  } catch (error: any) {
    console.error("AI Mapping Endpoint Error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred while processing AI extraction." },
      { status: 500 }
    );
  }
}
