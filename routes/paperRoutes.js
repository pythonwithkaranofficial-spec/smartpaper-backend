const express = require("express");
const router = express.Router();
const { generatePaper, generatePaperStream } = require("../services/geminiService");
const ImageCache = require("../models/ImageCache");

router.post("/generate-paper", async (req, res) => {
  try {
    const { prompt } = req.body;

    const paper = await generatePaper(prompt);

    res.json({
      success: true,
      paper,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "AI service is temporarily unavailable. Please try again in a moment.",
    });
  }
});

router.post("/generate-paper-stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const { subject, grade, chapters, examType, difficulty, totalMarks, duration, questionTypes, blueprintText, syllabusContext } = req.body;

    await generatePaperStream(
      { subject, grade, chapters, examType, difficulty, totalMarks, duration, questionTypes, blueprintText, syllabusContext },
      (event, data) => {
        if (data) {
          res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        } else {
          res.write(`event: ${event}\ndata: {}\n\n`);
        }
      }
    );

    res.write("event: done\ndata: {}\n\n");
    res.end();
  } catch (error) {
    console.error(error);
    res.write(`event: error\ndata: ${JSON.stringify({ message: "Generation failed." })}\n\n`);
    res.end();
  }
});

router.get("/image/:hash", async (req, res) => {
  try {
    const { hash } = req.params;
    const image = await ImageCache.findOne({ imageHash: hash });
    if (!image) {
      return res.status(404).send("Image not found");
    }
    res.setHeader("Content-Type", image.mimeType || "image/webp");
    res.send(image.imageData);
  } catch (error) {
    console.error("Error serving image:", error);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;