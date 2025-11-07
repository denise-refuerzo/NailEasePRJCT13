import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js"; 
import { getFirestore, doc, getDoc, setDoc, collection, serverTimestamp,addDoc, deleteDoc, getDocs, query, orderBy, writeBatch
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js"; 

// Import the layout renderer and listener attachment function
import { renderClientLayout, attachClientDashboardListeners } from "./client_dashboard_layout.js"; 
import { renderAdminLayout, attachAdminDashboardListeners, renderManageView } from "./admin_dashboard_layout.js"; 
import { renderLoading, hideLoading, showContainer, hideContainer } from "./ui_manager.js";


// firebase config and init
const firebaseConfig = {
    apiKey: "AIzaSyACN3A8xm9pz3bryH6xGhDAF6TCwUoGUp4",
    authDomain: "nailease25.firebaseapp.com",
    projectId: "nailease25",
    storageBucket: "nailease25.firebasestorage.app",
    messagingSenderId: "706150189317",
    appId: "1:706150189317:web:82986edbd97f545282cf6c",
    measurementId: "G-RE42B3FVRJ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app); 
export const db = getFirestore(app); // <-- EXPORT DB
export const ADMIN_UID = 'xZfAuu3cQkelk25frtC96TdJQIJ2'; //admin id
export const APP_ID = 'nailease25-iapt'; // firebase project id

const SEND_OTP_URL = 'https://sendphoneforverification-2ldy5wz35q-uc.a.run.app/sendPhoneForVerification';
const VERIFY_OTP_URL = 'https://us-central1-nailease25.cloudfunctions.net/verifyOtp'; 

//paths in the firestore
const DESIGNS_COLLECTION = `content/${APP_ID}/designs`;
const GALLERY_COLLECTION = `content/${APP_ID}/gallery`;


export function getClientDocRef(uid) {
    const clientsCollectionPath = `/artifacts/${APP_ID}/users/${uid}/clients`;
    return doc(collection(db, clientsCollectionPath), uid);
}

function getContentDocRef(collectionPath, id) {
    return doc(db, collectionPath, id);
}

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

// Clears the session and redirects to the login view.
async function logoutUser() {
    try {
        await signOut(auth);
        console.log("User signed out successfully.");
        window.location.href = 'homepage.html'; 

    } catch (error) {
        console.error("Logout error:", error);
        window.location.href = 'homepage.html';
    }
}

export const state = { 
    currentPage: 'dashboard', 
    currentTab: 'designs', 
    designs: [], 
    gallery: [], 
    editingDesign: null,
    
    // NEW PAGINATION STATE
    designsCurrentPage: 1,
    promosCurrentPage: 1,
    credentialsCurrentPage: 1,
    promosActiveCurrentPage: 1, // State for active promo pagination
}; 

export function setPage(page, tab = 'designs', targetPage = 1, activePromoPage = 1) { 
    console.log(`Setting page to ${page}, tab to ${tab}, list page: ${targetPage}, active promo page: ${activePromoPage}`);
    
    state.currentPage = page;
    state.currentTab = tab;
    
    // Reset editing state
    if (page === 'dashboard' || page === 'manage') {
        state.editingDesign = null;
    }
    
    // Update pagination state based on tab
    if (tab === 'designs') {
        state.designsCurrentPage = Math.max(1, targetPage);
    } else if (tab === 'promo') {
        state.promosCurrentPage = Math.max(1, targetPage);
        // CRITICAL: Update active promo page state
        state.promosActiveCurrentPage = Math.max(1, activePromoPage); 
    } else if (tab === 'credentials') {
        state.credentialsCurrentPage = Math.max(1, targetPage);
    }
    
    window.checkAndSetRole(auth.currentUser); 
}

export function setTab(tab) { 
    // Reset page number to 1 when switching tabs
    setPage(state.currentPage, tab, 1, 1); // Reset both list and active promo pages
}

async function fetchContent() {
    try {
        // Fetch Designs
        const designsQuery = query(collection(db, DESIGNS_COLLECTION), orderBy('timestamp', 'desc'));
        const designsSnapshot = await getDocs(designsQuery);
        state.designs = designsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Fetch Gallery (Promo and Credentials)
        const galleryQuery = query(collection(db, GALLERY_COLLECTION), orderBy('timestamp', 'desc'));
        const gallerySnapshot = await getDocs(galleryQuery);
        state.gallery = gallerySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    } catch (error) {
        console.error("Error fetching admin content:", error);
    }
}

export async function saveDesign(id, data) { 
    try {
        const payload = { 
            ...data, 
            price: parseFloat(data.price), 
            timestamp: serverTimestamp() 
        };
        const action = id ? 'updated' : 'added';
        const title = data.title || 'New Design';

        if (id) {
            await setDoc(getContentDocRef(DESIGNS_COLLECTION, id), payload, { merge: true });
        } else {
            await addDoc(collection(db, DESIGNS_COLLECTION), payload);
        }
        
        state.editingDesign = null;
        window.checkAndSetRole(auth.currentUser); 

        // SWEETALERT SUCCESS NOTIFICATION
        Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: `Design "${title}" successfully ${action}.`,
            showConfirmButton: false,
            timer: 1500
        });

    } catch (error) {
        console.error("Error saving design:", error);
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Failed to save design. Check the console for details.',
        });
    }
} 
/**
 * Updates design Title/Price directly from the inline list item form.
 * @param {HTMLFormElement} form - The form element containing the inputs.
 * @param {string} id - The document ID of the design.
 */
export async function updateDesignInline(form, id) { 
    // Note: The form object is passed directly from the onclick handler in the layout.
    const newTitle = form.querySelector(`#design-title-${id}`).value;
    const newPrice = form.querySelector(`#design-price-${id}`).value;
    
    if (!newTitle || !newPrice) {
        Swal.fire('Error', 'Title and Price are required.', 'warning');
        return;
    }

    try {
        const payload = { 
            title: newTitle, 
            price: parseFloat(newPrice),
            timestamp: serverTimestamp() 
        };

        await setDoc(getContentDocRef(DESIGNS_COLLECTION, id), payload, { merge: true });
        
        window.checkAndSetRole(auth.currentUser); 

        // CRITICAL: Call resetSaveButton to update data attributes and disable the button after save
        window.resetSaveButton(id); 

        Swal.fire({
            icon: 'success',
            title: 'Design Updated!',
            text: `Changes to "${newTitle}" saved.`,
            showConfirmButton: false,
            timer: 1500
        });

    } catch (error) {
        console.error("Error updating design inline:", error);
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Failed to update design.',
        });
    }
}

export async function deleteDesign(id) { 
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
        try {
            await deleteDoc(getContentDocRef(DESIGNS_COLLECTION, id));
            window.checkAndSetRole(auth.currentUser); 
            Swal.fire(
                'Deleted!',
                'The design has been deleted.',
                'success'
            );
        } catch (error) {
            console.error("Error deleting design:", error);
            Swal.fire('Failed!', 'The design could not be deleted.', 'error');
        }
    }
} 


export async function saveGalleryItem(type, data) { 
    try {
        // --- FIX: Conditionally include the isActive field to avoid writing 'undefined' to Firestore ---
        const activeField = type === 'promo' ? { isActive: false } : {}; 
        
        const payload = { 
            type: type, 
            imageUrl: data.imageUrl,
            ...activeField, // Spread the field only if it's a promo
            timestamp: serverTimestamp() 
        };

        await addDoc(collection(db, GALLERY_COLLECTION), payload);
        window.checkAndSetRole(auth.currentUser); 

        // SWEETALERT SUCCESS NOTIFICATION
        Swal.fire({
            icon: 'success',
            title: 'Added!',
            text: `New ${type} image successfully added.`,
            showConfirmButton: false,
            timer: 1500
        });
    } catch (error) {
        console.error(`Error saving ${type}:`, error);
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Failed to save ${type}. Check console.',
        });
    }
} 

export async function deleteGalleryItem(id) { 
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
        try {
            await deleteDoc(getContentDocRef(GALLERY_COLLECTION, id));
            window.checkAndSetRole(auth.currentUser);
            Swal.fire(
                'Deleted!',
                'The gallery item has been deleted.',
                'success'
            );
        } catch (error) {
            console.error("Error deleting gallery item:", error);
            Swal.fire('Failed!', 'The item could not be deleted.', 'error');
        }
    }
} 

export async function toggleActivePromo(id, isActive) { 
    try {
        // Set the target promo's status
        await setDoc(getContentDocRef(GALLERY_COLLECTION, id), { isActive: isActive }, { merge: true });
        
        // When toggling, reset the active promo page to 1 so the newly active promo shows immediately
        if(isActive) {
            state.promosActiveCurrentPage = 1;
        }
        
        window.checkAndSetRole(auth.currentUser); 
        
        // SWEETALERT CONFIRMATION
        Swal.fire({
            icon: 'info',
            title: 'Status Updated',
            text: `Promo is now ${isActive ? 'ACTIVE' : 'INACTIVE'} on the site.`,
            showConfirmButton: false,
            timer: 1500
        });

    } catch (error) {
        console.error("Error toggling promo status:", error);
        Swal.fire('Failed!', 'Could not update promo status.', 'error');
    }
} 

export async function toggleFeaturedDesign(id, isFeatured) { 
    try {
        await setDoc(getContentDocRef(DESIGNS_COLLECTION, id), { isFeatured: isFeatured }, { merge: true });
        
        window.checkAndSetRole(auth.currentUser); 
        
        Swal.fire({
            icon: 'info',
            title: 'Status Updated',
            text: `Design is now ${isFeatured ? 'FEATURED' : 'STANDARD'}.`,
            showConfirmButton: false,
            timer: 1500
        });

    } catch (error) {
        console.error("Error toggling featured status:", error);
        Swal.fire('Failed!', 'Could not update featured status.', 'error');
    }
} 

export function editDesign(id) { 
    const designToEdit = state.designs.find(d => d.id === id);
    if (designToEdit) {
        // Set the editing data
        state.editingDesign = designToEdit;
        
        // Temporarily change the page state to an arbitrary value, then back to force the re-render.
        // This is a common pattern to bypass browser caching of the innerHTML structure.
        state.currentPage = 'editing'; 
        state.currentTab = 'designs';
        window.checkAndSetRole(auth.currentUser);

        // Immediately follow up with the correct page state to display the form.
        // This second call isn't necessary in all environments, but adds robustness.
        // Forcing a full re-render is usually enough.
        
    }
} 

 /**
 * Attaches listeners for the Client Onboarding Form.
 * Note: These elements are part of the innerHTML string in renderApp.
 * @param {object} user - The current Firebase user.
 */
function attachOnboardingListeners(user) {
    const onboardNameInput = document.getElementById('onboardName');
    const onboardPhoneInput = document.getElementById('onboardPhone');
    const onboardOtpCodeInput = document.getElementById('onboardOtpCode');
    const onboardSendBtn = document.getElementById('onboardSendOtp');
    const onboardVerifyBtn = document.getElementById('onboardVerifyOtp');

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

/**
 * Renders the content based on the user's role and onboarding status.
 * @param {firebase.User} user - The authenticated Firebase user object.
 * @param {object} clientData - The existing client data from Firestore, or null.
 */
function renderApp(user, clientData) {
    const appContent = document.getElementById('app-content'); 
    const isAdmin = user && user.uid === ADMIN_UID;
    const isClientOnboarded = clientData && clientData.isVerified;

    
    hideContainer('auth-card'); 
    showContainer('app-content'); 

    if (isAdmin) {
        if (state.currentPage === 'manage' || state.currentPage === 'editing') { 
            appContent.innerHTML = renderManageView(user);
            if (window.attachContentFormListeners) {
                window.attachContentFormListeners();
            }
        } else {
            renderAdminLayout(appContent, user); 
        }
        
        attachAdminDashboardListeners(logoutUser, user); 

    } else {
        // CLIENT FLOW
        if (isClientOnboarded) {
           renderClientLayout(document.getElementById('app-content'), user, clientData);
            
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
                    attachOnboardingListeners(user); 
            }
        }
    }

window.renderApp = renderApp;
/**
 * Checks the user's Auth state, queries Firestore for their role/data, and calls the appropriate renderer.
 * @param {firebase.User} user - The authenticated Firebase user object.
 */

export async function fetchPublicContent() {
    // This is a simplified version of fetchContent for public use
    try {
        const galleryQuery = query(collection(db, GALLERY_COLLECTION), orderBy('timestamp', 'desc'));
        const gallerySnapshot = await getDocs(galleryQuery);
        state.gallery = gallerySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const designsQuery = query(collection(db, DESIGNS_COLLECTION), orderBy('timestamp', 'desc'));
        const designsSnapshot = await getDocs(designsQuery);
        state.designs = designsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching public content:", error);
    }
}

async function checkAndSetRole(user) {
    const isLoginPage = window.location.pathname.endsWith('/index.html') || window.location.pathname.endsWith('/'); 
    const isHomePage = window.location.pathname.endsWith('/homepage.html');
    try {
        if (!user) {
            // CASE 1: NOT LOGGED IN

            if (isLoginPage) {
                showContainer('auth-card'); 
                hideContainer('app-content'); 
                return; 
            } else if (!isHomePage) {
                window.location.href = 'index.html'; 
                return;
            }
            return; 
        }      

        if (isLoginPage) {
                // window.location.href = 'homepage.html'; 
                // return; 
        }

        let clientData = null;
        if (user.uid !== ADMIN_UID) {
            const clientDoc = await getDoc(getClientDocRef(user.uid));
            clientData = clientDoc.exists() ? clientDoc.data() : null;
        }
          
        if (user.uid === ADMIN_UID) {
            await fetchContent(); 
        }

        renderApp(user, clientData);

    } catch (error) {
        console.error("Error checking client data:", error);
        showContainer('auth-card'); 
        hideContainer('app-content');
    } finally {
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

function attachGlobalFunctions() {
    // 1. Core Navigation
    window.setPage = setPage;
    window.setTab = setTab;

    // 2. Content Actions
    window.saveDesign = saveDesign;
    window.deleteDesign = deleteDesign;
    window.saveGalleryItem = saveGalleryItem;
    window.deleteGalleryItem = deleteGalleryItem;
    window.toggleActivePromo = toggleActivePromo;
    window.toggleFeaturedDesign = toggleFeaturedDesign;
    window.editDesign = editDesign;
    window.updateDesignInline = updateDesignInline; // The function for inline saving

    // 3. Other Core
    window.logoutUser = logoutUser;
}

window.checkAndSetRole = checkAndSetRole; 
attachGlobalFunctions();

export function startAuthFlow() {
    window.addEventListener('DOMContentLoaded', () => {
        // 1. CRITICAL: Start the loading spinner immediately
        renderLoading(); 

        // Only run the auth listener if we are NOT on the public home page
        const isHomePage = window.location.pathname.endsWith('/homepage.html');

        if (!isHomePage) {
            // This ensures checkAndSetRole runs only on index.html (login) or restricted pages.
            onAuthStateChanged(auth, checkAndSetRole); 
        }

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
        onAuthStateChanged(auth, (user) => {
                        const accountLink = document.getElementById('account-link');
                        const loginBtn = document.getElementById('google-login-btn');
            
                        if (accountLink && loginBtn) {
                            if (user) {
                                // User is logged in: Show "My Account" link, Hide "Sign In" button
                                accountLink.classList.remove('hidden');
                                loginBtn.classList.add('hidden');
                            } else {
                                // User is NOT logged in: Hide "My Account" link, Show "Sign In" button
                                accountLink.classList.add('hidden');
                                loginBtn.classList.remove('hidden');
                            }
                        }
        });

    });
}

onAuthStateChanged(auth, checkAndSetRole); 
