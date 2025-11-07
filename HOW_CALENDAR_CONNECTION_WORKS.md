# How Google Calendar Connection Works

## Connection Flow Diagram

```
┌─────────────────┐
│  Customer       │
│  Completes      │
│  Booking        │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Client Browser (book.js)          │
│  - Calls createAdminCalendarEvent() │
│  - Gets Firebase Auth Token         │
└────────┬────────────────────────────┘
         │
         │ HTTP POST Request
         │ with Auth Token
         ▼
┌─────────────────────────────────────┐
│  Firebase Cloud Function            │
│  (createCalendarEvent)              │
│  - Verifies Auth Token              │
│  - Gets Google Service Account     │
│    Credentials from Secrets         │
└────────┬────────────────────────────┘
         │
         │ Google Calendar API Call
         │ Using Service Account Auth
         ▼
┌─────────────────────────────────────┐
│  Google Calendar API                │
│  - Authenticates via Service Account│
│  - Creates Event in Admin Calendar  │
└────────┬────────────────────────────┘
         │
         │ Success Response
         ▼
┌─────────────────────────────────────┐
│  Admin's Google Calendar            │
│  Event Created! ✅                  │
└─────────────────────────────────────┘
```

## Step-by-Step Connection Process

### 1. **Client-Side (Browser) - `google-calendar.js`**

When a booking is completed:
```javascript
// Step 1: Get Firebase authentication token
const user = auth.currentUser;
const idToken = await user.getIdToken();

// Step 2: Send booking data to Firebase Function
const response = await fetch(CALENDAR_FUNCTION_URL, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${idToken}`  // Authenticates the request
    },
    body: JSON.stringify({
        bookingData: bookingData,
        calendarId: 'primary'
    })
});
```

**What happens:**
- Browser gets the logged-in user's Firebase token
- Sends booking details + token to Firebase Cloud Function
- Waits for response

### 2. **Firebase Cloud Function - `functions/index.js`**

The function receives the request:
```javascript
// Step 1: Verify the user is authenticated
const decodedToken = await admin.auth().verifyIdToken(idToken);

// Step 2: Get Google Service Account credentials
const credentialsJson = process.env.GOOGLE_CALENDAR_CREDENTIALS;
const credentials = JSON.parse(credentialsJson);

// Step 3: Authenticate with Google Calendar API
const auth = new google.auth.GoogleAuth({
    credentials: credentials,
    scopes: ['https://www.googleapis.com/auth/calendar']
});

// Step 4: Create Calendar API client
const calendar = google.calendar({ version: 'v3', auth });
```

**What happens:**
- Verifies the Firebase token is valid
- Loads Google Service Account credentials from Firebase Secrets
- Creates Google Calendar API client using those credentials

### 3. **Google Calendar API Connection**

```javascript
// Step 5: Create the calendar event
const result = await calendar.events.insert({
    calendarId: 'primary',  // Admin's primary calendar
    resource: {
        summary: 'Nail Appointment - Design Name',
        start: { dateTime: startDateTime, timeZone: 'Asia/Manila' },
        end: { dateTime: endDateTime, timeZone: 'Asia/Manila' },
        description: 'Booking details...',
        location: 'DCAC NailEase Studio'
    }
});
```

**What happens:**
- Uses Service Account credentials to authenticate with Google
- Creates event in the admin's calendar (shared with service account)
- Returns event ID and link

## Authentication Methods

### Two Types of Authentication:

1. **Firebase Authentication** (User → Function)
   - User logs in with Firebase Auth
   - Gets ID token
   - Token sent to Cloud Function
   - Function verifies token

2. **Google Service Account** (Function → Google Calendar)
   - Service Account JSON stored in Firebase Secrets
   - Function uses it to authenticate with Google Calendar API
   - Service Account email must have access to admin calendar

## Required Setup for Connection

### 1. **Google Cloud Project Setup**
```
Google Cloud Console
  └─ Enable Google Calendar API
  └─ Create Service Account
  └─ Download JSON credentials
```

### 2. **Calendar Sharing**
```
Admin's Google Calendar
  └─ Settings → Share with specific people
  └─ Add Service Account email
  └─ Give "Make changes to events" permission
```

### 3. **Firebase Secrets**
```
Firebase Console → Functions → Secrets
  └─ Create secret: GOOGLE_CALENDAR_CREDENTIALS
  └─ Paste entire JSON file content
```

### 4. **Deploy Function**
```bash
cd functions
npm install  # Installs googleapis package
firebase deploy --only functions:createCalendarEvent
```

## Why This Architecture?

✅ **Secure**: Service Account credentials never exposed to client
✅ **Centralized**: All events go to admin calendar automatically  
✅ **Scalable**: Firebase Functions handle the API calls
✅ **Reliable**: Google Calendar API handles event creation

## Connection Status Indicators

- ✅ **"Added to admin calendar successfully!"** = Connection working
- ⚠️ **"Calendar: Setup required"** = Need to configure credentials
- ❌ **"Calendar service not configured"** = Missing Firebase Secret
- ❌ **"Calendar not found"** = Calendar not shared with service account

## Troubleshooting Connection Issues

1. **Check Firebase Secret exists**: `GOOGLE_CALENDAR_CREDENTIALS`
2. **Verify Calendar Sharing**: Service account email has access
3. **Check Function Deployment**: Function is deployed and accessible
4. **Verify API Enabled**: Google Calendar API is enabled in Cloud Console
5. **Check Function URL**: Matches deployed function URL in `google-calendar.js`

## Visual Connection Summary

```
Customer Booking
    ↓
Browser (JavaScript)
    ↓ [Firebase Auth Token]
Firebase Cloud Function
    ↓ [Service Account Credentials]
Google Calendar API
    ↓ [Creates Event]
Admin's Google Calendar ✅
```

The connection uses **two layers of authentication**:
- **Layer 1**: Firebase Auth (validates user can make requests)
- **Layer 2**: Google Service Account (authenticates with Google Calendar API)

This ensures security while allowing automatic calendar event creation!


