const admin = require('firebase-admin');
admin.initializeApp();
const { defineSecret } = require('firebase-functions/params');
const { google } = require('googleapis');

const APP_ID = 'nailease25-iapt'; // Line 6
const BOOKINGS_COLLECTION = `artifacts/${APP_ID}/bookings`; // Line 7
const ADMIN_UID = 'xZfAuu3cQkelk25frtC96TdJQIJ2'; // Line 8
const DEFAULT_TIMEZONE = 'Asia/Manila';

const iprogsmsToken = defineSecret('IPROGSMS_TOKEN');
const calendarCredentials = defineSecret('GOOGLE_CALENDAR_CREDENTIALS');
const { setGlobalOptions } = require("firebase-functions/v2");
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");



setGlobalOptions({ maxInstances: 10 });

const allowedOrigins = [
    'https://sendphoneforverification-2ldy5wz35q-uc.a.run.app', 
    'http://localhost:3000', 
    'http://localhost:5173',
    'http://localhost:5500',
    // Add other allowed origins here
];

// ====================================================================================
// START: HELPER FUNCTIONS (MUST BE DEFINED BEFORE EXPORTS)
// ====================================================================================

function parseAuthorizationHeader(header) {
    if (!header) {
        return null;
    }
    const parts = header.split('Bearer ');
    return parts.length === 2 ? parts[1] : null;
}

function ensureBookingDataPayload(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Invalid booking data payload');
    }
    if (!payload.selectedDate || !payload.selectedTime) {
        throw new Error('Booking data missing date or time');
    }
    return payload;
}

function toTwentyFourHour(timeString = '') {
    const normalized = timeString.trim().toUpperCase();
    const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
    if (!match) {
        throw new Error(`Unable to parse time string: ${timeString}`);
    }
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2] || '0', 10);
    const meridiem = match[3];

    if (meridiem === 'AM') {
        hours = hours === 12 ? 0 : hours;
    } else if (meridiem === 'PM') {
        hours = hours === 12 ? 12 : hours + 12;
    }

    return {
        hours: hours % 24,
        minutes: minutes % 60
    };
}

function buildDateTimeString(dateInput, timeInput) {
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid date value: ${dateInput}`);
    }

    const { hours, minutes } = toTwentyFourHour(timeInput);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hour = String(hours).padStart(2, '0');
    const minute = String(minutes).padStart(2, '0');

    return `${year}-${month}-${day}T${hour}:${minute}:00+08:00`;
}

async function getCalendarClient() {
    const credentialsJson = calendarCredentials.value();
    if (!credentialsJson) {
        throw new Error('Google Calendar credentials not configured');
    }

    let credentials;
    try {
        credentials = JSON.parse(credentialsJson);
    } catch (error) {
        throw new Error('Invalid Google Calendar credentials JSON');
    }

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/calendar']
    });

    const authClient = await auth.getClient();
    return google.calendar({ version: 'v3', auth: authClient });
}

function sanitizeEventResponse(event) {
    return {
        id: event.id,
        status: event.status,
        summary: event.summary,
        description: event.description,
        location: event.location,
        start: event.start,
        end: event.end,
        htmlLink: event.htmlLink,
        recurrence: event.recurrence,
        attendees: event.attendees,
        hangoutLink: event.hangoutLink,
        created: event.created,
        updated: event.updated,
        creator: event.creator,
        organizer: event.organizer
    };
}

function normalizeTo12Hour(timeStr) {
    if (!timeStr) return null;
    const s = String(timeStr).trim();
    // 12-hour like "8:00 AM", "8:00AM", "8 AM"
    let m12 = s.match(/^\s*(\d{1,2})(?::\s*(\d{1,2}))?\s*(AM|PM)\s*$/i);
    if (m12) {
        const h = (parseInt(m12[1], 10) % 12) || 12;
        const period = m12[3].toUpperCase();
        return `${h}:00 ${period}`;
    }
    // 24-hour like "08:00", "08:00:00"
    const m24 = s.match(/^\s*(\d{1,2})(?::\s*(\d{1,2}))?(?::\s*\d{1,2})?\s*$/);
    if (m24) {
        const hh = parseInt(m24[1], 10);
        const period = hh >= 12 ? 'PM' : 'AM';
        const h12 = (hh % 12) || 12;
        return `${h12}:00 ${period}`;
    }
    return s;
}

async function sendReminderSms(data, reminderType, customMessage = null) {
    // Note: iprogsmsToken must be defined at the top level
    const apiToken = iprogsmsToken.value(); 
    const phoneNumber = data.clientPhone;
    
    if (!phoneNumber) return;

    const phoneNumberCleaned = phoneNumber.replace(/\+/g, '').trim(); 
    const SMS_PROVIDER = 0;
    const clientName = data.clientName || 'Valued Client';
    const appointmentTime = data.selectedTime || 'the booked time';
    const appointmentDate = data.selectedDate || 'the booked date';
    const designName = data.designName || 'service';

    let message = customMessage || ''; // Use customMessage if provided

    if (reminderType === '24h') {
        message = `Friendly Reminder: Hi ${clientName}, your Nailease appointment for ${designName} is tomorrow at ${appointmentTime}. Thank you for booking, see you there!`;
    } else if (reminderType === '2h') {
        message = `Final Reminder: Hi ${clientName}, your Nailease appointment is TODAY at ${appointmentTime} on ${appointmentDate}. See you soon!`;
    } 
    // If it's a 'confirmation' type, 'message' remains 'customMessage', which is the confirmation text.

    if (!message) {
        logger.warn(`[SMS HELPER] No valid message constructed for type: ${reminderType}`);
        return;
    }

    const smsApiBaseUrl = 'https://sms.iprogtech.com/api/v1/sms_messages';
    
    const requestBody = {
        api_token: apiToken,
        phone_number: phoneNumberCleaned,
        message: message,
        sms_provider: SMS_PROVIDER
    };

    try {
        const apiResponse = await fetch(smsApiBaseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const responseText = await apiResponse.text();
        const apiData = JSON.parse(responseText);
        let logPrefix = reminderType.toUpperCase();
        if (logPrefix === 'CONFIRMATION') logPrefix = 'CONFIRM';

        if (apiResponse.status === 200 && (apiData.status === 200 || apiData.status === 'success')) {
            logger.info(`[${logPrefix} SUCCESS] Sent to ${phoneNumber}. ID: ${apiData.message_id}`);
        } else {
            logger.error(`[${logPrefix} FAILED] HTTP Status ${apiResponse.status}. API Error: ${responseText}`);
            throw new Error(`SMS send failed: ${responseText}`);
        }
    } catch (error) {
        logger.error(`[${reminderType.toUpperCase()} CRITICAL ERROR] Network/Fetch failure:`, error);
        throw error;
    }
}

// NOTE: This recompute logic is now self-contained in exports.availabilityMirror below.
// ====================================================================================
// END: HELPER FUNCTIONS
// ====================================================================================

// ====================================================================================
// START: EXPORTED FUNCTIONS
// ====================================================================================

exports.sendPhoneForVerification = onRequest({ 
        cors: allowedOrigins, 
        secrets: [iprogsmsToken]
    }, async (request, response) => {

    const { phoneNumber } = request.body; 

    if (!phoneNumber) {
        logger.error("Missing phone number in request body.");
        return response.status(400).json({ success: false, message: "Phone number is required." }); 
    }

    try {
        const otpApiUrl = 'https://sms.iprogtech.com/api/v1/otp/send_otp';
        const apiToken = iprogsmsToken.value();
        const apiResponse = await fetch(otpApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                api_token: apiToken, 
                phone_number: phoneNumber, 
                message: "Your OTP code is :otp. It is valid for 5 minutes. Do not share this code with anyone." 
            })
        });

        const apiData = await apiResponse.json();
        response.status(200).json({ success: true, message: "OTP request sent.", data: apiData });

    } catch (error) {
        logger.error("Error communicating with external OTP API:", error);
        response.status(500).json({ success: false, message: "Internal server error." });
        return;
    }
});

exports.verifyOtp = onRequest({ 
    cors: allowedOrigins,
    secrets: [iprogsmsToken] 
}, async (request, response) => {

    const idToken = request.headers.authorization ? request.headers.authorization.split('Bearer ')[1] : null;

    if (!idToken) {
        logger.error("401: Missing ID token in request headers.");
        return response.status(401).json({ success: false, message: "Unauthorized: Missing authentication token." });
    }
    
    let uid;
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        uid = decodedToken.uid; 
        logger.info(`Token verified for UID: ${uid}`);
    } catch (error) {
        logger.error("401: Invalid or expired ID token.", error);
        return response.status(401).json({ success: false, message: "Unauthorized: Invalid token." });
    }

    const { phoneNumber, otpCode } = request.body; 
    const apiToken = iprogsmsToken.value();

    if (!phoneNumber || !otpCode) {
        return response.status(400).json({ success: false, message: "Missing required fields." }); 
    }
    
    try {
        const verifyApiUrl = 'https://sms.iprogtech.com/api/v1/otp/verify_otp'; 
        
        const apiResponse = await fetch(verifyApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                api_token: apiToken, 
                phone_number: phoneNumber,
                otp: otpCode 
            })
        });

        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            logger.error(`iProgTech API returned non-OK status ${apiResponse.status}:`, errorText);
            return response.status(503).json({ success: false, message: "Verification API temporarily unavailable or configuration error." });
        }

        const apiData = await apiResponse.json();
        logger.info("iProgTech FINAL RESPONSE status:", apiData.status); 


        if (apiData.status === 'success') {
            return response.status(200).json({ success: true, message: "Verification successful." });
        } else {
            logger.warn("OTP failed validation:", apiData.message || "Unknown reason.");
            return response.status(401).json({ success: false, message: "Invalid OTP code." });
        }
        
    } catch (error) {
        logger.error("Critical error during OTP verification:", error);
        return response.status(500).json({ success: false, message: "Critical server error. Check logs." }); 
    }
});

exports.createCalendarEvent = onRequest({
    cors: true,
    secrets: [calendarCredentials],
    timeoutSeconds: 60
}, async (request, response) => {
    if (request.method !== 'POST') {
        response.set('Allow', 'POST');
        return response.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const idToken = parseAuthorizationHeader(request.headers.authorization);
    if (!idToken) {
        return response.status(401).json({ success: false, message: 'Unauthorized: Missing authentication token.' });
    }

    try {
        await admin.auth().verifyIdToken(idToken);
    } catch (error) {
        logger.error('Invalid ID token for calendar event creation', error);
        return response.status(401).json({ success: false, message: 'Unauthorized: Invalid token.' });
    }

    let bookingData;
    try {
        bookingData = ensureBookingDataPayload(request.body.bookingData);
    } catch (error) {
        logger.error('Invalid booking data payload', error);
        return response.status(400).json({ success: false, message: error.message });
    }

    const calendarId = request.body.calendarId || 'primary';

    try {
        const calendar = await getCalendarClient();

        const startDateTime = buildDateTimeString(bookingData.selectedDate, bookingData.selectedTime);
        const start = new Date(startDateTime);
        const end = new Date(start.getTime() + 60 * 60 * 1000).toISOString().replace('Z', '+00:00');

        // Build event title with client name and booking type
        const clientName = bookingData.personalInfo?.fullName || 'Unknown Client';
        const bookingType = bookingData.source === 'walk-in' ? 'Walk-in' : 'Online';
        const designName = bookingData.design?.name || 'Nail Service';
        const eventTitle = `${clientName} - ${designName} (${bookingType})`;
        
        const resource = {
            summary: eventTitle,
            description: [
                `Booking Type: ${bookingType}`,
                `Booking ID: ${bookingData.bookingId || 'N/A'}`,
                `Client: ${clientName}`,
                bookingData.personalInfo?.phone ? `Phone: ${bookingData.personalInfo.phone}` : null,
                bookingData.personalInfo?.email ? `Email: ${bookingData.personalInfo.email}` : null,
                bookingData.design?.name ? `Design: ${bookingData.design.name}` : null,
                bookingData.notes ? `Notes: ${bookingData.notes}` : null,
                bookingData.design?.price ? `Total Amount: ₱${Number(bookingData.design.price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : null,
                bookingData.reservationFee ? `Reservation Fee: ₱${Number(bookingData.reservationFee).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : null
            ].filter(Boolean).join('\n'),
            start: {
                dateTime: start.toISOString(),
                timeZone: DEFAULT_TIMEZONE
            },
            end: {
                dateTime: new Date(start.getTime() + 60 * 60 * 1000).toISOString(),
                timeZone: DEFAULT_TIMEZONE
            },
            location: bookingData.location || 'DCAC NailEase Studio',
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 24 * 60 },
                    { method: 'popup', minutes: 60 }
                ]
            }
        };

        const insertResponse = await calendar.events.insert({
            calendarId,
            requestBody: resource
        });

        const event = insertResponse.data;

        return response.status(200).json({
            success: true,
            message: 'Event created successfully.',
            eventId: event.id,
            eventLink: event.htmlLink,
            event: sanitizeEventResponse(event)
        });
    } catch (error) {
        logger.error('Failed to create calendar event', error);
        const status = error.code === 404 ? 404 : 500;
        return response.status(status).json({
            success: false,
            message: error.message || 'Failed to create calendar event.'
        });
    }
});

exports.listCalendarEvents = onRequest({
    cors: true,
    secrets: [calendarCredentials],
    timeoutSeconds: 60
}, async (request, response) => {
    const idToken = parseAuthorizationHeader(request.headers.authorization);
    if (!idToken) {
        return response.status(401).json({ success: false, message: 'Unauthorized: Missing authentication token.' });
    }

    let decodedToken;
    try {
        decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (error) {
        logger.error('Invalid ID token for calendar list', error);
        return response.status(401).json({ success: false, message: 'Unauthorized: Invalid token.' });
    }

    if (decodedToken.uid !== ADMIN_UID) {
        return response.status(403).json({ success: false, message: 'Forbidden: Admin access required.' });
    }

    const calendarId = request.query.calendarId || 'primary';
    const now = new Date();
    const defaultTimeMin = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const defaultTimeMax = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const queryTimeMin = request.query.timeMin ? new Date(request.query.timeMin) : defaultTimeMin;
    const queryTimeMax = request.query.timeMax ? new Date(request.query.timeMax) : defaultTimeMax;

    if (Number.isNaN(queryTimeMin.getTime()) || Number.isNaN(queryTimeMax.getTime())) {
        return response.status(400).json({ success: false, message: 'Invalid time range parameters.' });
    }

    try {
        const calendar = await getCalendarClient();
        const eventsResponse = await calendar.events.list({
            calendarId,
            timeMin: queryTimeMin.toISOString(),
            timeMax: queryTimeMax.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: parseInt(request.query.maxResults || '50', 10)
        });

        const events = eventsResponse.data.items || [];
        return response.status(200).json({
            success: true,
            events: events.map(sanitizeEventResponse)
        });
    } catch (error) {
        logger.error('Failed to list calendar events', error);
        const status = error.code === 404 ? 404 : 500;
        return response.status(status).json({
            success: false,
            message: error.message || 'Failed to fetch calendar events.'
        });
    }
});

// index.js - exports.sendConfirmationSms (FINAL, DEBUG-READY VERSION)
exports.sendConfirmationSms = onDocumentWritten({
        document: `${BOOKINGS_COLLECTION}/{bookingId}`,
        secrets: [iprogsmsToken]
    }, 
    async (event) => {

        const before = event.data?.before?.data() || {};
        const after = event.data?.after?.data() || {};

        const oldStatus = (before.status || 'pending').toLowerCase();
        const newStatus = (after.status || 'pending').toLowerCase();

        // Trigger only if status changes to confirmed
        if (oldStatus !== 'confirmed' && newStatus === 'confirmed') {
            const bookingId = event.params.bookingId;
            const apiToken = iprogsmsToken.value();
            const phoneNumber = after.clientPhone;
            const db = admin.firestore();
            
            // 1. Basic Data Validation
            if (!phoneNumber) {
                logger.warn(`[CONFIRM SMS] Booking ${bookingId} confirmed but clientPhone missing.`);
                return;
            }

            // --- 2. SETUP FOR ROUTING ---
            
            // Calculate the time difference (ms)
            const appointmentDateTimeStr = `${after.selectedDate} ${after.selectedTime}`;
            const appointmentTimeMs = new Date(appointmentDateTimeStr).getTime();
            const nowMs = Date.now();
            const timeDifferenceMs = appointmentTimeMs - nowMs;

            const MS_IN_24_HOURS = 24 * 60 * 60 * 1000;
            const MS_IN_2_HOURS = 2 * 60 * 60 * 1000;

            let updateFields = {}; 

            try {
                // A. Send Initial Confirmation Message (using in-line logic for the unique confirmation message)
                
                const clientName = after.clientName || 'Valued Client';
                const appointmentDate = after.selectedDate || 'the booked date';
                const appointmentTime = after.selectedTime || 'the booked time';
                const designName = after.designName || 'service';
                const totalAmount = after.totalAmount || 0;
                const remainingBalance = (totalAmount - (totalAmount / 2)).toFixed(2);
                
                const confMessage = 
                    `Hi ${clientName}! Your Nailease appointment for ${designName} on ${appointmentDate} at ${appointmentTime} is CONFIRMED! Remaining balance: PHP ${remainingBalance}. Thank you!`;
                
                // Re-use the sendReminderSms helper logic here (assuming the helper is adapted to handle the confirmation message)
                await sendReminderSms(after, 'confirmation', confMessage);
                logger.info(`[CONFIRMATION] Initial Confirmation SMS Sent.`);
                
                
                // B. ROUTING: Check if reminder is due NOW (Last-Minute Bookings)
                
                if (timeDifferenceMs < 0) {
                    logger.warn(`[ROUTER] Booking ${bookingId} is in the past. No timed reminder needed.`);
                } 
                else if (timeDifferenceMs <= MS_IN_2_HOURS) {
                    // 1. Send 2-Hour Reminder Immediately
                    await sendReminderSms(after, '2h');
                    updateFields.reminder24hSent = true; // Mark both as sent to skip cron
                    updateFields.reminder2hSent = true;
                    logger.info(`[ROUTER] Sent 2H Reminder Immediately.`);
                } 
                else if (timeDifferenceMs <= MS_IN_24_HOURS) {
                    // 2. Send 24-Hour Reminder Immediately
                    await sendReminderSms(after, '24h');
                    updateFields.reminder24hSent = true; // Mark as sent to skip cron
                    logger.info(`[ROUTER] Sent 24H Reminder Immediately.`);
                } 
                
                // C. Update Firestore: Only update if a reminder flag was set
                if (Object.keys(updateFields).length > 0) {
                    await db.collection(BOOKINGS_COLLECTION).doc(bookingId).update(updateFields);
                }
    
            } catch (error) {
                logger.error(`[CONFIRM SMS CRITICAL ERROR] Error during Confirmation/Routing for ${bookingId}:`, error);
            }
            
            return;
        }
        return;
    });

exports.send24HourReminder = onSchedule('0 20 * * *', 
    { secrets: [iprogsmsToken] }, 
    async (event) => {
      
      // NOTE: This runs daily at 8:00 PM (20:00)
  
      // Calculate the target date (Tomorrow's date in YYYY-MM-DD format)
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 1); 
      
      // We assume selectedDate in Firestore is stored as a simple string like 'YYYY-MM-DD'
      const targetDateString = targetDate.toISOString().split('T')[0]; 
      const db = admin.firestore();
      const apiToken = iprogsmsToken.value();
  
      logger.info(`[24H REMINDER] Starting scan for bookings on ${targetDateString}.`);
  
      try {
          // 1. Query Firestore for confirmed bookings for the target date that haven't been reminded
          const bookingsRef = db.collection(BOOKINGS_COLLECTION);
          const snapshot = await bookingsRef
              .where('status', '==', 'confirmed')
              .where('selectedDate', '==', targetDateString)
              .where('reminder24hSent', '==', false) // Flag to prevent duplicates
              .get();
  
          if (snapshot.empty) {
              logger.info("[24H REMINDER] No eligible confirmed bookings found.");
              return null;
          }
  
          const promises = [];
  
          snapshot.forEach(doc => {
              const data = doc.data();
              const bookingId = doc.id;
              const phoneNumber = data.clientPhone;
              
              if (!phoneNumber) {
                  logger.warn(`[24H REMINDER] Booking ${bookingId} confirmed but clientPhone missing.`);
                  return;
              }
  
              const phoneNumberCleaned = phoneNumber.replace(/\+/g, '').trim(); 
              const SMS_PROVIDER = 0;
              const clientName = data.clientName || 'Valued Client';
              const appointmentTime = data.selectedTime || 'the booked time';
              const designName = data.designName || 'service';
              
              const message = 
                  `Friendly Reminder: Hi ${clientName}, your Nailease appointment for ${designName} is tomorrow at ${appointmentTime}. Thank you for booking, see you there!`;
              
              const smsApiBaseUrl = 'https://sms.iprogtech.com/api/v1/sms_messages';
              
              const requestBody = {
                  api_token: apiToken,
                  phone_number: phoneNumberCleaned,
                  message: message,
                  sms_provider: SMS_PROVIDER
              };
  
              // 2. Send SMS and Update Flag (in parallel)
              const sendAndUpdatePromise = (async () => {
                  try {
                      const apiResponse = await fetch(
                          smsApiBaseUrl,
                          {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(requestBody)
                          }
                      );
  
                      const responseText = await apiResponse.text();
                      const apiData = JSON.parse(responseText);
  
                      if (apiResponse.status === 200 && (apiData.status === 200 || apiData.status === 'success')) {
                          logger.info(`[24H REMINDER SUCCESS] Sent to ${phoneNumber}. ID: ${apiData.message_id}`);
                          
                          // Critical: Update Firestore flag to prevent repeat sends
                          await doc.ref.update({
                              reminder24hSent: true,
                              updatedAt: admin.firestore.FieldValue.serverTimestamp()
                          });
                      } else {
                          logger.error(`[24H REMINDER FAILED] API Error. Status: ${apiResponse.status}, Raw: ${responseText}`);
                      }
  
                  } catch (error) {
                      logger.error(`[24H REMINDER CRITICAL ERROR] Network/Fetch failure for ${bookingId}:`, error);
                  }
              })();
              
              promises.push(sendAndUpdatePromise);
          });
  
          await Promise.allSettled(promises);
          logger.info(`[24H REMINDER] Successfully processed ${snapshot.size} appointments.`);
          
      } catch (error) {
          logger.error("[24H REMINDER] Firestore query failed:", error);
      }
      
      return null;
});

exports.send2HourReminder = onSchedule('0 10 * * *', // Runs daily at 10:00 AM (e.g., to catch appointments from 10:00 AM to EOD)
    { secrets: [iprogsmsToken] }, 
    async (event) => {
      
      const targetDate = new Date().toISOString().split('T')[0];
      const db = admin.firestore();
      
      logger.info(`[2H REMINDER] Starting scan for TODAY's bookings (${targetDate}).`);
      
      const MS_IN_2_HOURS = 2 * 60 * 60 * 1000; // Use the same const name as the router
      const currentMs = Date.now();

      try {
          // 1. Query Firestore for confirmed bookings for TODAY that haven't received the 2-hour reminder
          const bookingsRef = db.collection(BOOKINGS_COLLECTION);
          const snapshot = await bookingsRef
              .where('status', '==', 'confirmed')
              .where('selectedDate', '==', targetDate) // Filter only today's date
              .where('reminder2hSent', '==', false) // Filter only unsent reminders
              .get();

          if (snapshot.empty) {
              logger.info("[2H REMINDER] No eligible confirmed bookings found.");
              return null;
          }

          const promises = [];
  
          snapshot.forEach(doc => {
              const data = doc.data();
              const bookingId = doc.id;
              
              const appointmentDateTimeStr = `${data.selectedDate} ${data.selectedTime}`;
              const appointmentTimeMs = new Date(appointmentDateTimeStr).getTime();
              const timeDiff = appointmentTimeMs - currentMs;
              
              // 2. CLIENT-SIDE TIME CHECK: Is the appointment exactly 2 hours away (or less)?
              if (timeDiff > 0 && timeDiff <= TWO_HOURS_IN_ADVANCE) {
                  
                  const sendAndUpdatePromise = (async () => {
                      try {
                          await sendReminderSms(data, '2h');
  
                          // Critical: Update Firestore flag to prevent repeat sends
                          await doc.ref.update({
                              reminder2hSent: true,
                              updatedAt: admin.firestore.FieldValue.serverTimestamp()
                          });
                      } catch (error) {
                          logger.error(`[2H REMINDER CRITICAL ERROR] Failure for ${bookingId}:`, error);
                      }
                  })();
                  
                  promises.push(sendAndUpdatePromise);
              } else {
                  logger.info(`[2H REMINDER] Skipping booking ${bookingId}: Not within the 2-hour window.`);
              }
          });
  
          await Promise.allSettled(promises);
          logger.info(`[2H REMINDER] Finished processing ${promises.length} potential appointments.`);
          
      } catch (error) {
          logger.error("[2H REMINDER] Firestore query failed:", error);
      }
      
      return null;
});