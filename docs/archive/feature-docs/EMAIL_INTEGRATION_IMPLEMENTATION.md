# Email Integration Implementation Guide

## Overview
Complete implementation of email integration for Careers and Newsletter features in EthixAI v1.1.

## ✅ Completed Components

### 1. Database Models
**Location:** `backend/src/models/`

#### JobApplication Model (`JobApplication.js`)
- Stores job applications and general career inquiries
- Fields: fullName, email, phone, jobId, jobTitle, coverLetter, linkedIn, resumeUrl, status, source
- Tracks email delivery status and timestamps
- Indexes on email and creation date for efficient queries

#### JobSubscription Model (`JobSubscription.js`)
- Manages job notification subscriptions
- Unique unsubscribe tokens for each subscriber
- Tracks subscription/unsubscription status and timestamps
- Prevents duplicate subscriptions with unique email constraint

#### NewsletterSubscription Model (`NewsletterSubscription.js`)
- Manages newsletter subscriptions independently
- Supports tags for segmentation
- Unique unsubscribe tokens with automatic UUID generation
- Tracks confirmation status and IP address logging

### 2. Email Service Infrastructure
**Location:** `backend/src/services/`

#### Email Service (`emailService.js`)
- Abstracted email sending interface
- **Providers Supported:**
  - SendGrid (recommended) - uses API key authentication
  - SMTP (configurable)
  - Console logging (development)
- **Features:**
  - Graceful fallback to console logging
  - Automatic provider detection
  - Error handling with structured logging
  - Support for single and batch email sending

#### Email Templates (`emailTemplates.js`)
- Pre-designed, responsive HTML email templates
- Template types:
  - Job Application Confirmation
  - General Application Confirmation
  - Newsletter Subscription Confirmation
  - Job Opening Notification
  - Unsubscribe Confirmation
- All templates include both HTML and plain text versions
- Consistent styling with EthixAI branding

### 3. Backend API Routes

#### Careers Route (`backend/src/routes/careers.js`)

**POST /api/careers/applications**
- Submit job application with optional resume
- Validates required fields and email format
- Prevents duplicate applications within 24 hours
- Stores in JobApplication collection
- Sends confirmation email
- Response: `{ success: true, applicationId, message }`

**POST /api/careers/general-application**
- Submit general career inquiry
- Similar validation as applications
- Uses 'general-inquiry' source
- Sends generic confirmation email
- Response: `{ success: true, message }`

**POST /api/careers/subscribe-jobs**
- Subscribe to job opening notifications
- Creates or reactivates JobSubscription record
- Generates unique unsubscribe token
- Sends confirmation email
- Prevents duplicate subscriptions
- Response: `{ success: true, message }`

**POST /api/careers/unsubscribe/:token**
- Unsubscribe from job notifications using unique token
- Sets unsubscribed status and timestamp
- Sends unsubscribe confirmation email
- Validates token authenticity
- Response: `{ success: true, message }`

#### Newsletter Route (`backend/src/routes/newsletter.js`)

**POST /api/newsletter/subscribe**
- Subscribe to newsletter
- Email validation with regex pattern
- Creates or reactivates subscription
- Prevents duplicate subscriptions
- Sends welcome email
- Response: `{ success: true, message }`

**POST /api/newsletter/unsubscribe/:token**
- Unsubscribe from newsletter
- Uses unique unsubscribe tokens
- Sends confirmation email
- Validates token authenticity
- Response: `{ success: true, message }`

**GET /api/newsletter/status/:email**
- Check subscription status for email
- Returns subscription state and dates
- No authentication required (uses email verification)
- Response: `{ success: true, isSubscribed, email, subscribedAt }`

### 4. Frontend API Routes

#### Careers Routes (`frontend/src/app/api/careers/`)

- **general-application/route.ts**: Forwards form data to backend with resume support
- **applications/route.ts**: Submits job application with optional file upload
- **subscribe-jobs/route.ts**: Subscribes email to job notifications

#### Newsletter Route (`frontend/src/app/api/newsletter/route.ts`)
- Forwards subscription requests to backend
- Proxies for security and rate limiting

All frontend routes:
- Validate input before forwarding
- Forward to backend API via `NEXT_PUBLIC_API_URL`
- Handle errors gracefully with user-friendly messages
- Return structured JSON responses

### 5. Environment Configuration

**Updated `.env.example`:**
```bash
# Email Service Configuration
EMAIL_PROVIDER=sendgrid              # 'sendgrid', 'smtp', or 'console'
EMAIL_FROM=noreply@ethixai.com       # Sender email address
EMAIL_FROM_NAME=EthixAI               # Display name in email

# SendGrid Configuration
SENDGRID_API_KEY=replace_with_sendgrid_api_key

# SMTP Configuration (optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=send@example.com
SMTP_PASS=replace_with_password

# Feature Flags
DISABLE_EMAIL_SEND=0  # Set to 1 to disable email sending in development
```

### 6. Test Suite

#### Unit Tests (`backend/src/__tests__/`)

**careers.test.js**
- Tests all career API endpoints
- Validates email format checking
- Tests duplicate prevention
- Verifies database record creation
- Tests unsubscribe workflow
- Tests resubscription after unsubscribe

**emailService.test.js**
- Tests email template generation
- Validates SendGrid email structure
- Tests console logging fallback
- Tests error handling

## 🔧 Implementation Checklist

### Setup Steps

- [x] Create database models (JobApplication, JobSubscription, NewsletterSubscription)
- [x] Implement email service with SendGrid/SMTP support
- [x] Create email templates with responsive HTML
- [x] Implement backend API routes (careers and newsletter)
- [x] Update frontend API routes to forward to backend
- [x] Update `.env.example` with email configuration
- [x] Create comprehensive unit tests
- [x] Add routes to Express server configuration

### Configuration Steps (In Progress)

- [ ] **Obtain SendGrid API Key**
  - Go to https://sendgrid.com
  - Create account and verify sender domain
  - Generate API key
  - Add to `.env` as `SENDGRID_API_KEY`

- [ ] **Configure Email Settings**
  - Set `EMAIL_PROVIDER=sendgrid` in `.env`
  - Set `EMAIL_FROM` to your verified sender email
  - Update `EMAIL_FROM_NAME` to your brand

### Testing Steps (In Progress)

- [ ] **Run Unit Tests**
  ```bash
  cd backend
  npm test -- careers.test.js
  npm test -- emailService.test.js
  ```

- [ ] **Test in Development**
  ```bash
  # With email disabled
  DISABLE_EMAIL_SEND=1 npm start
  
  # With console logging
  EMAIL_PROVIDER=console npm start
  ```

- [ ] **Test API Endpoints**
  ```bash
  # Test career application
  curl -X POST http://localhost:5000/api/careers/applications \
    -H "Content-Type: application/json" \
    -d '{
      "fullName": "John Doe",
      "email": "john@example.com",
      "phone": "555-1234",
      "jobId": "job-123"
    }'

  # Test newsletter subscription
  curl -X POST http://localhost:5000/api/newsletter/subscribe \
    -H "Content-Type: application/json" \
    -d '{"email": "subscriber@example.com"}'
  ```

- [ ] **Test Frontend Integration**
  - Visit careers page
  - Fill out job application form
  - Verify confirmation message
  - Check database for record

- [ ] **Test Email Delivery (with SendGrid)**
  - Monitor SendGrid dashboard
  - Verify email arrives
  - Test unsubscribe link
  - Verify no further emails sent

### Monitoring & Analytics

**Metrics to Track:**
- Application submission success rate
- Email delivery rate
- Bounce rate
- Unsubscribe rate
- Application-to-conversion rate

**Database Queries:**
```javascript
// Count applications by status
db.jobapplications.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
])

// Count active subscriptions
db.jobsubscriptions.countDocuments({ isSubscribed: true })

// Track unsubscribe rate
db.jobsubscriptions.countDocuments({ unsubscribedAt: { $exists: true } })
```

## 🚀 Deployment Checklist

### Pre-Production

- [ ] Test all email templates in SendGrid
- [ ] Verify unsubscribe links work properly
- [ ] Set up email bounce/complaint handling
- [ ] Configure DKIM/SPF for domain
- [ ] Test with real email addresses
- [ ] Verify rate limiting is appropriate
- [ ] Test database indexes for performance

### Production Deployment

- [ ] Set SendGrid API key in production environment
- [ ] Update EMAIL_FROM to production domain
- [ ] Configure email alerts for delivery failures
- [ ] Set up email bounce handling
- [ ] Monitor SendGrid metrics dashboard
- [ ] Plan for email list growth
- [ ] Implement GDPR compliance (if applicable)

## 📊 API Response Examples

### Successful Job Application
```json
{
  "success": true,
  "message": "Application submitted successfully! We'll review...",
  "applicationId": "507f1f77bcf86cd799439011",
  "email": "john@example.com"
}
```

### Successful Newsletter Subscription
```json
{
  "success": true,
  "message": "Successfully subscribed to newsletter",
  "email": "subscriber@example.com"
}
```

### Error Response
```json
{
  "success": false,
  "error": "This email is already subscribed to the newsletter"
}
```

## 🔒 Security Considerations

1. **Email Validation**: Regex pattern `^[^\s@]+@[^\s@]+\.[^\s@]+$`
2. **Rate Limiting**: Inherited from Express rate limiter (60 req/min default)
3. **Duplicate Prevention**: 24-hour window for job applications
4. **Unique Tokens**: UUID-based unsubscribe tokens
5. **Data Protection**: Email addresses stored as lowercase
6. **CORS**: Frontend proxy prevents cross-origin issues

## 🐛 Troubleshooting

### Emails Not Sending

1. Check `SENDGRID_API_KEY` is set correctly
2. Verify email address is valid
3. Check SendGrid dashboard for errors
4. Enable development logging: `EMAIL_PROVIDER=console`

### Duplicate Subscription Errors

1. Check if email already exists in database
2. Verify 24-hour duplicate check for applications
3. For resubscription, unsubscribe first or use different email

### Database Connection Issues

1. Verify MongoDB is running
2. Check `MONGO_URL` environment variable
3. Confirm database authentication

## 📚 Additional Resources

- [SendGrid Documentation](https://docs.sendgrid.com)
- [Email Best Practices](https://sendgrid.com/blog/email-best-practices)
- [GDPR Email Compliance](https://gdpr-info.eu)
- [CAN-SPAM Act](https://www.ftc.gov/business-guidance/pages/can-spam-act-compliance-guide)

## Version History

- **v1.0** (2024-07-04): Initial implementation with SendGrid and database storage
  - Complete CRUD operations for job applications
  - Newsletter subscription management
  - Unsubscribe workflow with unique tokens
  - Email templates with responsive design
  - Comprehensive test suite

