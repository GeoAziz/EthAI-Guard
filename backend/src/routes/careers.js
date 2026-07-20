const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const emailService = require('../services/emailService');
const emailTemplates = require('../services/emailTemplates');

let JobApplication, JobSubscription;

// Lazy-load models to avoid circular dependencies
function getModels() {
  if (!JobApplication) {
    JobApplication = require('../models/JobApplication');
  }
  if (!JobSubscription) {
    JobSubscription = require('../models/JobSubscription');
  }
  return { JobApplication, JobSubscription };
}

/**
 * POST /api/careers/applications
 * Submit a job application with resume
 */
router.post('/applications', async (req, res) => {
  try {
    const { JobApplication } = getModels();

    // Extract form data
    const fullName = req.body.fullName || req.query.fullName;
    const email = req.body.email || req.query.email;
    const phone = req.body.phone || req.query.phone;
    const jobId = req.body.jobId || req.query.jobId;
    const jobTitle = req.body.jobTitle || req.query.jobTitle;
    const coverLetter = req.body.coverLetter || req.query.coverLetter;
    const linkedIn = req.body.linkedIn || req.query.linkedIn;
    const resumeUrl = req.body.resumeUrl || req.query.resumeUrl;

    // Validate required fields
    if (!fullName?.trim() || !email?.trim() || !phone?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: fullName, email, phone',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address',
      });
    }

    // Check for duplicate applications within 24 hours
    const recentApplication = await JobApplication.findOne({
      email,
      jobId,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    if (recentApplication) {
      return res.status(400).json({
        success: false,
        error: 'You have already applied for this position recently. Please wait before applying again.',
      });
    }

    // Create application record
    const application = new JobApplication({
      fullName: fullName.trim(),
      email: email.toLowerCase(),
      phone: phone.trim(),
      jobId,
      jobTitle,
      coverLetter,
      linkedIn,
      resumeUrl,
      source: 'job-posting',
      status: 'received',
    });

    await application.save();

    // Send confirmation email
    try {
      const { htmlContent, textContent } = emailTemplates.jobApplicationConfirmation(
        fullName,
        jobTitle,
      );
      await emailService.send(email, 'Job Application Received - EthixAI', htmlContent, textContent);
      application.emailSent = true;
      application.confirmationEmailSentAt = new Date();
      await application.save();
    } catch (emailError) {
      logger.warn(
        { email, jobId, error: emailError.message },
        'Failed to send confirmation email',
      );
      // Don't fail the request if email fails
    }

    logger.info(
      { applicationId: application._id, email, jobId },
      'Job application created',
    );

    return res.status(201).json({
      success: true,
      message: 'Application submitted successfully! We\'ll review your submission and contact you within 2-3 business days.',
      applicationId: application._id,
      email,
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Job application submission failed');
    return res.status(500).json({
      success: false,
      error: 'Failed to submit application',
    });
  }
});

/**
 * POST /api/careers/general-application
 * Submit a general career inquiry
 */
router.post('/general-application', async (req, res) => {
  try {
    const { JobApplication } = getModels();

    const fullName = req.body.fullName || req.query.fullName;
    const email = req.body.email || req.query.email;
    const phone = req.body.phone || req.query.phone;
    const message = req.body.message || req.query.message;

    // Validate required fields
    if (!fullName?.trim() || !email?.trim() || !phone?.trim() || !message?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address',
      });
    }

    // Create general inquiry record
    const inquiry = new JobApplication({
      fullName: fullName.trim(),
      email: email.toLowerCase(),
      phone: phone.trim(),
      coverLetter: message.trim(),
      source: 'general-inquiry',
      status: 'received',
    });

    await inquiry.save();

    // Send confirmation email
    try {
      const { htmlContent, textContent } = emailTemplates.generalApplicationConfirmation(fullName);
      await emailService.send(email, 'Thank You for Your Interest - EthixAI', htmlContent, textContent);
      inquiry.emailSent = true;
      inquiry.confirmationEmailSentAt = new Date();
      await inquiry.save();
    } catch (emailError) {
      logger.warn({ email, error: emailError.message }, 'Failed to send confirmation email');
    }

    logger.info({ inquiryId: inquiry._id, email }, 'General inquiry created');

    return res.status(201).json({
      success: true,
      message: 'Thank you for your interest in EthixAI! We\'ll review your inquiry and reach out if we find a good fit.',
      email,
    });
  } catch (error) {
    logger.error({ error: error.message }, 'General inquiry submission failed');
    return res.status(500).json({
      success: false,
      error: 'Failed to submit inquiry',
    });
  }
});

/**
 * POST /api/careers/subscribe-jobs
 * Subscribe to job notifications
 */
router.post('/subscribe-jobs', async (req, res) => {
  try {
    const { JobSubscription } = getModels();

    const email = req.body.email || req.query.email;
    const fullName = req.body.fullName || req.query.fullName;

    // Validate email
    if (!email?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Valid email is required',
      });
    }

    const normalizedEmail = email.toLowerCase();

    // Check if already subscribed
    let subscription = await JobSubscription.findOne({ email: normalizedEmail });

    if (subscription && subscription.isSubscribed) {
      return res.status(400).json({
        success: false,
        error: 'This email is already subscribed to job notifications',
      });
    }

    // Create or reactivate subscription
    if (!subscription) {
      subscription = new JobSubscription({
        email: normalizedEmail,
        fullName: fullName?.trim(),
        isSubscribed: true,
        subscriptionReason: 'user-request',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    } else {
      subscription.isSubscribed = true;
      subscription.unsubscribedAt = null;
      subscription.updatedAt = new Date();
    }

    await subscription.save();

    // Send confirmation email
    try {
      const { htmlContent, textContent } = emailTemplates.newsletterConfirmation(email);
      await emailService.send(email, 'Welcome to Job Notifications - EthixAI', htmlContent, textContent);
      subscription.confirmationEmailSentAt = new Date();
      await subscription.save();
    } catch (emailError) {
      logger.warn({ email, error: emailError.message }, 'Failed to send confirmation email');
    }

    logger.info({ email }, 'Job subscription created');

    return res.status(201).json({
      success: true,
      message: 'You\'ll receive notifications about new job openings!',
      email,
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Job subscription failed');
    return res.status(500).json({
      success: false,
      error: 'Failed to subscribe',
    });
  }
});

/**
 * POST /api/careers/unsubscribe/:token
 * Unsubscribe from job notifications
 */
router.post('/unsubscribe/:token', async (req, res) => {
  try {
    const { JobSubscription } = getModels();
    const { token } = req.params;

    const subscription = await JobSubscription.findOne({ unsubscribeToken: token });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Invalid unsubscribe token',
      });
    }

    if (!subscription.isSubscribed) {
      return res.status(400).json({
        success: false,
        error: 'Already unsubscribed',
      });
    }

    subscription.isSubscribed = false;
    subscription.unsubscribedAt = new Date();
    await subscription.save();

    // Send unsubscribe confirmation
    try {
      const { htmlContent, textContent } = emailTemplates.unsubscribeConfirmation('jobs');
      await emailService.send(subscription.email, 'Unsubscribe Confirmed - EthixAI', htmlContent, textContent);
    } catch (emailError) {
      logger.warn({ email: subscription.email, error: emailError.message }, 'Failed to send unsubscribe confirmation');
    }

    logger.info({ email: subscription.email }, 'Job subscription cancelled');

    return res.status(200).json({
      success: true,
      message: 'You have been unsubscribed from job notifications',
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Unsubscribe failed');
    return res.status(500).json({
      success: false,
      error: 'Failed to process unsubscribe',
    });
  }
});

module.exports = router;
