const express = require("express");
const router = express.Router();
const { generatePaper } = require("../services/geminiService");

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
      message: error.message,
    });
  }
});

module.exports = router;