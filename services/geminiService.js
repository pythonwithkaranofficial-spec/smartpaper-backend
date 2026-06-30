const { GoogleGenAI } = require("@google/genai");
const { generateAndCacheImage } = require("./imageService");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callGeminiWithRetry(prompt, isJson = true) {
  const retryDelays = [0, 3000, 6000, 10000];
  const modelChain = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"];
  let modelIndex = 0;

  for (let attempt = 1; attempt <= 4; attempt++) {
    const currentModel = modelChain[modelIndex];
    try {
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: prompt,
        config: isJson ? { responseMimeType: "application/json" } : {}
      });
      return response.text;
    } catch (error) {
      console.log(`[MODEL FAILED] Attempt ${attempt} failed with model ${currentModel}. Error: ${error.message}`);
      const isRetryable = error.message?.includes('503') || 
                          error.message?.includes('UNAVAILABLE') || 
                          error.message?.includes('429');

      if (isRetryable && attempt < 4) {
        if (modelIndex < modelChain.length - 1) modelIndex++;
        await delay(retryDelays[attempt]);
      } else {
        throw error;
      }
    }
  }
}


async function processQuestionsForImages(questions, paperMeta, onProgress) {
  if (!questions || !Array.isArray(questions)) return;
  const imagePromises = [];

  for (let q of questions) {
    if (q.requiresImage && q.imagePrompt) {
      const p = generateAndCacheImage({
        class: paperMeta.grade,
        subject: paperMeta.subject,
        chapter: q.chapter || paperMeta.chapters[0] || 'General',
        diagramType: q.diagramType || 'General Diagram',
        prompt: q.imagePrompt,
        cbseLevel: paperMeta.difficulty
      }, onProgress).then(hash => {
        if (hash) {
          q.diagramUrl = `/api/image/${hash}`;
        } else {
          q.text += "\n\n[Diagram unavailable. Please regenerate later.]";
        }
      });
      imagePromises.push(p);
    }
    if (q.subQuestions) {
      for (let sub of q.subQuestions) {
        if (sub.requiresImage && sub.imagePrompt) {
          const subP = generateAndCacheImage({
            class: paperMeta.grade,
            subject: paperMeta.subject,
            chapter: sub.chapter || q.chapter || paperMeta.chapters[0] || 'General',
            diagramType: sub.diagramType || 'General Diagram',
            prompt: sub.imagePrompt,
            cbseLevel: paperMeta.difficulty
          }, onProgress).then(hash => {
            if (hash) {
              sub.diagramUrl = `/api/image/${hash}`;
            } else {
              sub.text += "\n\n[Diagram unavailable. Please regenerate later.]";
            }
          });
          imagePromises.push(subP);
        }
      }
    }
  }
  
  if (imagePromises.length > 0) {
    onProgress("progress", { step: "Checking Diagram Requirements", status: "processing" });
    await Promise.all(imagePromises);
  }
}

// Old method for backward compatibility
async function generatePaper(prompt) {
  return await callGeminiWithRetry(prompt, false);
}

// New Streaming & Unified method
async function generatePaperStream(data, onProgress) {
  const { subject, grade, chapters, examType, difficulty, totalMarks, duration, blueprintText, syllabusContext } = data;

  onProgress("progress", { step: "Reading Syllabus", status: "done" });
  await delay(100);
  onProgress("progress", { step: "Loading Chapters", status: "done" });
  await delay(100);
  onProgress("progress", { step: "Analysing Topics", status: "done" });
  await delay(100);
  onProgress("progress", { step: "Creating Blueprint", status: "done" });

  const basePrompt = `
Generate a JSON object for a ${subject} exam paper for ${grade}.
Selected Chapters: ${chapters.join(", ")}
Exam Type: ${examType}
Total Marks for entire paper: ${totalMarks}
Duration: ${duration}
Difficulty: ${difficulty}

Blueprint/Sections Requirement:
${blueprintText}

CRITICAL SYLLABUS RESTRICTION:
You MUST ONLY generate questions from the following topics/subtopics:
${syllabusContext}

IMAGE REQUIREMENT:
You must intelligently determine if a question requires a diagram based on the subject.
- **Mathematics**: Generate ONLY for Geometry, Triangles, Circles, Coordinate Geometry, Number Line, Histograms, Graphs, Pie Charts, Construction Diagrams. Must be mathematically accurate.
- **Physics**: Generate ONLY for Electric Circuits, Ray Diagrams, Reflection, Refraction, Mirrors, Lenses, Motion Graphs, Magnetic Field Lines, Experimental Setups, Laboratory Apparatus.
- **Chemistry**: Generate ONLY for Laboratory Apparatus, Distillation, Titration, Molecular Structures, Atomic Structure, Electron Configuration, Chemical Bonding.
- **Biology**: Generate ONLY for Human Eye, Human Heart, Plant/Animal Cell, Brain, Flower, Leaf, Root, Stem, Kidney, Nephron, DNA, Chromosome, Digestive/Respiratory Systems.
- **Geography / Social Science**: Generate ONLY for Maps (India, World, Political, Physical, Climate, Resource, Drainage, Agriculture, Weather), Flowcharts, Timelines.
- **History / Political Science**: Generate ONLY for Timelines, Historical Maps, Battle Layouts, Chronology Charts, Parliament/Government Structure, Election Process, Constitution Flow.
- **Economics / Accountancy / Business**: Generate ONLY for Supply/Demand Graphs, Production Curves, Economic Cycle, Ledger, Journal, T-Accounts, Accounting Cycle, Organizational Charts, Marketing Cycle, Management Functions, Flowcharts.
- **Computer Science / IT / IP / AI**: Generate ONLY for Flowcharts, Algorithms, Computer Architecture, Networking, ER Diagrams, Memory Layout, Database Tables, SQL Relationships, Spreadsheet Layout, Hardware/Software Communication, AI Lifecycle, ML Pipeline, Neural Network, Decision Tree, Data Pipeline, Computer Vision.
- **Languages (English, Hindi, Sanskrit)**: Generate diagrams ONLY when strictly and educationally required (e.g., Story Map, Character Relationship, Flowchart, Timeline, काव्य संरचना). Otherwise, NO diagrams.

If a question strictly fits these categories and requires a diagram, set "requiresImage": true, and provide a descriptive "imagePrompt", "diagramType" (e.g., 'Labelled Diagram', 'Graph', 'Flowchart', 'Map', 'T-Account'), and the specific "chapter" it belongs to.
Otherwise, set "requiresImage": false. NEVER create decorative images. NEVER create unnecessary diagrams.

Return EXACTLY a JSON with this schema (Generate the ENTIRE paper in this single response):
{
  "title": "string",
  "subject": "string",
  "class": "string",
  "examType": "string",
  "duration": "string",
  "instructions": ["string", "string"],
  "marks": ${totalMarks},
  "questions": [
    {
      "section": "SECTION NAME",
      "text": "string",
      "marks": int,
      "options": ["string", "string", "string", "string"],
      "requiresImage": boolean,
      "imagePrompt": "string or null",
      "diagramType": "string or null",
      "chapter": "string or null",
      "subQuestions": [
        {
          "id": "string",
          "text": "string",
          "marks": int,
          "answer": "string",
          "requiresImage": boolean,
          "imagePrompt": "string or null",
          "diagramType": "string or null",
          "chapter": "string or null"
        }
      ],
      "answer": {
        "answer_text": "string"
      },
      "explanation": "string"
    }
  ]
}
`;

  onProgress("progress", { step: "Generating Questions", status: "processing" });

  const responseText = await callGeminiWithRetry(basePrompt, true);
  
  onProgress("progress", { step: "Validating Questions", status: "done" });

  let paperJson;
  try {
    paperJson = JSON.parse(responseText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim());
  } catch (err) {
    throw new Error("Failed to parse Gemini response as JSON");
  }

  const paperMeta = { subject, grade, chapters, difficulty };
  await processQuestionsForImages(paperJson.questions, paperMeta, onProgress);

  onProgress("progress", { step: "Formatting Paper", status: "done" });
  await delay(200);
  onProgress("progress", { step: "Preparing Preview", status: "done" });
  await delay(200);
  onProgress("progress", { step: "Preparing PDF", status: "done" });
  await delay(200);
  onProgress("progress", { step: "Preparing DOCX", status: "done" });
  await delay(200);
  onProgress("progress", { step: "Finalising", status: "done" });
  
  onProgress("complete", { paper: paperJson });
}

module.exports = { generatePaper, generatePaperStream };