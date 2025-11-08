import express from 'express';
import { reviewCode } from '../services/gemini.js';

const router = express.Router();

router.post('/review', async (req, res, next) => {
  try {
    const { code, language } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

    // Validation
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return res.status(400).json({
        error: 'Code is required and cannot be empty'
      });
    }

    if (!language || typeof language !== 'string') {
      return res.status(400).json({
        error: 'Language is required'
      });
    }

    if (code.length > 10000) {
      return res.status(400).json({
        error: 'Code is too long (maximum 10,000 characters)'
      });
    }

    // Log request for debugging
    console.log(`📝 Review request from ${clientIp} for ${language} code (${code.length} chars)`);

    // Call Gemini service
    const result = await reviewCode(code, language);

    // Validate result structure before sending
    if (!result || typeof result !== 'object') {
      console.error('❌ Invalid result type:', typeof result);
      throw new Error('Invalid response structure from AI service');
    }

    // Ensure all required fields exist
    if (!Array.isArray(result.errors)) result.errors = [];
    if (!Array.isArray(result.warnings)) result.warnings = [];
    if (!Array.isArray(result.suggestions)) result.suggestions = [];
    if (typeof result.curseLevel !== 'number') {
      const errorCount = result.errors.length;
      const warningCount = result.warnings.length;
      result.curseLevel = Math.min(100, (errorCount * 30) + (warningCount * 10));
    }
    if (!result.verdict || typeof result.verdict !== 'string') {
      result.verdict = 'The code has been analyzed by The Code Reaper.';
    }

    console.log(`✅ Review completed: ${result.errors.length} errors, ${result.warnings.length} warnings, ${result.suggestions.length} suggestions, Curse Level ${result.curseLevel}%`);

    res.json(result);
  } catch (error) {
    console.error('❌ Review error:', error.message);
    console.error('Error stack:', error.stack);
    
    // Send appropriate error response
    if (error.message?.includes('API key') || error.message?.includes('Reaper could not be summoned')) {
      return res.status(500).json({
        error: error.message || 'The Reaper could not be summoned… check your API key.'
      });
    }
    
    if (error.message?.includes('quota') || error.message?.includes('rate limit') || error.message?.includes('overwhelmed') || error.message?.includes('daily quota')) {
      return res.status(429).json({
        error: error.message || 'The Reaper is overwhelmed. Please wait a moment and try again.'
      });
    }

    // Return a generic error for other cases
    return res.status(500).json({
      error: error.message || 'An error occurred while reviewing the code.'
    });
  }
});

export default router;
