import express from 'express';
import Form from '../models/Form.js';
import Submission from '../models/Submission.js';
import { conversationHistoryService } from '../services/conversationHistoryService.js';
import { guardrailsEngine } from '../config/guardrails.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Save form to database
router.post('/save', async (req, res) => {
  try {
    const { 
      title, 
      description, 
      fields, 
      settings = {},
      metadata = {},
      conversationId,
      userId = 'anonymous'
    } = req.body;

    // Validate form data
    if (!title || !fields || !Array.isArray(fields)) {
      return res.status(400).json({
        success: false,
        error: 'Title and fields are required'
      });
    }

    // Validate form design with guardrails
    const validation = guardrailsEngine.validateFormDesign({ title, description, fields });
    if (!validation.safe && validation.issues.some(issue => issue.type === 'forbidden_field')) {
      return res.status(400).json({
        success: false,
        error: 'Form contains forbidden fields',
        issues: validation.issues
      });
    }

    // Generate compliance warnings
    const complianceWarnings = guardrailsEngine.generateComplianceWarnings({ fields });

    // Create form object
    const formData = {
      title: title.trim(),
      description: description?.trim() || '',
      fields: fields.map(field => ({
        ...field,
        id: field.id || `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      })),
      settings: {
        ...settings,
        complianceWarnings,
        validationIssues: validation.issues.filter(issue => issue.type !== 'forbidden_field')
      },
      metadata: {
        ...metadata,
        createdVia: 'form_builder',
        aiGenerated: metadata.aiGenerated || false,
        conversationId: conversationId || null,
        userId: userId,
        version: '1.0'
      }
    };

    // Save to database
    let savedForm;
    try {
      const form = new Form(formData);
      savedForm = await form.save();
    } catch (dbError) {
      // Mock response for development when MongoDB is not available
      if (dbError.message.includes('buffering timed out')) {
        console.warn('MongoDB not available, returning mock response');
        savedForm = {
          _id: `mock_${Date.now()}`,
          ...formData,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      } else {
        throw dbError;
      }
    }

    // Record in conversation history if available
    if (conversationId) {
      try {
        await conversationHistoryService.recordFormCreation(conversationId, savedForm);
      } catch (error) {
        logger.logError(error, { context: 'Recording form creation in conversation history' });
      }
    }

    logger.info(`Form saved successfully: ${savedForm._id} - ${savedForm.title}`);

    res.json({
      success: true,
      message: 'Form saved successfully',
      form: {
        id: savedForm._id,
        title: savedForm.title,
        description: savedForm.description,
        fieldsCount: savedForm.fields.length,
        createdAt: savedForm.createdAt,
        url: `/forms/${savedForm._id}`,
        shareUrl: `/forms/share/${savedForm._id}`
      },
      warnings: complianceWarnings,
      validationIssues: validation.issues
    });

  } catch (error) {
    logger.logError(error, { context: 'Save form to database' });
    res.status(500).json({
      success: false,
      error: 'Failed to save form',
      message: error.message
    });
  }
});

// Update existing form
router.put('/update/:formId', async (req, res) => {
  try {
    const { formId } = req.params;
    const updateData = req.body;

    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({
        success: false,
        error: 'Form not found'
      });
    }

    // Validate updated form
    if (updateData.fields) {
      const validation = guardrailsEngine.validateFormDesign({
        title: updateData.title || form.title,
        description: updateData.description || form.description,
        fields: updateData.fields
      });

      if (!validation.safe && validation.issues.some(issue => issue.type === 'forbidden_field')) {
        return res.status(400).json({
          success: false,
          error: 'Form contains forbidden fields',
          issues: validation.issues
        });
      }
    }

    // Update form
    Object.assign(form, updateData);
    form.updatedAt = new Date();
    
    const updatedForm = await form.save();

    res.json({
      success: true,
      message: 'Form updated successfully',
      form: updatedForm
    });

  } catch (error) {
    logger.logError(error, { context: 'Update form' });
    res.status(500).json({
      success: false,
      error: 'Failed to update form',
      message: error.message
    });
  }
});

// Get form by ID
router.get('/:formId', async (req, res) => {
  try {
    const { formId } = req.params;
    
    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({
        success: false,
        error: 'Form not found'
      });
    }

    res.json({
      success: true,
      form
    });

  } catch (error) {
    logger.logError(error, { context: 'Get form by ID' });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve form',
      message: error.message
    });
  }
});

// Get user's forms
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const forms = await Form.find({ 'metadata.userId': userId })
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('title description createdAt updatedAt fields.length metadata.aiGenerated');

    const total = await Form.countDocuments({ 'metadata.userId': userId });

    res.json({
      success: true,
      forms: forms.map(form => ({
        id: form._id,
        title: form.title,
        description: form.description,
        fieldsCount: form.fields?.length || 0,
        aiGenerated: form.metadata?.aiGenerated || false,
        createdAt: form.createdAt,
        updatedAt: form.updatedAt
      })),
      pagination: {
        current: parseInt(page),
        total,
        pageSize: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.logError(error, { context: 'Get user forms' });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve forms',
      message: error.message
    });
  }
});

// Delete form
router.delete('/:formId', async (req, res) => {
  try {
    const { formId } = req.params;
    
    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({
        success: false,
        error: 'Form not found'
      });
    }

    // Also delete associated submissions
    await Submission.deleteMany({ formId });
    await Form.findByIdAndDelete(formId);

    logger.info(`Form deleted: ${formId} - ${form.title}`);

    res.json({
      success: true,
      message: 'Form and associated submissions deleted successfully'
    });

  } catch (error) {
    logger.logError(error, { context: 'Delete form' });
    res.status(500).json({
      success: false,
      error: 'Failed to delete form',
      message: error.message
    });
  }
});

// Submit form data
router.post('/:formId/submit', async (req, res) => {
  try {
    const { formId } = req.params;
    const { data, metadata = {} } = req.body;

    // Get form
    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({
        success: false,
        error: 'Form not found'
      });
    }

    // Validate submission data
    const validation = validateSubmissionData(form.fields, data);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        validationErrors: validation.errors
      });
    }

    // Create submission
    const submission = new Submission({
      formId,
      data,
      metadata: {
        ...metadata,
        submittedAt: new Date(),
        userAgent: req.headers['user-agent'],
        ip: req.ip
      }
    });

    const savedSubmission = await submission.save();

    // Update form submission count
    await Form.findByIdAndUpdate(formId, {
      $inc: { 'metadata.submissionCount': 1 },
      $set: { 'metadata.lastSubmission': new Date() }
    });

    logger.info(`Form submission saved: ${savedSubmission._id} for form ${formId}`);

    res.json({
      success: true,
      message: 'Form submitted successfully',
      submissionId: savedSubmission._id
    });

  } catch (error) {
    logger.logError(error, { context: 'Submit form data' });
    res.status(500).json({
      success: false,
      error: 'Failed to submit form',
      message: error.message
    });
  }
});

// Get form submissions
router.get('/:formId/submissions', async (req, res) => {
  try {
    const { formId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const skip = (page - 1) * limit;

    const submissions = await Submission.find({ formId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Submission.countDocuments({ formId });

    res.json({
      success: true,
      submissions,
      pagination: {
        current: parseInt(page),
        total,
        pageSize: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.logError(error, { context: 'Get form submissions' });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve submissions',
      message: error.message
    });
  }
});

// Export form configuration
router.get('/:formId/export', async (req, res) => {
  try {
    const { formId } = req.params;
    const { format = 'json' } = req.query;

    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({
        success: false,
        error: 'Form not found'
      });
    }

    const exportData = {
      id: form._id,
      title: form.title,
      description: form.description,
      fields: form.fields,
      settings: form.settings,
      createdAt: form.createdAt,
      exportedAt: new Date().toISOString()
    };

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${form.title.replace(/\s+/g, '_')}.json"`);
      res.json(exportData);
    } else {
      res.status(400).json({
        success: false,
        error: 'Unsupported export format'
      });
    }

  } catch (error) {
    logger.logError(error, { context: 'Export form' });
    res.status(500).json({
      success: false,
      error: 'Failed to export form',
      message: error.message
    });
  }
});

// Helper function to validate submission data
function validateSubmissionData(formFields, submissionData) {
  const errors = [];
  
  // Check required fields
  const requiredFields = formFields.filter(field => field.required);
  requiredFields.forEach(field => {
    const value = submissionData[field.id];
    if (!value || (typeof value === 'string' && !value.trim())) {
      errors.push({
        field: field.id,
        message: `${field.label} is required`
      });
    }
  });

  // Validate field types
  formFields.forEach(field => {
    const value = submissionData[field.id];
    if (!value) return; // Skip empty non-required fields

    switch (field.type) {
      case 'email':
        if (!/\S+@\S+\.\S+/.test(value)) {
          errors.push({
            field: field.id,
            message: `${field.label} must be a valid email`
          });
        }
        break;
      case 'number':
        if (isNaN(value)) {
          errors.push({
            field: field.id,
            message: `${field.label} must be a number`
          });
        }
        break;
      case 'tel':
        if (!/^[\d\-\+\(\)\s]+$/.test(value)) {
          errors.push({
            field: field.id,
            message: `${field.label} must be a valid phone number`
          });
        }
        break;
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

export default router;