const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const emailService = require('../services/emailService');
const emailTemplates = require('../services/emailTemplates');

let NewsletterSubscription;

function getModel() {
  if (!NewsletterSubscription) {
    NewsletterSubscription = require('../models/NewsletterSubscription');
  }
  return NewsletterSubscription;
}

/**
 * POST /api/newsletter/subscribe
 * Subscribe email to newsletter
 */
router.post('/subscribe', async (req, res) => {
  try {
    const NewsletterModel = getModel();

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
    let subscription = await NewsletterModel.findOne({ email: normalizedEmail });

    if (subscription && subscription.isSubscribed) {
      return res.status(400).json({
        success: false,
        error: 'This email is already subscribed to the newsletter',
      });
    }

    // Create or reactivate subscription
    if (!subscription) {
      subscription = new NewsletterModel({
        email: normalizedEmail,
        fullName: fullName?.trim(),
        isSubscribed: true,
        subscriptionSource: 'website',
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
      await emailService.send(email, 'Welcome to EthixAI Newsletter', htmlContent, textContent);
      subscription.confirmationEmailSentAt = new Date();
      await subscription.save();
    } catch (emailError) {
      logger.warn({ email, error: emailError.message }, 'Failed to send confirmation email');
      // Don't fail the request if email fails
    }

    logger.info({ email }, 'Newsletter subscription created');

    return res.status(201).json({
      success: true,
      message: 'Successfully subscribed to newsletter',
      email,
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Newsletter subscription failed');
    return res.status(500).json({
      success: false,
      error: 'Failed to process subscription',
    });
  }
});

/**
 * POST /api/newsletter/unsubscribe/:token
 * Unsubscribe from newsletter
 */
router.post('/unsubscribe/:token', async (req, res) => {
  try {
    const NewsletterModel = getModel();
    const { token } = req.params;

    const subscription = await NewsletterModel.findOne({ unsubscribeToken: token });

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
      const { htmlContent, textContent } = emailTemplates.unsubscribeConfirmation('newsletter');
      await emailService.send(subscription.email, 'Unsubscribe Confirmed - EthixAI', htmlContent, textContent);
    } catch (emailError) {
      logger.warn({ email: subscription.email, error: emailError.message }, 'Failed to send unsubscribe confirmation');
    }

    logger.info({ email: subscription.email }, 'Newsletter subscription cancelled');

    return res.status(200).json({
      success: true,
      message: 'You have been unsubscribed from the newsletter',
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Unsubscribe failed');
    return res.status(500).json({
      success: false,
      error: 'Failed to process unsubscribe',
    });
  }
});

/**
 * GET /api/newsletter/status/:email
 * Check subscription status
 */
router.get('/status/:email', async (req, res) => {
  try {
    const NewsletterModel = getModel();
    const { email } = req.params;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address',
      });
    }

    const subscription = await NewsletterModel.findOne({ email: email.toLowerCase() });

    if (!subscription) {
      return res.status(200).json({
        success: true,
        isSubscribed: false,
        email: email.toLowerCase(),
      });
    }

    return res.status(200).json({
      success: true,
      isSubscribed: subscription.isSubscribed,
      email: subscription.email,
      subscribedAt: subscription.createdAt,
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Status check failed');
    return res.status(500).json({
      success: false,
      error: 'Failed to check subscription status',
    });
  }
});

module.exports = router;
