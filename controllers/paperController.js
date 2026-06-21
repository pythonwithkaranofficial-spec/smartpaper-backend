const geminiService = require('../services/geminiService');
const UserUsage = require('../models/UserUsage');

exports.generatePaper = async (req, res) => {
  try {
    const { userId, subject, chapters, examType, difficulty, totalMarks, duration, questionTypes } = req.body;

    // Validate inputs
    if (!userId || !subject || !chapters || !examType) {
      return res.status(400).json({ error: 'Missing required fields (userId, subject, chapters, examType)' });
    }

    // Check Daily Limit (Max 5 papers per day)
    const today = new Date().toISOString().split('T')[0];
    
    // Find or create usage record for today
    let usage = await UserUsage.findOne({ userId, date: today });
    
    if (!usage) {
      usage = new UserUsage({ userId, date: today, papersGenerated: 0 });
    }

    if (usage.papersGenerated >= 5) {
      return res.status(403).json({ 
        error: 'Daily Limit Reached. You have already generated 5 papers today. Please come back tomorrow to generate more papers.' 
      });
    }

    // Call Gemini Service
    const paperJson = await geminiService.generateQuestions({
      subject,
      chapters,
      examType,
      difficulty,
      totalMarks,
      duration,
      questionTypes
    });

    // Increment Usage Count
    usage.papersGenerated += 1;
    await usage.save();

    // Return the generated paper
    res.status(200).json(paperJson);

  } catch (error) {
    console.error('Error in paperController.generatePaper:', error);
    res.status(500).json({ error: 'Failed to generate paper. Please try again.' });
  }
};
