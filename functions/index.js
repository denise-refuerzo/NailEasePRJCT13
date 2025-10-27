const admin = require('firebase-admin');
admin.initializeApp();
const { defineSecret } = require('firebase-functions/params');

// Define the secret parameter (needs to be done once per codebase)
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
                // Use the token in the request body as required by iprogsms docs
                api_token: apiToken, 
                phone_number: phoneNumber, // Use the correct field name from docs
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

    // --- CRITICAL FIX: Firebase Authentication Verification ---
    const idToken = request.headers.authorization ? request.headers.authorization.split('Bearer ')[1] : null;

    if (!idToken) {
        logger.error("401: Missing ID token in request headers.");
        return response.status(401).json({ success: false, message: "Unauthorized: Missing authentication token." });
    }
    
    let uid;
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        uid = decodedToken.uid; // Authentication successful, user is identified by UID
        logger.info(`Token verified for UID: ${uid}`);
    } catch (error) {
        logger.error("401: Invalid or expired ID token.", error);
        return response.status(401).json({ success: false, message: "Unauthorized: Invalid token." });
    }
    // ------------------------------------------------------------------

    const { phoneNumber, otpCode } = request.body; // Client sends both phone and code
    const apiToken = process.env.IPROGSMS_TOKEN;

    if (!phoneNumber || !otpCode) {
        return response.status(400).json({ success: false, message: "Missing required fields." }); 
    }
    
    try {
        const verifyApiUrl = 'https://sms.iprogtech.com/api/v1/otp/verify_otp'; // <-- The new endpoint
        
        const apiResponse = await fetch(verifyApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                api_token: apiToken, 
                phone_number: phoneNumber,
                otp: otpCode // <-- Send the user-entered code for checking
            })
        });

        // Check for HTTP errors (4xx or 5xx status codes) from iProgTech
        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            logger.error(`iProgTech API returned non-OK status ${apiResponse.status}:`, errorText);
            // Do not return 401; return 503 (Service Unavailable) or 500
            return response.status(503).json({ success: false, message: "Verification API temporarily unavailable or configuration error." });
        }

        const apiData = await apiResponse.json();
        logger.info("iProgTech FINAL RESPONSE status:", apiData.status); 

        // --- FIX IS HERE: Relying ONLY on the "status" field for success ---
        if (apiData.status === 'success') {
            // Verification succeeded! 
            return response.status(200).json({ success: true, message: "Verification successful." });
        } else {
            // Treat any other status (e.g., 'error') as a failure
            logger.warn("OTP failed validation:", apiData.message || "Unknown reason.");
            return response.status(401).json({ success: false, message: "Invalid OTP code." });
        }
        
    } catch (error) {
        // Catch network errors, JSON parsing errors, etc.
        logger.error("Critical error during OTP verification:", error);
        return response.status(500).json({ success: false, message: "Critical server error. Check logs." }); 
    }
});


// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
