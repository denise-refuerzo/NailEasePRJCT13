// FIX: Using full modular CDN URLs to resolve "Failed to resolve module specifier" error
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
// Added FieldValue for server timestamp
import { getFirestore, doc, getDoc, setDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js"; 

// Import the client layout renderer and listener attachment function
import { renderClientLayout, attachClientDashboardListeners } from "./client_dashboard_layout.js"; 

// --- CRITICAL FIX: Import Reusable UI Manager ---
import { renderLoading, hideLoading, showContainer, hideContainer } from "./ui_manager.js";


// --- Configuration and Initialization ---

const firebaseConfig = {
    // Your actual configuration
    apiKey: "AIzaSyACN3A8xm9pz3bryH6xGhDAF6TCwUoGUp4",
    authDomain: "nailease25.firebaseapp.com",
    projectId: "nailease25",
    storageBucket: "nailease25.firebasestorage.app",
    messagingSenderId: "706150189317",
    appId: "1:706150189317:web:82986edbd97f545282cf6c",
    measurementId: "G-RE42B3FVRJ"
};

// IMPORTANT: Replace this with the UID you copied from your console for Admin access.
const ADMIN_UID = 'xZfAuu3cQkelk25frtC96TdJQIJ2'; 
const APP_ID = 'nailease25-iapt'; // Unique ID for Firestore artifacts

const app = initializeApp(firebaseConfig);
const auth = getAuth(app); 
const db = getFirestore(app);

// =========================================================================
// 1. CLOUD FUNCTION URL CONSTANTS (Defined Globally)
// =========================================================================

// NOTE: These URLs are placeholders for your deployed Cloud Functions
const SEND_OTP_URL = 'https://sendphoneforverification-2ldy5wz35q-uc.a.run.app/sendPhoneForVerification';
const VERIFY_OTP_URL = 'https://us-central1-nailease25.cloudfunctions.net/verifyOtp'; 

// --- Core Helper Functions ---

/**
 * Gets the document reference for a specific client.
 * Client data is stored in a private path tied to their UID.
 */
function getClientDocRef(uid) {
    const clientsCollectionPath = `/artifacts/${APP_ID}/users/${uid}/clients`;
    return doc(collection(db, clientsCollectionPath), uid);
}

// =========================================================================
// 2. OTP and Database Functions (LIVE IMPLEMENTATION)
// =========================================================================

/**
 * [EXISTING] Sends the phone number to the deployed Cloud Function for OTP delivery.
 */
async function sendPhoneForVerification(uid, phone) {
    // (Existing Cloud Function call logic remains the same)
    console.log(`[OTP] Calling live Cloud Function for phone: ${phone}`);
    try {
        // (fetch call to SEND_OTP_URL...)
        const response = await fetch(SEND_OTP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                phoneNumber: phone, 
                uid: uid 
            })
        });

        const data = await response.json();

        if (response.ok) {
            // SUCCESS: Show OTP input field
            const otpSection = document.querySelector('#otpSection') || document.querySelector('#onboardOtpSection');
            const sendOTPBtn = document.querySelector('#sendOTP') || document.querySelector('#onboardSendOtp');

            if (otpSection) otpSection.classList.remove('hidden');
            if (sendOTPBtn) sendOTPBtn.disabled = true;

            alert(`SUCCESS: Code sent to ${phone}. Enter any 6 digits to verify.`);
            return data; 
        } else {
            console.error("OTP Function Error Response:", data);
            const errorMessage = data.message || "Failed to send code. Please try again.";
            alert(errorMessage);
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error("NETWORK/COMMUNICATION FAILED:", error);
        alert("Network error or server failed to respond. Please try again.");
    }
}

/**
 * [EXISTING] Verifies the OTP code and updates the user's data in Firestore.
 */
async function verifyOTPAndSave(uid, name, phone, code) {
    console.log(`[OTP] Attempting to verify code ${code} and save user data...`);
    if (code.length !== 6) {
        alert("Please enter a 6-digit code.");
        return;
    }
    
    try {
        const user = auth.currentUser;
        if (!user) { alert("Authentication state error. Please log in again."); return; }
        const idToken = await user.getIdToken();

        // 1. LIVE API CALL TO VERIFY OTP
        const verifyResponse = await fetch(VERIFY_OTP_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}` 
            },
            body: JSON.stringify({ phoneNumber: phone, otpCode: code })
        });
        
        const verifyData = await verifyResponse.json();

        if (!verifyResponse.ok || verifyData.success !== true) {
            alert("Verification failed. Invalid code or temporary issue. Please try again.");
            console.error("Verification API Response:", verifyData);
            return;
        }

        // 2. VERIFICATION SUCCEEDED - WRITE TO FIRESTORE
        const clientData = {
            name: name,
            phone: phone,
            isVerified: true,
            onboardedAt: new Date().toISOString(),
            lastUpdated: serverTimestamp()
        };
        await setDoc(getClientDocRef(uid), clientData);
        console.log("Client data successfully saved/updated in Firestore.");
        
        // 3. Refresh UI to show main dashboard
        alert("Verification successful! Your profile is complete.");
        setTimeout(() => checkAndSetRole(auth.currentUser), 500); 
        
    } catch (error) {
        console.error("Critical error during verification or data saving:", error);
        alert("A critical error occurred. See console for details.");
    }
}

/**
 * [NEW] Function to update only the name in Firestore.
 */
export async function updateClientName(uid, newName) {
    try {
        await setDoc(getClientDocRef(uid), { name: newName, lastUpdated: serverTimestamp() }, { merge: true });
        alert("Name updated successfully!");
        // Force UI refresh to show new name on dashboard
        setTimeout(() => checkAndSetRole(auth.currentUser), 100); 
    } catch (error) {
        console.error("Error updating name:", error);
        alert("Failed to save name. See console.");
    }
}

/**
 * Clears the session and redirects to the login view.
 */
async function logoutUser() {
    try {
        await signOut(auth);
        console.log("User signed out successfully.");
    } catch (error) {
        console.error("Logout error:", error);
    }
}

// --- Listener Attachment Functions (No change required here) ---

/**
 * Attaches listeners for the Admin dashboard content.
 */
function attachAdminListeners() {
    document.getElementById('logoutBtn').addEventListener('click', logoutUser);
}

/**
 * Attaches listeners for the Client Onboarding Form.
 * Note: These elements are part of the innerHTML string in renderApp.
 * @param {object} user - The current Firebase user.
 */
function attachOnboardingListeners(user) {
    // 1. Get dynamically created elements
    const onboardNameInput = document.getElementById('onboardName');
    const onboardPhoneInput = document.getElementById('onboardPhone');
    const onboardOtpCodeInput = document.getElementById('onboardOtpCode');
    const onboardSendBtn = document.getElementById('onboardSendOtp');
    const onboardVerifyBtn = document.getElementById('onboardVerifyOtp');

    // 2. Attach Handlers
    document.getElementById('logoutBtn').addEventListener('click', logoutUser); // Global Logout

     // Send OTP Handler
    onboardSendBtn.addEventListener('click', () => {
        const name = onboardNameInput.value.trim();
        const phone = onboardPhoneInput.value.trim();
         if (name && phone) {
             sendPhoneForVerification(user.uid, phone);
         } else {
            alert('Please enter both your name and phone number.');
         }
    });

    // Verify OTP Handler
     onboardVerifyBtn.addEventListener('click', () => {
         const name = onboardNameInput.value.trim();
        const phone = onboardPhoneInput.value.trim();
        const code = onboardOtpCodeInput.value.trim();

        if (name && phone && code) {
            verifyOTPAndSave(user.uid, name, phone, code);
        } else {
             alert('Please ensure all fields are filled.');
        }
     });
}

// --- UI Rendering Logic (Modified to use UI Manager) ---

/**
 * Renders the content based on the user's role and onboarding status.
 * @param {firebase.User} user - The authenticated Firebase user object.
 * @param {object} clientData - The existing client data from Firestore, or null.
 */
function renderApp(user, clientData) {
    // 1. Determine Role
    const isAdmin = user && user.uid === ADMIN_UID;
    const isClientOnboarded = clientData && clientData.isVerified;

    hideContainer('auth-card'); // Hide the login button card
    showContainer('app-content'); // Show the main application area

     if (isAdmin) {
        // ADMIN DASHBOARD (Placeholder)
        document.getElementById('app-content').innerHTML = `
            <div class="p-8 text-center">
                <h2 class="text-4xl font-bold text-pink-700">Admin Dashboard</h2>
                <p class="mt-4 text-gray-600">Welcome, ${user.displayName}. This is where you manage appointments, services, and reports.</p>
                <button id="logoutBtn" class="mt-6 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600">Logout</button>
            </div>
         `;
         attachAdminListeners(); 

     } else {
         // CLIENT FLOW
         if (isClientOnboarded) {
             // RENDER MAIN CLIENT DASHBOARD
            renderClientLayout(document.getElementById('app-content'), user, clientData);
             
            // CRITICAL: Attach event listeners for the dashboard buttons
             attachClientDashboardListeners(user, clientData, logoutUser, sendPhoneForVerification, verifyOTPAndSave, updateClientName);

     } else {
// RENDER CLIENT ONBOARDING/PROFILE FORM
        document.getElementById('app-content').innerHTML = `
                <div class="max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg mt-8">
                    <h2 class="text-2xl font-bold text-pink-600 mb-4">Complete Your Profile</h2>
                    <p class="text-sm text-gray-500 mb-6">We need your name and a verified phone number for booking and SMS reminders (via iprogsms).</p>
                     
                     <div class="mb-4">
                        <label for="onboardName" class="block text-sm font-medium text-gray-700">Name</label>
                        <input type="text" id="onboardName" value="${user.displayName || ''}" placeholder="Your Full Name" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 border">
                     </div>

                     <div class="mb-6">
                         <label for="onboardPhone" class="block text-sm font-medium text-gray-700">Phone Number (Required for OTP)</label>
                         <input type="text" id="onboardPhone" placeholder="+63XXXXXXXXXX" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 border">
                     </div>

                      <button id="onboardSendOtp" class="w-full bg-pink-500 text-white py-2 rounded-lg font-semibold hover:bg-pink-600 transition">Send Verification Code</button>

            <div id="onboardOtpSection" class="mt-6 p-4 border rounded-lg hidden">
                        <label for="onboardOtpCode" class="block text-sm font-medium text-gray-700 mb-2">Enter 6-Digit OTP</label>
                        <input type="text" id="onboardOtpCode" maxlength="6" placeholder="******" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 border text-center text-lg font-mono">
                     <button id="onboardVerifyOtp" class="w-full mt-4 bg-green-500 text-white py-2 rounded-lg font-semibold hover:bg-green-600 transition">Verify and Save Profile</button>
             </div>

                    <button id="logoutBtn" class="mt-4 w-full text-gray-500 hover:text-gray-700">Logout</button>
             </div>
        `;
    // Attach listeners for the dynamically loaded Onboarding content
             attachOnboardingListeners(user); 
        }
    }
}

/**
 * Checks the user's Auth state, queries Firestore for their role/data, and calls the appropriate renderer.
 * @param {firebase.User} user - The authenticated Firebase user object.
 */
async function checkAndSetRole(user) {
// CRITICAL FIX: The entire application is now run within this listener, 
// which also now hides the loader when the check is complete.

    try {
     // If the user state is null, we are signed out.
     if (!user) {
             showContainer('auth-card'); // Show Login Card
             hideContainer('app-content'); 
             return; // Exit early if signed out.
         }

         // Logic for signed-in user
         console.log(`User signed in. UID: ${user.uid}. Checking role...`);

         // Check Firestore for client data
         const clientDoc = await getDoc(getClientDocRef(user.uid));
         let clientData = clientDoc.exists() ? clientDoc.data() : null;

         // Render the appropriate application view
         renderApp(user, clientData);

     } catch (error) {
         console.error("Error checking client data:", error);
         // If error, still show the login card as a fallback
         showContainer('auth-card'); 
         hideContainer('app-content');
         renderError("Failed to load data. See console for error.");

    } finally {
    // CRITICAL FIX: Hide the loader ONLY after the check and rendering are complete
     hideLoading(); 
    }
}

function renderError(message) {
    const appContent = document.getElementById('app-content');
     if (appContent) {
         appContent.innerHTML = `<div class="p-8 text-red-700 bg-red-100 rounded-lg max-w-lg mx-auto mt-8">${message}</div>`;
        showContainer('app-content'); // Ensure error message is shown
     }
}

// --- Main Execution Flow ---

window.addEventListener('DOMContentLoaded', () => {
    // 1. CRITICAL: Start the loading spinner immediately
    renderLoading(); 

     const loginButton = document.getElementById('google-login-btn');

    if (loginButton) {
        loginButton.addEventListener('click', () => {
            const provider = new GoogleAuthProvider();
            signInWithPopup(auth, provider).catch(error => {
                console.error("Google Sign-In Error:", error.code, error.message);
                alert(`Login Failed: ${error.message}`);
            });
        });
     }

     onAuthStateChanged(auth, checkAndSetRole);
});
