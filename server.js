import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";

try {
  process.loadEnvFile();
} catch {
  // If .env is not present, environment variables from container/hosting are used
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json({ limit: "2mb" }));
app.use(express.static(__dirname));

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

app.get("/api/tutor/status", (req, res) => {
  res.json({
    configured: Boolean(process.env.GEMINI_API_KEY),
    model: "gemini-3.8-flash",
  });
});

app.post("/api/tutor", async (req, res) => {
  try {
    const ai = getAiClient();
    if (!ai) {
      return res.status(503).json({
        error: "Gemini API key is not configured on the server. Please attach an API key in Settings > Secrets.",
      });
    }

    const { messages, systemInstruction } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: String(m.content || "") }],
      }));

    if (contents.length === 0) {
      return res.status(400).json({ error: "At least one user message is required" });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents,
      config: {
        systemInstruction: systemInstruction || undefined,
      },
    });

    const reply = response.text || "";
    return res.json({ reply });
  } catch (error) {
    console.error("Gemini tutor error:", error);
    let message = error.message || "Failed to generate tutor response";
    try {
      const parsed = JSON.parse(message);
      if (parsed.error?.message) {
        message = parsed.error.message;
      }
    } catch {}
    if (message.includes("API key not valid") || message.includes("API_KEY_INVALID")) {
      message = "API key not valid. Please select or verify your API key in Settings > Secrets.";
    }
    return res.status(500).json({ error: message });
  }
});

// Fallback to index.html for client-side routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on http://0.0.0.0:${port}`);
});
