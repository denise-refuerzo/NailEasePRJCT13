

import { clientDashboardTemplate } from "./client_dashboard_template.js";

/**
 * Renders the full client dashboard into the main app container.
 * @param {HTMLElement} container - The #app-content container.
 * @param {object} user - The Firebase User object.
 * @param {object} clientData - The existing client data from Firestore.
 */
export function renderClientLayout(container, user, clientData) {
    // Determine dynamic values based on user and Firestore data
    const currentName = clientData.name || user.displayName || 'Client';
    const currentPhone = clientData.phone || '';
    const verificationStatusText = clientData.isVerified ? 'Verified' : 'Unverified';
    const verificationStatusClass = clientData.isVerified ? 'bg-green-500' : 'bg-red-500';
    const userInitial = currentName.charAt(0).toUpperCase();

    // Fill the template string with dynamic data
    let htmlContent = clientDashboardTemplate;
    htmlContent = htmlContent.replace(/\${userName}/g, currentName);
    htmlContent = htmlContent.replace(/\${userEmail}/g, user.email);
    htmlContent = htmlContent.replace(/\${userPhone}/g, currentPhone);
    htmlContent = htmlContent.replace(/\${userInitial}/g, userInitial);
    htmlContent = htmlContent.replace(/\${verificationStatusText}/g, verificationStatusText);
    htmlContent = htmlContent.replace(/\${verificationStatusClass}/g, verificationStatusClass);

    // Inject the final HTML into the DOM
    container.innerHTML = htmlContent;
}

/**
 * Attaches all event listeners for the dashboard layout (buttons, modal controls, OTP flow).
 * NOTE: This function MUST be called immediately after renderClientLayout.
 * @param {object} user - The Firebase User object.
 * @param {object} clientData - The existing client data from Firestore.
 * @param {function} logoutUser - Function to sign the user out.
 * @param {function} sendPhoneForVerification - Function to send OTP.
 * @param {function} verifyOTPAndSave - Function to verify OTP and save data.
 * @param {function} updateClientName - Function to update name only.
 */
export function attachClientDashboardListeners(user, clientData, logoutUser, sendPhoneForVerification, verifyOTPAndSave, updateClientName) {
    const originalPhone = clientData.phone || '';
    const originalName = clientData.name || user.displayName;
    
    // --- Modal Controls ---
    const editModal = document.getElementById('editModal');
    const editProfileBtn = document.getElementById('editProfileBtn');
    const closeModalBtn = document.getElementById('closeModal');
    const modalCancelBtn = document.getElementById('modalCancelBtn');

    // --- Form Elements ---
    const newNameInput = document.getElementById('newName');
    const newPhoneInput = document.getElementById('newPhone');
    const otpCodeInput = document.getElementById('otpCode');
    
    // --- Buttons ---
    const saveNameBtn = document.getElementById('saveNameBtn'); // New button
    if (saveNameBtn) {
        saveNameBtn.disabled = true; // Initially disable it when the listeners are attached
    }
    const sendOTPBtn = document.getElementById('sendOTP');
    const verifyOTPBtn = document.getElementById('verifyOTP');
    const logoutBtn = document.getElementById('logoutBtn');
    
    const otpSection = document.getElementById('otpSection');
    const profileMessage = document.getElementById('profileMessage');

    // Initialize inputs with current data
    if (newNameInput) newNameInput.value = originalName;
    if (newPhoneInput) newPhoneInput.value = originalPhone;


    // --- Helper for Button States ---
    const checkInputChanges = () => { // Renamed for clarity
        const currentName = newNameInput.value.trim();
        const currentPhone = newPhoneInput.value.trim();
        
        const isNameChanged = currentName !== originalName;
        const isPhoneChanged = currentPhone !== originalPhone;
        
        // 1. Logic for SAVE NAME button
        // It should be enabled ONLY if the name has changed AND the phone hasn't (or if phone is empty).
        if (saveNameBtn) {
            // Disable if name is the same OR if user is trying to change the phone too (which requires OTP)
            saveNameBtn.disabled = !isNameChanged || isPhoneChanged;
            
            // Also disable if the name is cleared completely
            if (currentName.length === 0 && originalName.length > 0) {
                 saveNameBtn.disabled = true;
            }
        }
        
        // 2. Logic for SEND OTP button
        // It should be enabled ONLY if the phone has changed AND is a valid length.
        if (sendOTPBtn) {
            sendOTPBtn.disabled = !isPhoneChanged || (currentPhone.length < 10);
        }
    };
    
    // --- Event Listeners ---
    
    // 1. Modal Display Controls
    if (editModal && editProfileBtn) {
        // Function to handle closing and resetting the modal state
        const closeHandler = () => {
            // Hides the modal visually and disables interaction
            editModal.classList.remove('opacity-100');
            editModal.classList.add('opacity-0', 'pointer-events-none'); 

            // Reset OTP section state on modal close
            document.getElementById('otpSection').classList.add('hidden');
            document.getElementById('sendOTP').disabled = false;
            
            // Clear any previous error messages
            profileMessage.classList.add('hidden');
        };

        // Open Modal Handler
        editProfileBtn.addEventListener('click', () => {
            // Shows the modal visually and enables interaction
            editModal.classList.remove('opacity-0', 'pointer-events-none');
            editModal.classList.add('opacity-100');
            
            // CRITICAL: Check and disable button immediately upon opening
            checkInputChanges(); 
        });
        
        // Attach close handlers
        closeModalBtn.addEventListener('click', closeHandler);
        modalCancelBtn.addEventListener('click', closeHandler);
        // Allow clicking on the backdrop to close the modal
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) closeHandler();
        });
    }

    // 2. Real-time Input Change Listener (For Save Name & Send OTP buttons)
    if (newNameInput) {
        newNameInput.addEventListener('input', checkInputChanges); // Call new function name
    }
    if (newPhoneInput) {
        newPhoneInput.addEventListener('input', () => {
            checkInputChanges(); // Call new function name
            // Hide OTP section if phone number is being changed again
            if (otpSection) {
                otpSection.classList.add('hidden');
            }
        });
    }

    // 3. Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutUser);
    }
    
    // 4. Save Name Only
    if (saveNameBtn) {
        saveNameBtn.addEventListener('click', async () => {
            const newName = newNameInput.value.trim();
            if (newName && newName !== originalName) {
                // Call the new function to update name in Firestore
                await updateClientName(user.uid, newName); 
                document.getElementById('editModal').classList.add('hidden'); // Close modal on success
            } else {
                profileMessage.textContent = 'Name must be changed to save.';
                profileMessage.classList.remove('hidden');
            }
        });
    }

    // 5. Send OTP
    if (sendOTPBtn) {
        sendOTPBtn.addEventListener('click', () => {
            const phone = newPhoneInput.value.trim();
            if (phone.length >= 10) {
                profileMessage.classList.add('hidden');
                sendPhoneForVerification(user.uid, phone); // Call logic in auth-logic.js
            } else {
                profileMessage.textContent = 'Please enter a valid phone number (min 10 digits).';
                profileMessage.classList.remove('hidden');
            }
        });
    }
    
    // 6. Verify OTP and Save
    if (verifyOTPBtn) {
        verifyOTPBtn.addEventListener('click', () => {
            const name = newNameInput.value.trim();
            const phone = newPhoneInput.value.trim();
            const code = otpCodeInput.value.trim();
            
            if (name && phone && code) {
                profileMessage.classList.add('hidden');
                verifyOTPAndSave(user.uid, name, phone, code); // Call logic in auth-logic.js
            } else {
                profileMessage.textContent = 'Name, Phone, and OTP are required.';
                profileMessage.classList.remove('hidden');
            }
        });
    }
}