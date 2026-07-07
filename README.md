# GrowEasy - AI-Powered CSV Importer 🚀

An intelligent, high-performance CSV Importer designed to onboard messy lead sheets into the **GrowEasy CRM** format. Powered by **Gemini 3.5 Flash** and built with **Next.js**, **React 19**, and **Tailwind CSS v4**.

---

## Key Features

*   🧠 **Dynamic AI Column Mapping:** Automatically parses, cleans, and structures raw spreadsheets regardless of column layout, wording, or casing (e.g. mapping "Primary Contact" or "Alt Mobile" to structured CRM phone entries).
*   ⚡ **Client-Side Preview:** Instantly parses CSVs in-browser using `PapaParse` for quick preview rendering. No AI costs are incurred before confirming import.
*   🌗 **Gorgeous Dark Mode Support:** Includes a stateful theme toggler integrated directly into Next.js using Tailwind CSS v4 selector-based compilation.
*   📦 **Lightweight List Virtualization:** Uses a custom scroll container windowing renderer to render thousands of rows in the Results Dashboard with zero browser lag.
*   🔄 **Resilient Batch Processing:** Divides large datasets into batches of `15` to stay within token windows, prevent timeouts, and allow the user to **resume import** if a batch is interrupted.
*   🐋 **Dockerized Deployment:** Features a multi-stage production build configuration for containerized runs.

---

## Technology Stack

*   **Frontend:** Next.js 15, React 19, Tailwind CSS v4, Framer Motion, Lucide Icons.
*   **Backend:** Next.js Route Handlers, `@google/genai` (modern Gemini SDK).
*   **Testing:** Vitest, React Testing Library.
*   **Infrastructure:** Docker, Docker Compose, standalone output bundles.

---

## Getting Started

### Prerequisites

*   Node.js (v18 or higher)
*   NPM
*   Docker (Optional, for containerized run)

### 1. Environment Setup

Copy `.env.example` to `.env.local` (or `.env`):
```bash
cp .env.example .env.local
```

Set the variables inside `.env.local`:
```env
GEMINI_API_KEY="your-gemini-api-key-here"
APP_URL="http://localhost:3000"
```

### 2. Local Installation & Development

Run the following commands in the workspace root:

```bash
# Install dependencies
npm install

# Run the Next.js dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application in your browser.

### 3. Run Automated Tests

Run the Vitest test suite using:
```bash
npm run test
```

### 4. Running with Docker

Run the containerized application using Docker Compose:
```bash
# Build and run container
docker-compose up --build
```
The application will be accessible at [http://localhost:3000](http://localhost:3000).

---

## Architectural Details & Prompt Engineering

### Server-Side AI Schema Enforcement
The backend [app/api/import/route.ts](file:///c:/Users/Admin/Downloads/GrowEasy/app/api/import/route.ts) utilizes the modern `@google/genai` Type definitions to define a strict `responseSchema`. This guarantees that the LLM only outputs JSON records matching our standard CRM format:

```typescript
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    results: {
      type: Type.ARRAY,
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
              description: { type: Type.STRING }
            }
          }
        }
      }
    }
  }
};
```

### Prompt Strategy
The AI instructions enforce strict data transformations:
1.  **CRM Status Restrictions:** Restricts raw states (e.g. "Junk", "Spam", "Interested") to `GOOD_LEAD_FOLLOW_UP`, `DID_NOT_CONNECT`, `BAD_LEAD`, or `SALE_DONE`.
2.  **Date Normalization:** Formats all raw timestamp indicators so they are parser-safe using `new Date()`.
3.  **Invalid Row Skipping:** Identifies rows missing both email and mobile numbers, tags them as skipped, and sets `extracted` block to `null`.
4.  **Content Overflow Handling:** Extracts the primary email and phone, appending secondary emails/phones or miscellaneous notes directly to `crm_note`.
