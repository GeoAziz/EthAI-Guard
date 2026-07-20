# Email Integration Setup and Testing Guide

## Quick Start (5 minutes)

### 1. Enable Email Service (Development)

**Option A: Console Logging (Recommended for Testing)**
```bash
# .env or export
export EMAIL_PROVIDER=console
export DISABLE_EMAIL_SEND=1
```

**Option B: SendGrid (Production)**
```bash
# Get API key from https://sendgrid.com
export SENDGRID_API_KEY=your-sendgrid-api-key
export EMAIL_PROVIDER=sendgrid
export EMAIL_FROM=noreply@yourdomain.com
export EMAIL_FROM_NAME="Your Company"
```

### 2. Start Services
```bash
# Backend
cd backend
npm install  # if needed
npm start

# In another terminal - Frontend
cd frontend
npm install  # if needed
npm run dev
```

### 3. Test via API
```bash
# Test job subscription
curl -X POST http://localhost:5000/api/careers/subscribe-jobs \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","fullName":"Test User"}'

# Expected response:
# {"success":true,"message":"You'll receive notifications...","email":"test@example.com"}
```

---

## Complete Setup Guide

### Prerequisites
- Node.js 20+ 
- MongoDB running (or use Docker: `docker-compose up mongo`)
- SendGrid account (optional, for production)

### Step 1: Update Environment Variables

**Copy example to local file:**
```bash
cp .env.example .env.local
```

**Edit `.env.local` for your environment:**

**Development Setup (Console Logging):**
```bash
# Email Configuration - Development
EMAIL_PROVIDER=console
EMAIL_FROM=noreply@ethixai.com
EMAIL_FROM_NAME=EthixAI
DISABLE_EMAIL_SEND=1  # No actual emails sent

# MongoDB
MONGO_URL=mongodb://mongo:27017/ethixai
```

**Production Setup (SendGrid):**
```bash
# Email Configuration - Production
EMAIL_PROVIDER=sendgrid
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME="EthixAI"
SENDGRID_API_KEY=SG.your-api-key-here

# MongoDB
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/ethixai
```

### Step 2: Start Docker Services (if using Docker)

```bash
# Start all services
docker-compose up -d

# Verify services are running
docker-compose ps

# View logs
docker-compose logs -f backend
```

### Step 3: Run Database Migrations

```bash
cd backend

# Create necessary indexes
npm run db:migrate  # (if migration script exists)

# Or manually verify MongoDB connection
node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URL);
mongoose.connection.once('open', () => {
  console.log('✓ MongoDB connected');
  process.exit(0);
});
"
```

### Step 4: Run Tests

```bash
cd backend

# Run all tests
npm test

# Run email integration tests only
npm test -- careers.test.js
npm test -- emailService.test.js

# Watch mode for development
npm test -- --watch
```

---

## Testing Guide

### Manual Testing with cURL

#### Test 1: Subscribe to Newsletter
```bash
curl -X POST http://localhost:5000/api/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "email": "subscriber@test.com",
    "fullName": "Test Subscriber"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Successfully subscribed to newsletter",
  "email": "subscriber@test.com"
}
```

#### Test 2: Subscribe to Job Notifications
```bash
curl -X POST http://localhost:5000/api/careers/subscribe-jobs \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jobseeker@test.com",
    "fullName": "Job Seeker"
  }'
```

#### Test 3: Submit Job Application
```bash
curl -X POST http://localhost:5000/api/careers/applications \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Jane Developer",
    "email": "jane@test.com",
    "phone": "555-0123",
    "jobId": "senior-engineer",
    "jobTitle": "Senior Engineer",
    "coverLetter": "I am very interested in this role...",
    "linkedIn": "https://linkedin.com/in/janedeveloper"
  }'
```

#### Test 4: General Career Inquiry
```bash
curl -X POST http://localhost:5000/api/careers/general-application \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Career Explorer",
    "email": "explorer@test.com",
    "phone": "555-0456",
    "message": "I would like to learn more about opportunities at EthixAI"
  }'
```

#### Test 5: Check Newsletter Status
```bash
curl http://localhost:5000/api/newsletter/status/subscriber@test.com
```

**Expected Response:**
```json
{
  "success": true,
  "isSubscribed": true,
  "email": "subscriber@test.com",
  "subscribedAt": "2024-07-04T10:30:00.000Z"
}
```

#### Test 6: Unsubscribe from Newsletter

First, get the unsubscribe token from the database:
```bash
# In MongoDB shell
db.newslettersubscriptions.findOne({email: "subscriber@test.com"})
# Copy the unsubscribeToken value
```

Then unsubscribe:
```bash
curl -X POST http://localhost:5000/api/newsletter/unsubscribe/{UNSUBSCRIBE_TOKEN} \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Browser Testing

#### Test Registration Flow
1. Open http://localhost:3000
2. Navigate to Careers page
3. Fill out "Subscribe to Job Openings" form
4. Verify success message appears
5. Check database: `db.jobsubscriptions.findOne({email: "your-email"})`

#### Test Job Application Flow
1. Click on a job posting
2. Fill out application form
3. Upload resume (or skip if optional)
4. Submit
5. Verify confirmation message
6. Check database: `db.jobapplications.findOne({email: "your-email"})`

#### Test Newsletter Signup
1. Scroll to footer
2. Enter email in newsletter signup
3. Verify success toast notification
4. Check database: `db.newslettersubscriptions.find()`

---

## Database Verification

### MongoDB Query Examples

**Check all job applications:**
```javascript
db.jobapplications.find({}).pretty()

// Group by status
db.jobapplications.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
])
```

**Check subscriptions:**
```javascript
// Active job subscriptions
db.jobsubscriptions.find({ isSubscribed: true }).count()

// Newsletter subscribers
db.newslettersubscriptions.find({ isSubscribed: true }).count()

// Unsubscribe rate
db.jobsubscriptions.find({ isSubscribed: false }).count()
```

**View specific record:**
```javascript
db.jobapplications.findOne({
  email: "jane@test.com"
})

db.jobsubscriptions.findOne({
  email: "subscriber@test.com"
})
```

**Check email delivery:**
```javascript
// Applications with emails sent
db.jobapplications.find({ emailSent: true }).count()

// Applications with failed emails
db.jobapplications.find({ emailSent: false }).count()
```

---

## Email Service Testing

### Console Output Test

When using `EMAIL_PROVIDER=console`, emails are logged to console:

```
[timestamp] info: Email logged to console (not sent)
{
  "to": "test@example.com",
  "subject": "Newsletter Subscription Confirmed",
  "from": "noreply@ethixai.com",
  "htmlContent": "[HTML content preview...]"
}
```

### SendGrid Testing

1. **Send Test Email:**
```bash
export SENDGRID_API_KEY=your-key
export EMAIL_PROVIDER=sendgrid

# Test via API
curl -X POST http://localhost:5000/api/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@gmail.com"}'
```

2. **Check SendGrid Dashboard:**
   - Log in to https://sendgrid.com
   - Go to Mail Send > Sending
   - Monitor email delivery in real-time

3. **Verify Email Receipt:**
   - Check inbox for email from `noreply@ethixai.com`
   - Click unsubscribe link to test unsubscribe flow
   - Verify no further emails are received

### Error Testing

**Test invalid email:**
```bash
curl -X POST http://localhost:5000/api/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid-email"}'

# Expected: 400 error with "Invalid email"
```

**Test duplicate subscription:**
```bash
# First subscription succeeds
curl -X POST http://localhost:5000/api/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Second subscription fails
curl -X POST http://localhost:5000/api/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Expected: 400 error with "already subscribed"
```

**Test invalid unsubscribe token:**
```bash
curl -X POST http://localhost:5000/api/newsletter/unsubscribe/invalid-token \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected: 404 error with "Invalid token"
```

---

## Frontend Testing Checklist

- [ ] Careers page loads
- [ ] Job openings display correctly
- [ ] Job subscription form appears
- [ ] Can enter email and submit
- [ ] Success message displays
- [ ] Newsletter signup appears in footer
- [ ] Can enter email for newsletter
- [ ] Confirmation toast shows
- [ ] Can submit job application
- [ ] Resume upload works (if enabled)
- [ ] Unsubscribe link in email works
- [ ] Resubscription allowed after unsubscribe

---

## Performance Testing

### Load Testing Endpoints

```bash
# Using Apache Bench
ab -n 100 -c 10 -p data.json -T application/json http://localhost:5000/api/newsletter/subscribe

# Using wrk
wrk -t4 -c100 -d30s --latency http://localhost:5000/api/newsletter/subscribe
```

### Database Indexing Verification

```javascript
// Check indexes
db.jobapplications.getIndexes()
db.jobsubscriptions.getIndexes()
db.newslettersubscriptions.getIndexes()

// Query performance
db.jobapplications.find({email: "test@example.com"}).explain("executionStats")
```

---

## Troubleshooting

### Emails Not Sending

**Check 1: Verify Provider Configuration**
```bash
# In backend code or logs
console.log({
  provider: process.env.EMAIL_PROVIDER,
  sendgridKey: process.env.SENDGRID_API_KEY ? 'SET' : 'MISSING',
  emailFrom: process.env.EMAIL_FROM
})
```

**Check 2: Verify SendGrid API Key**
```bash
# Test API key
curl https://api.sendgrid.com/v3/mail/validate \
  -H "Authorization: Bearer YOUR_SENDGRID_API_KEY" \
  -H "Content-Type: application/json"
```

**Check 3: Check MongoDB Connection**
```bash
# In backend logs, look for:
# "Mongoose connected to MongoDB"
# OR
# "Mongoose connection error"
```

**Check 4: Enable Debug Logging**
```bash
export DEBUG=ethixai:* npm start
export LOG_LEVEL=debug npm start
```

### Database Connection Issues

**Error: "Cannot connect to MongoDB"**
```bash
# Check MongoDB is running
docker ps | grep mongo

# Verify connection string
echo $MONGO_URL

# Test connection
mongosh "$MONGO_URL"
```

**Error: "Duplicate key error"**
```bash
# Check for duplicate indexes
db.jobsubscriptions.dropIndex({email: 1})

# Rebuild collection
db.jobsubscriptions.deleteMany({})
```

### Frontend/Backend Communication Issues

**Check 1: CORS Configuration**
```bash
# Verify NEXT_PUBLIC_API_URL matches backend URL
echo $NEXT_PUBLIC_API_URL  # Should be http://localhost:5000 (dev)
```

**Check 2: Network Request**
```bash
# In browser DevTools Console
fetch('http://localhost:5000/api/newsletter/status/test@example.com')
  .then(r => r.json())
  .then(d => console.log(d))
```

**Check 3: API Response Logging**
```javascript
// In frontend API route
console.log('Backend URL:', backendUrl);
console.log('Request body:', JSON.stringify(body));
console.log('Response status:', backendResponse.status);
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] SendGrid API key configured
- [ ] Email domain verified in SendGrid
- [ ] DKIM/SPF records set up
- [ ] All tests passing (`npm test`)
- [ ] No console.log or debug statements
- [ ] Rate limiting configured appropriately
- [ ] MONGO_URL points to production database
- [ ] Email templates tested on multiple clients
- [ ] Unsubscribe workflow tested end-to-end
- [ ] Bounce handling configured
- [ ] Complaint handling configured

### Deployment Steps

```bash
# 1. Set production environment variables
export NODE_ENV=production
export EMAIL_PROVIDER=sendgrid
export SENDGRID_API_KEY=your-production-key
export MONGO_URL=your-production-mongo-url

# 2. Install dependencies
npm install --production

# 3. Run migrations if needed
npm run db:migrate

# 4. Start service
npm start

# 5. Monitor logs
tail -f /var/log/ethixai/backend.log

# 6. Verify endpoints are responding
curl https://api.yourdomain.com/health
```

### Monitoring in Production

**Monitor these metrics:**
- Email send success rate
- Delivery time (P95, P99)
- Bounce rate
- Complaint rate
- Unsubscribe rate
- Job application rate
- Database query performance

**Set up alerts for:**
- High error rate (>1%)
- High bounce rate (>5%)
- SendGrid API failures
- Database connection drops
- Rate limit violations

---

## Success Criteria

### Development Phase
- [x] All API endpoints implemented
- [x] All tests passing
- [x] Email templates responsive
- [x] Database schema correct
- [x] Frontend integration complete

### Testing Phase
- [ ] Manual testing completed
- [ ] All cURL tests pass
- [ ] Frontend form submissions work
- [ ] Database records created correctly
- [ ] Email delivery verified (for SendGrid)

### Production Phase
- [ ] Zero critical errors
- [ ] <100ms P95 latency
- [ ] 99.9% uptime
- [ ] 0% unhandled exceptions
- [ ] Email delivery >99%

