# Google Calendar Integration Guide

This document explains how to set up Google Calendar integration for the admin's calendar in the NailEase booking system.

## Overview

The system automatically adds all bookings to **your admin's Google Calendar** when a booking is completed. This requires server-side setup.

### How It Works

1. **Automatic Integration**: When a customer completes a booking, the system automatically creates a calendar event in the admin's Google Calendar
2. **User Calendar Options**: Customers can also add the event to their own personal calendar (optional)

### Setup Required

To enable automatic calendar integration, you need to:
1. Set up Google Cloud Project and enable Calendar API
2. Create a Service Account
3. Share your admin calendar with the service account
4. Store credentials in Firebase
5. Deploy the Firebase Function

## Admin Calendar Integration (Required for Automatic Events)

**IMPORTANT**: The system is configured to automatically add bookings to your admin's Google Calendar. Follow these steps to set it up:

### Step 1: Set Up Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Calendar API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

### Step 2: Create Service Account

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in the service account details
4. Click "Create and Continue"
5. Skip role assignment (or assign "Editor" role)
6. Click "Done"

### Step 3: Download Service Account Key

1. Click on the created service account
2. Go to the "Keys" tab
3. Click "Add Key" > "Create new key"
4. Select "JSON" format
5. Download the JSON file

### Step 4: Share Calendar with Service Account

1. Open Google Calendar
2. Go to calendar settings
3. Under "Share with specific people", click "Add people"
4. Enter the service account email (found in the JSON file, looks like: `xxx@xxx.iam.gserviceaccount.com`)
5. Give it "Make changes to events" permission
6. Click "Send"

### Step 5: Store Credentials in Firebase

1. Copy the entire contents of the downloaded JSON file
2. In Firebase Console, go to "Functions" > "Secrets"
3. Create a new secret named `GOOGLE_CALENDAR_CREDENTIALS`
4. Paste the JSON content as the secret value
5. Save the secret

### Step 6: Deploy Firebase Function

```bash
cd functions
npm install
firebase deploy --only functions:createCalendarEvent
```

### Step 7: Verify Setup

After deployment:
1. Complete a test booking
2. Check the success page - you should see "Added to admin calendar successfully!"
3. Open your admin Google Calendar (https://calendar.google.com) and verify the event appears

## User Calendar Options (Optional)

Customers can also add events to their own personal calendars:
1. **"Add to Google Calendar"** - Opens Google Calendar with pre-filled event details
2. **"Download .ics File"** - Downloads a calendar file that works with all calendar apps

These options work immediately without any setup.

## Features

### Event Details Included

- **Title**: "Nail Appointment - [Design Name]"
- **Date & Time**: From booking selection
- **Duration**: 1 hour (adjustable in code)
- **Location**: DCAC NailEase Studio
- **Description**: 
  - Booking ID
  - Design name
  - Client information (name, phone, email)
  - Payment details (total amount, reservation fee)

### Time Zone

Events are created with `Asia/Manila` timezone. You can change this in:
- `google-calendar.js` - Client-side integration
- `functions/index.js` - Server-side integration

## Troubleshooting

### Client-Side Issues

- **Calendar doesn't open**: Check browser popup blocker settings
- **Event details incorrect**: Verify date/time parsing in `google-calendar.js`

### Admin Calendar Issues

- **"Calendar service not configured"**: 
  - Make sure `GOOGLE_CALENDAR_CREDENTIALS` secret is set in Firebase
  - Verify the secret contains valid JSON credentials
  
- **"Calendar not found"**: 
  - Verify your admin calendar is shared with the service account email
  - The service account email looks like: `xxx@xxx.iam.gserviceaccount.com`
  - Check calendar sharing settings in Google Calendar
  
- **Permission errors**: 
  - Ensure service account has "Make changes to events" permission
  - Re-share the calendar if needed
  
- **Function not found**: 
  - Make sure you deployed the function: `firebase deploy --only functions:createCalendarEvent`
  - Check Firebase Console > Functions to verify it's deployed
  - Update the `CALENDAR_FUNCTION_URL` in `google-calendar.js` if needed

## Customization

### Change Event Duration

In `google-calendar.js` and `functions/index.js`, modify:
```javascript
endDateTime.setHours(endDateTime.getHours() + 1); // Change 1 to desired hours
```

### Change Location

Update the `eventLocation` variable in `google-calendar.js` and `location` in `functions/index.js`.

