import express from 'express';
import aiService from '../services/aiService.js';
import Form from '../models/Form.js';
import Submission from '../models/Submission.js';

const router = express.Router();

// AI Configuration Info
router.get('/config', (req, res) => {
  try {
    const config = aiService.getProviderInfo();
    res.json({
      success: true,
      config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get AI configuration',
      message: error.message
    });
  }
});

// Generate Form with AI
router.post('/generate-form', async (req, res) => {
  try {
    if (!aiService.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'AI service is not enabled or configured'
      });
    }

    const { 
      description, 
      requirements = {},
      autoSave = false 
    } = req.body;

    if (!description) {
      return res.status(400).json({
        success: false,
        error: 'Description is required for form generation'
      });
    }

    // Generate form using AI
    const generatedForm = await aiService.generateFormFields(description, requirements);

    let savedForm = null;
    if (autoSave) {
      // Save the generated form to database
      const form = new Form({
        title: generatedForm.title,
        description: generatedForm.description,
        fields: generatedForm.fields,
        settings: {
          aiGenerated: true,
          generationPrompt: description,
          generationRequirements: requirements
        }
      });

      savedForm = await form.save();
    }

    res.json({
      success: true,
      message: 'Form generated successfully',
      generatedForm,
      savedForm,
      metadata: {
        generatedAt: new Date().toISOString(),
        provider: aiService.aiProvider,
        autoSaved: autoSave
      }
    });
  } catch (error) {
    console.error('AI form generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate form',
      message: error.message
    });
  }
});

// Generate Form Title
router.post('/generate-title', async (req, res) => {
  try {
    if (!aiService.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'AI service is not enabled or configured'
      });
    }

    const { description, tone = 'professional' } = req.body;

    if (!description) {
      return res.status(400).json({
        success: false,
        error: 'Description is required for title generation'
      });
    }

    const title = await aiService.generateFormTitle(description, tone);

    res.json({
      success: true,
      title,
      metadata: {
        generatedAt: new Date().toISOString(),
        tone,
        provider: aiService.aiProvider
      }
    });
  } catch (error) {
    console.error('AI title generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate title',
      message: error.message
    });
  }
});

// Generate Form Description
router.post('/generate-description', async (req, res) => {
  try {
    if (!aiService.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'AI service is not enabled or configured'
      });
    }

    const { title, purpose } = req.body;

    if (!title || !purpose) {
      return res.status(400).json({
        success: false,
        error: 'Title and purpose are required for description generation'
      });
    }

    const description = await aiService.generateFormDescription(title, purpose);

    res.json({
      success: true,
      description,
      metadata: {
        generatedAt: new Date().toISOString(),
        provider: aiService.aiProvider
      }
    });
  } catch (error) {
    console.error('AI description generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate description',
      message: error.message
    });
  }
});

// Analyze Form Submissions
router.post('/analyze-submissions/:formId', async (req, res) => {
  try {
    if (!aiService.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'AI service is not enabled or configured'
      });
    }

    const { formId } = req.params;
    const { analysisType = 'summary', limit = 100 } = req.body;

    // Check if form exists
    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({
        success: false,
        error: 'Form not found'
      });
    }

    // Get submissions for analysis
    const submissions = await Submission.find({ formId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    if (submissions.length === 0) {
      return res.json({
        success: true,
        analysis: {
          message: 'No submissions available for analysis',
          formId,
          submissionCount: 0
        }
      });
    }

    // Analyze submissions using AI
    const analysis = await aiService.analyzeFormSubmissions(submissions, analysisType);

    res.json({
      success: true,
      analysis,
      metadata: {
        formId,
        submissionCount: submissions.length,
        analysisType,
        analyzedAt: new Date().toISOString(),
        provider: aiService.aiProvider
      }
    });
  } catch (error) {
    console.error('AI analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze submissions',
      message: error.message
    });
  }
});

// Content Moderation
router.post('/moderate-content', async (req, res) => {
  try {
    if (!aiService.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'AI service is not enabled or configured'
      });
    }

    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required for moderation'
      });
    }

    const moderation = await aiService.moderateContent(content);

    res.json({
      success: true,
      moderation,
      metadata: {
        moderatedAt: new Date().toISOString(),
        provider: aiService.aiProvider
      }
    });
  } catch (error) {
    console.error('AI moderation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to moderate content',
      message: error.message
    });
  }
});

// Enhance Existing Form with AI
router.post('/enhance-form/:formId', async (req, res) => {
  try {
    if (!aiService.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'AI service is not enabled or configured'
      });
    }

    const { formId } = req.params;
    const { enhancementType = 'improve', suggestions = true } = req.body;

    // Get existing form
    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({
        success: false,
        error: 'Form not found'
      });
    }

    let enhancementPrompt;
    switch (enhancementType) {
      case 'improve':
        enhancementPrompt = `Analyze this form and suggest improvements:
        Title: ${form.title}
        Description: ${form.description}
        Fields: ${JSON.stringify(form.fields, null, 2)}
        
        Provide specific suggestions for:
        1. Field improvements
        2. User experience enhancements
        3. Validation improvements
        4. Additional fields that might be useful`;
        break;
      case 'accessibility':
        enhancementPrompt = `Review this form for accessibility improvements:
        ${JSON.stringify(form, null, 2)}
        
        Suggest accessibility enhancements following WCAG guidelines.`;
        break;
      case 'validation':
        enhancementPrompt = `Analyze and improve form validation:
        ${JSON.stringify(form.fields, null, 2)}
        
        Suggest better validation rules and error messages.`;
        break;
      default:
        enhancementPrompt = `Provide general suggestions for this form:
        ${JSON.stringify(form, null, 2)}`;
    }

    const enhancement = await aiService.generateCompletion(enhancementPrompt);

    res.json({
      success: true,
      originalForm: form,
      enhancement,
      enhancementType,
      metadata: {
        enhancedAt: new Date().toISOString(),
        provider: aiService.aiProvider
      }
    });
  } catch (error) {
    console.error('AI enhancement error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to enhance form',
      message: error.message
    });
  }
});

// Bulk Generate Forms
router.post('/bulk-generate', async (req, res) => {
  try {
    if (!aiService.isEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'AI service is not enabled or configured'
      });
    }

    const { requests, autoSave = false } = req.body;

    if (!requests || !Array.isArray(requests)) {
      return res.status(400).json({
        success: false,
        error: 'Requests array is required'
      });
    }

    if (requests.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 10 forms can be generated at once'
      });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < requests.length; i++) {
      try {
        const { description, requirements = {} } = requests[i];
        
        if (!description) {
          errors.push({ index: i, error: 'Description is required' });
          continue;
        }

        const generatedForm = await aiService.generateFormFields(description, requirements);
        
        let savedForm = null;
        if (autoSave) {
          const form = new Form({
            title: generatedForm.title,
            description: generatedForm.description,
            fields: generatedForm.fields,
            settings: {
              aiGenerated: true,
              generationPrompt: description,
              generationRequirements: requirements
            }
          });
          savedForm = await form.save();
        }

        results.push({
          index: i,
          generatedForm,
          savedForm
        });
      } catch (error) {
        errors.push({ 
          index: i, 
          error: error.message 
        });
      }
    }

    res.json({
      success: true,
      results,
      errors,
      metadata: {
        totalRequests: requests.length,
        successCount: results.length,
        errorCount: errors.length,
        generatedAt: new Date().toISOString(),
        provider: aiService.aiProvider
      }
    });
  } catch (error) {
    console.error('Bulk generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk generate forms',
      message: error.message
    });
  }
});

export default router;