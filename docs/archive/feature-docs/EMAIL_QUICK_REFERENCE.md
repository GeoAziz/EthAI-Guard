# Email Integration - Quick Reference Card

## 📌 API Endpoints

### Job Applications
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/careers/applications` | POST | Submit job application |
| `/api/careers/general-application` | POST | Submit general inquiry |

### Job Subscriptions
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/careers/subscribe-jobs` | POST | Subscribe to job alerts |
| `/api/careers/unsubscribe/:token` | POST | Unsubscribe from jobs |

### Newsletter
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/newsletter/subscribe` | POST | Subscribe to newsletter |
| `/api/newsletter/unsubscribe/:token` | POST | Unsubscribe from newsletter |
| `/api/newsletter/status/:email` | GET | Check subscription status |

---

## 📊 Database Collections

### jobapplications
```javascript
{
  _id: ObjectId,
  fullName: String,
  email: String,
  phone: String,
  jobId: String,
  jobTitle: String,
  coverLetter: String,
  linkedIn: String,
  resumeUrl: String,
  status: 'received|reviewing|shortlisted|rejected|offered',
  source: 'job-posting|general-inquiry',
  emailSent: Boolean,
  confirmationEmailSentAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### jobsubscriptions
```javascript
{
  _id: ObjectId,
  email: String (unique),
  fullName: String,
  isSubscribed: Boolean,
  unsubscribeToken: String (unique),
  subscriptionReason: String,
  ipAddress: String,
  userAgent: String,
  confirmationEmailSentAt: Date,
  confirmedAt: Date,
  unsubscribedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### newslettersubscriptions
```javascript
{
  _id: ObjectId,
  email: String (unique),
  fullName: String,
  isSubscribed: Boolean,
  unsubscribeToken: String (unique),
  subscriptionSource: String,
  ipAddress: String,
  userAgent: String,
  confirmationEmailSentAt: Date,
  confirmedAt: Date,
  unsubscribedAt: Date,
  tags: [String],
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔧 Environment Variables

```bash
# Required
EMAIL_PROVIDER=sendgrid        # sendgrid|smtp|console
EMAIL_FROM=noreply@ethixai.com
EMAIL_FROM_NAME=EthixAI

# SendGrid
SENDGRID_API_KEY=SG.xxx...

# Optional
DISABLE_EMAIL_SEND=0           # 1 to disable in dev
```

---

## 🧪 Quick Test Commands

### Test Job Subscription
```bash
curl -X POST http://localhost:5000/api/careers/subscribe-jobs \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","fullName":"Test User"}'
```

### Test Newsletter Subscription
```bash
curl -X POST http://localhost:5000/api/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"subscriber@example.com"}'
```

### Check Newsletter Status
```bash
curl http://localhost:5000/api/newsletter/status/subscriber@example.com
```

### Test Job Application
```bash
curl -X POST http://localhost:5000/api/careers/applications \
  -H "Content-Type: application/json" \
  -d '{
    "fullName":"Jane Doe",
    "email":"jane@example.com",
    "phone":"555-1234",
    "jobId":"job-123",
    "jobTitle":"Software Engineer"
  }'
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `backend/src/models/JobApplication.js` | Application schema |
| `backend/src/models/JobSubscription.js` | Job subscription schema |
| `backend/src/models/NewsletterSubscription.js` | Newsletter subscription schema |
| `backend/src/services/emailService.js` | Email sending service |
| `backend/src/services/emailTemplates.js` | Email HTML templates |
| `backend/src/routes/careers.js` | Career API endpoints |
| `backend/src/routes/newsletter.js` | Newsletter API endpoints |
| `frontend/src/app/api/careers/*` | Frontend API routes |
| `frontend/src/app/api/newsletter/route.ts` | Frontend newsletter route |

---

## ✅ Common Tasks

### Enable Email in Development
```bash
export EMAIL_PROVIDER=console
export DISABLE_EMAIL_SEND=1
npm start
```

### Enable SendGrid in Production
```bash
export EMAIL_PROVIDER=sendgrid
export SENDGRID_API_KEY=your-api-key
export EMAIL_FROM=noreply@yourdomain.com
npm start
```

### Run Tests
```bash
cd backend
npm test -- careers.test.js
npm test -- emailService.test.js
```

### Validate Installation
```bash
bash tools/validate-email-integration.sh
```

### Check MongoDB Data
```bash
# Count subscribers
db.jobsubscriptions.countDocuments({isSubscribed: true})

# Find applications
db.jobapplications.find({email: "test@example.com"}).pretty()

# Get unsubscribe token
db.jobsubscriptions.findOne({email: "test@example.com"}).unsubscribeToken
```

---

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| Emails not sending | Check EMAIL_PROVIDER, SENDGRID_API_KEY |
| "Already subscribed" error | Use different email or unsubscribe first |
| MongoDB connection error | Verify MONGO_URL, ensure mongod running |
| Invalid email error | Email must have @ and domain |
| Unsubscribe token invalid | Verify token from database |

---

## 📧 Email Templates

1. **Job Application Confirmation** - Sent on application submit
2. **General Application Confirmation** - Sent on general inquiry
3. **Job Subscription Welcome** - Sent on subscription
4. **Job Opening Notification** - Sent when new job posted
5. **Unsubscribe Confirmation** - Sent on unsubscribe

All templates:
- Responsive HTML + plain text
- Include call-to-action links
- Branded with EthixAI styling

---

## 🔐 Security Notes

- Email addresses stored as lowercase
- Unique UUID unsubscribe tokens
- 24-hour duplicate application prevention
- Rate limiting: 60 requests/minute per IP
- No secrets in logs
- Input validation on all endpoints

---

## 📈 Monitoring Queries

```javascript
// Active subscriptions
db.jobsubscriptions.find({isSubscribed: true}).count()

// Unsubscribe rate
db.jobsubscriptions.find({isSubscribed: false}).count()

// Applications by status
db.jobapplications.aggregate([
  {$group: {_id: "$status", count: {$sum: 1}}}
])

// Failed email sends
db.jobapplications.find({emailSent: false}).count()

// Subscriptions by source
db.jobsubscriptions.aggregate([
  {$group: {_id: "$subscriptionReason", count: {$sum: 1}}}
])
```

---

## 🎯 Success Metrics

Track these KPIs:
- **Subscription Rate:** New subscriptions per day
- **Unsubscribe Rate:** % unsubscribed (target: <1%)
- **Application Rate:** Job applications per month
- **Email Delivery Rate:** Successfully sent (target: >99%)
- **Bounce Rate:** Hard bounces (target: <0.5%)
- **Response Time:** API latency (target: <200ms)

---

## 📚 Documentation Files

- **EMAIL_INTEGRATION_IMPLEMENTATION.md** - Complete technical docs
- **EMAIL_SETUP_AND_TESTING.md** - Setup and testing guide
- **EMAIL_INTEGRATION_CHECKLIST.md** - Implementation checklist
- **EMAIL_QUICK_REFERENCE.md** - This file

---

## 🚀 Deployment Checklist

Before production:
- [ ] Set SENDGRID_API_KEY environment variable
- [ ] Verify EMAIL_FROM domain is verified in SendGrid
- [ ] Run all tests: `npm test`
- [ ] Validate setup: `bash tools/validate-email-integration.sh`
- [ ] Test email delivery with real email address
- [ ] Check unsubscribe links work
- [ ] Monitor logs for errors
- [ ] Set up email alerts

---

## 📞 Support Files

1. Check README in implementation folder
2. Review implementation guide
3. Run validation script
4. Check backend logs
5. Test with cURL commands

---

**Version:** 1.0  
**Last Updated:** July 4, 2024  
**Status:** Production Ready
