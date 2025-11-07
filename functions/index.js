const admin = require('firebase-admin');
admin.initializeApp();
const { defineSecret } = require('firebase-functions/params');
const iprogsmsToken = defineSecret('IPROGSMS_TOKEN');
const { setGlobalOptions } = require("firebase-functions");
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

setGlobalOptions({ maxInstances: 10 });

const allowedOrigins = [
    'https://sendphoneforverification-2ldy5wz35q-uc.a.run.app', 
    'http://localhost:3000', 
    // Add other allowed origins here
];

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

/**
 * Google Calendar Integration Function
 * Creates a calendar event in Google Calendar when a booking is completed
 * 
 * To use this function:
 * 1. Set up a Google Cloud Project and enable Google Calendar API
 * 2. Create a Service Account and download the JSON key
 * 3. Share your Google Calendar with the service account email
 * 4. Store the service account JSON as a Firebase secret: GOOGLE_CALENDAR_CREDENTIALS
 * 5. Deploy this function
 * 
 * Note: This is optional. The client-side integration (google-calendar.js) works without any setup.
 */
const { google } = require('googleapis');
const googleCalendarCredentials = defineSecret('GOOGLE_CALENDAR_CREDENTIALS');

exports.createCalendarEvent = onRequest({
    cors: allowedOrigins,
    secrets: [googleCalendarCredentials]
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

    const { bookingData, calendarId } = request.body;

    if (!bookingData || !bookingData.selectedDate || !bookingData.selectedTime) {
        return response.status(400).json({ success: false, message: "Missing booking data." });
    }

    try {
        // Parse credentials from secret
        const credentialsJson = process.env.GOOGLE_CALENDAR_CREDENTIALS;
        if (!credentialsJson) {
            logger.error("Google Calendar credentials not configured");
            return response.status(500).json({ success: false, message: "Calendar service not configured." });
        }

        const credentials = JSON.parse(credentialsJson);
        
        // Authenticate with service account
        const auth = new google.auth.GoogleAuth({
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/calendar']
        });

        const calendar = google.calendar({ version: 'v3', auth });

        // Parse date and time
        const date = new Date(bookingData.selectedDate);
        const [time, period] = bookingData.selectedTime.split(' ');
        const [hours, minutes] = time.split(':');
        
        let hour24 = parseInt(hours);
        if (period === 'PM' && hour24 !== 12) {
            hour24 += 12;
        } else if (period === 'AM' && hour24 === 12) {
            hour24 = 0;
        }
        
        const startDateTime = new Date(date);
        startDateTime.setHours(hour24, parseInt(minutes), 0, 0);
        
        const endDateTime = new Date(startDateTime);
        endDateTime.setHours(endDateTime.getHours() + 1);

        // Create event
        const event = {
            summary: `Nail Appointment - ${bookingData.design.name}`,
            description: `Booking ID: ${bookingData.bookingId}\n\n` +
                `Design: ${bookingData.design.name}\n` +
                `Client: ${bookingData.personalInfo.fullName}\n` +
                `Phone: ${bookingData.personalInfo.phone}\n` +
                `Email: ${bookingData.personalInfo.email || 'Not provided'}\n\n` +
                `Total Amount: ₱${bookingData.design.price.toFixed(2)}\n` +
                `Reservation Fee: ₱${(bookingData.design.price / 2).toFixed(2)}`,
            location: 'DCAC NailEase Studio',
            start: {
                dateTime: startDateTime.toISOString(),
                timeZone: 'Asia/Manila',
            },
            end: {
                dateTime: endDateTime.toISOString(),
                timeZone: 'Asia/Manila',
            },
        };

        // Use provided calendarId or default to 'primary'
        const targetCalendarId = calendarId || 'primary';

        const result = await calendar.events.insert({
            calendarId: targetCalendarId,
            resource: event,
        });

        logger.info(`Calendar event created: ${result.data.htmlLink}`);

        return response.status(200).json({
            success: true,
            message: "Calendar event created successfully.",
            eventId: result.data.id,
            eventLink: result.data.htmlLink
        });

    } catch (error) {
        logger.error("Error creating calendar event:", error);
        return response.status(500).json({
            success: false,
            message: "Failed to create calendar event.",
            error: error.message
        });
    }
});

