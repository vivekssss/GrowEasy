import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { records, originalHeaders, provider, customApiKey } = await req.json();

    if (!records || !Array.isArray(records)) {
      return NextResponse.json(
        { error: "Invalid payload: 'records' must be an array." },
        { status: 400 }
      );
    }

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

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        results: {
          type: Type.ARRAY,
          description: "List of mapped and skipped records corresponding to the input records.",
          items: {
            type: Type.OBJECT,
            properties: {
              originalIndex: { type: Type.INTEGER },
              isSkipped: { type: Type.BOOLEAN },
              skipReason: { type: Type.STRING },
              extracted: {
                type: Type.OBJECT,
                properties: {
                  created_at: { type: Type.STRING },
                  name: { type: Type.STRING },
                  email: { type: Type.STRING },
                  country_code: { type: Type.STRING },
                  mobile_without_country_code: { type: Type.STRING },
                  company: { type: Type.STRING },
                  city: { type: Type.STRING },
                  state: { type: Type.STRING },
                  country: { type: Type.STRING },
                  lead_owner: { type: Type.STRING },
                  crm_status: { type: Type.STRING },
                  crm_note: { type: Type.STRING },
                  data_source: { type: Type.STRING },
                  possession_time: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
              },
            },
            required: ["originalIndex", "isSkipped"],
          },
        },
      },
      required: ["results"],
    };

    if (provider === "openai") {
      const apiKey = customApiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "OpenAI API key is not configured. Please add it in your UI Configuration." },
          { status: 400 }
        );
      }

      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: prompt + "\nReturn a JSON object conforming strictly to the requested response schema: " + JSON.stringify(responseSchema) }
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
        }),
      });

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        throw new Error(`OpenAI API request failed: ${errorText}`);
      }

      const openaiData = await openaiResponse.json();
      const textResponse = openaiData.choices?.[0]?.message?.content;
      if (!textResponse) {
        throw new Error("Empty response from OpenAI API.");
      }

      const parsedResults = JSON.parse(textResponse);
      return NextResponse.json(parsedResults);

    } else if (provider === "anthropic") {
      const apiKey = customApiKey || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "Anthropic API key is not configured. Please add it in your UI Configuration." },
          { status: 400 }
        );
      }

      const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 4096,
          system: systemInstruction,
          messages: [
            {
              role: "user",
              content: prompt + "\nReturn ONLY a JSON object matching this schema. Do not output markdown code blocks or wrapper text, just raw JSON:\n" + JSON.stringify(responseSchema),
            }
          ],
          temperature: 0.1,
        }),
      });

      if (!anthropicResponse.ok) {
        const errorText = await anthropicResponse.text();
        throw new Error(`Anthropic API request failed: ${errorText}`);
      }

      const anthropicData = await anthropicResponse.json();
      const textResponse = anthropicData.content?.[0]?.text;
      if (!textResponse) {
        throw new Error("Empty response from Anthropic API.");
      }

      const parsedResults = JSON.parse(textResponse);
      return NextResponse.json(parsedResults);

    } else {
      const apiKey = customApiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "Gemini API key is not configured. Please add it in your UI Configuration." },
          { status: 400 }
        );
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "groweasy-importer",
          },
        },
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.1,
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("Empty response from Gemini API.");
      }

      const parsedResults = JSON.parse(text);
      return NextResponse.json(parsedResults);
    }
  } catch (error: any) {
    console.error("AI Mapping Endpoint Error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred while processing AI extraction." },
      { status: 500 }
    );
  }
}
