const admin = require('firebase-admin');
admin.initializeApp();
const { defineSecret } = require('firebase-functions/params');
const { google } = require('googleapis');
const iprogsmsToken = defineSecret('IPROGSMS_TOKEN');
const calendarCredentials = defineSecret('GOOGLE_CALENDAR_CREDENTIALS');
const { setGlobalOptions } = require("firebase-functions");
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");

setGlobalOptions({ maxInstances: 10 });

const allowedOrigins = [
    'https://sendphoneforverification-2ldy5wz35q-uc.a.run.app', 
    'http://localhost:3000', 
    'http://localhost:5173',
    'http://localhost:5500',
    // Add other allowed origins here
];

const ADMIN_UID = 'xZfAuu3cQkelk25frtC96TdJQIJ2';
const DEFAULT_TIMEZONE = 'Asia/Manila';

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

        // ACCESS THE SECRET VALUE via process.env
        const apiToken = process.env.IPROGSMS_TOKEN;

        const apiResponse = await fetch(otpApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                api_token: apiToken, 
                phone_number: phoneNumber, 
                message: "Your OTP code is :otp. It is valid for 5 minutes. Do not share this code with anyone." // optional empty message
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

    const { phoneNumber, otpCode } = request.body; // Client sends both phone and code
    const apiToken = process.env.IPROGSMS_TOKEN;

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

// --- Public Availability Aggregation ---
// Keep a lightweight, public-friendly availability mirror:
// artifacts/{APP_ID}/availability/{YYYY-MM-DD} => { takenTimes: ["8:00 AM", ...], updatedAt: serverTimestamp() }
const APP_ID = 'nailease25-iapt';
const BOOKINGS_COLLECTION = `artifacts/${APP_ID}/bookings`;
const AVAILABILITY_COLLECTION = `artifacts/${APP_ID}/availability`;
const DEFAULT_CALENDAR_ID = 'primary';

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

async function recomputeAvailabilityForDate(dateStr, tx = null) {
    if (!dateStr) return;
    const db = admin.firestore();
    const q = db.collection(BOOKINGS_COLLECTION).where('selectedDate', '==', dateStr);
    const snap = await q.get();

    const taken = new Set();
    snap.forEach(doc => {
        const d = doc.data();
        if ((d.status || '').toLowerCase() === 'cancelled') return;
        const t = normalizeTo12Hour(d.selectedTime || d.time || d.appointmentTime || d.formattedTime);
        if (t) taken.add(t);
    });

    const docRef = db.collection(AVAILABILITY_COLLECTION).doc(dateStr);
    const payload = {
        takenTimes: Array.from(taken),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    if (tx) {
        tx.set(docRef, payload, { merge: true });
    } else {
        await docRef.set(payload, { merge: true });
    }
}

exports.availabilityMirror = onDocumentWritten(
    `${BOOKINGS_COLLECTION}/{bookingId}`,
    async (event) => {
        try {
            const before = event.data.before.exists ? event.data.before.data() : null;
            const after = event.data.after.exists ? event.data.after.data() : null;

            const datesToUpdate = new Set();
            if (before?.selectedDate) datesToUpdate.add(before.selectedDate);
            if (after?.selectedDate) datesToUpdate.add(after.selectedDate);

            const batchDates = Array.from(datesToUpdate);
            await Promise.all(batchDates.map(dateStr => recomputeAvailabilityForDate(dateStr)));

            logger.info('Availability updated for dates:', batchDates);
        } catch (err) {
            logger.error('availabilityMirror failed:', err);
        }
    }
);

// Sync availability from Google Calendar events into the availability mirror
exports.syncAvailabilityFromCalendar = onRequest({
    cors: true,
    secrets: [calendarCredentials],
    timeoutSeconds: 60
}, async (request, response) => {
    try {
        const calendar = await getCalendarClient();
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 2, 1);

        const eventsResponse = await calendar.events.list({
            calendarId: DEFAULT_CALENDAR_ID,
            timeMin: start.toISOString(),
            timeMax: end.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: 2500
        });

        const events = eventsResponse.data.items || [];
        // Build date -> takenTimes set from events
        const dateToTimes = new Map();
        for (const ev of events) {
            const startStr = ev.start?.dateTime || ev.start?.date;
            if (!startStr) continue;
            const d = new Date(startStr);
            if (Number.isNaN(d.getTime())) continue;
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const dateKey = `${y}-${m}-${day}`;
            const hours = d.getHours();
            const period = hours >= 12 ? 'PM' : 'AM';
            const h12 = (hours % 12) || 12;
            const time12 = `${h12}:00 ${period}`;
            if (!dateToTimes.has(dateKey)) dateToTimes.set(dateKey, new Set());
            dateToTimes.get(dateKey).add(time12);
        }

        // Merge with current bookings for the same window
        const db = admin.firestore();
        const q = db.collection(BOOKINGS_COLLECTION)
            .where('selectedDate', '>=', `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`)
            .where('selectedDate', '<=', `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-31`);
        const snap = await q.get();
        snap.forEach(doc => {
            const b = doc.data();
            if ((b.status || '').toLowerCase() === 'cancelled') return;
            const dateKey = b.selectedDate;
            const t = normalizeTo12Hour(b.selectedTime || b.time || b.appointmentTime || b.formattedTime);
            if (!dateKey || !t) return;
            if (!dateToTimes.has(dateKey)) dateToTimes.set(dateKey, new Set());
            dateToTimes.get(dateKey).add(t);
        });

        // Write availability docs
        const writes = [];
        for (const [dateKey, set] of dateToTimes.entries()) {
            const docRef = db.collection(AVAILABILITY_COLLECTION).doc(dateKey);
            writes.push(docRef.set({
                takenTimes: Array.from(set),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true }));
        }
        await Promise.all(writes);

        response.status(200).json({ success: true, updatedDates: Array.from(dateToTimes.keys()) });
    } catch (err) {
        logger.error('syncAvailabilityFromCalendar failed:', err);
        response.status(500).json({ success: false, message: err.message || 'Failed to sync availability' });
    }
});

