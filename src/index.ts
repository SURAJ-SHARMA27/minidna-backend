import "dotenv/config";
import express from "express";
import cors from "cors";
import { prisma } from "./lib/prisma.js";
import { groq } from "./lib/groq.js";
import { extractItemPrompt } from "./prompts/extractItem.js";
import { generateFingerprint } from "./utils/fingerprint.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_, res) => {
  res.json({ status: "MiniDNA backend running 🚀" });
});

// Cloud Run uses PORT env var, defaults to 8080 for production
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.post("/items", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "url is required" });
    }

    // Step 1: Extract structured data via LLM
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: extractItemPrompt(url),
        },
      ],
      temperature: 0,
    });

    const raw = completion?.choices[0]?.message.content;

    if (!raw) {
      throw new Error("Empty LLM response");
    }

    // Strip markdown code blocks if present
    const jsonString = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(jsonString);

    // Step 2: Handle unsupported URLs
    if (!parsed.supported) {
      return res.status(400).json({
        error: parsed.message || "🎯 We're focusing on physical products right now!",
      });
    }

    // Step 3: Generate fingerprint for duplicate detection
    const fingerprint = generateFingerprint({
      brand: parsed.brand,
      product_line: parsed.product_line,
      core_type: parsed.core_type,
      target_user: parsed.target_user,
    });

    // Step 4: Check for existing item with same fingerprint
    const existingItem = await prisma.item.findFirst({
      where: { fingerprint },
    });

    let canonicalId: string | null = null;
    let confidenceScore = 1.0;

    if (existingItem) {
      // Duplicate found - link to canonical
      canonicalId = existingItem.canonicalId ?? existingItem.id;
      confidenceScore = 0.95; // High confidence for exact fingerprint match
    }

    // Step 5: Create new item entry
    const item = await prisma.item.create({
      data: {
        sourceUrl: url,
        title: parsed.title || `${parsed.brand} ${parsed.product_line}`,
        description: parsed.description,
        category: parsed.core_type,
        attributes: {
          brand: parsed.brand,
          product_line: parsed.product_line,
          target_user: parsed.target_user,
          key_attributes: parsed.key_attributes,
          variant_attributes: parsed.variant_attributes,
        },
        fingerprint,
        canonicalId,
        confidenceScore,
      },
    });

    // Step 6: Return result with duplicate info
    res.json({
      ...item,
      isDuplicate: !!existingItem,
      canonicalItemId: canonicalId,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
