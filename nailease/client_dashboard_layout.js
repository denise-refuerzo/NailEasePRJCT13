import { clientDashboardTemplate } from "./client_dashboard_template.js";
import { getClientAppointments, submitReview, getUserReviews } from './review-logic.js';

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
 * Load and display client appointments
 */
async function loadClientAppointments(userId) {
    try {
        const appointments = await getClientAppointments(userId);
        const appointmentsGrid = document.getElementById('appointmentsGrid');
        
        if (!appointmentsGrid) return;
        
        if (appointments.length === 0) {
            appointmentsGrid.innerHTML = `
                <div class="empty-state text-center p-8 text-gray-500">
                    <div class="empty-icon text-5xl mb-4 opacity-70">📅</div>
                    <h3 class="empty-title text-xl font-bold text-pink-700 mb-2">No Appointments Yet</h3>
                    <p class="empty-description mb-6 leading-relaxed">Your future and past appointments will appear here once booked.</p>
                    <a href="book.html" class="book-now-btn bg-gradient-to-r from-pink-500 to-red-400 text-white px-8 py-3 rounded-full font-bold inline-block transition transform hover:scale-105 shadow-xl shadow-pink-300/50">
                        Book Now
                    </a>
                </div>
            `;
            return;
        }
        
        const now = new Date();
        const appointmentsHtml = appointments.map(apt => {
            const aptDate = apt.appointmentDate || (apt.selectedDate ? new Date(`${apt.selectedDate}T00:00:00`) : null);
            const isCompleted = (apt.status || '').toLowerCase() === 'completed';
            const canReview = isCompleted; // show for completed only
            
            const statusBadge = {
                pending: 'bg-amber-100 text-amber-700',
                confirmed: 'bg-emerald-100 text-emerald-700',
                completed: 'bg-sky-100 text-sky-700',
                cancelled: 'bg-rose-100 text-rose-700'
            }[(apt.status || '').toLowerCase()] || 'bg-gray-100 text-gray-700';
            
            const formattedDate = aptDate ? aptDate.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' }) : (apt.selectedDate || 'N/A');
            
            return `
                <div class="appointment-card bg-white border border-gray-200 rounded-xl p-5 mb-4 shadow-sm hover:shadow-md transition">
                    <div class="flex justify-between items-start mb-3">
                        <div>
                            <h3 class="text-lg font-bold text-gray-800">${apt.designName || apt.design?.name || 'Nail Design'}</h3>
                            <p class="text-sm text-gray-500">Booking ID: ${apt.bookingId || apt.id}</p>
                        </div>
                        <span class="px-3 py-1 text-xs font-semibold rounded-full ${statusBadge} capitalize">${(apt.status || 'pending').toUpperCase()}</span>
                    </div>
                    <div class="grid grid-cols-2 gap-3 text-sm mb-3">
                        <div>
                            <span class="text-gray-500">Date:</span>
                            <span class="font-semibold ml-2">${formattedDate}</span>
                        </div>
                        <div>
                            <span class="text-gray-500">Time:</span>
                            <span class="font-semibold ml-2">${apt.selectedTime || 'N/A'}</span>
                        </div>
                        <div>
                            <span class="text-gray-500">Total Amount:</span>
                            <span class="font-semibold ml-2">₱${Number(apt.totalAmount || apt.design?.price || 0).toFixed(2)}</span>
                        </div>
                        <div>
                            <span class="text-gray-500">Amount Paid:</span>
                            <span class="font-semibold ml-2">₱${Number(apt.amountPaid || 0).toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="flex gap-2 mt-3">
                        <button class="view-details-btn flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold transition" data-appointment-id="${apt.id}">View Details</button>
                        ${canReview ? `<button class="leave-review-btn flex-1 bg-pink-500 hover:bg-pink-600 text-white py-2 rounded-lg font-semibold transition" data-appointment-id="${apt.id}">Leave Review</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        appointmentsGrid.innerHTML = appointmentsHtml;
        
        // Details + Review listeners
        document.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const appointmentId = e.currentTarget.dataset.appointmentId;
                const apt = appointments.find(x => x.id === appointmentId);
                if (apt) openAppointmentDetailsModal(apt);
            });
        });
        document.querySelectorAll('.leave-review-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const appointmentId = e.currentTarget.dataset.appointmentId;
                openReviewModal(appointmentId);
            });
        });
    } catch (error) {
        console.error('Error loading appointments:', error);
    }
}

/**
 * Load and display user reviews
 */
async function loadUserReviews(userId) {
    try {
        const reviews = await getUserReviews(userId);
        const reviewsGrid = document.getElementById('reviewsGrid');
        
        if (!reviewsGrid) return;
        
        if (reviews.length === 0) {
            reviewsGrid.innerHTML = `
                <div class="empty-state text-center p-8 text-gray-500">
                    <div class="empty-icon text-5xl mb-4 opacity-70">⭐</div>
                    <h3 class="empty-title text-xl font-bold text-pink-700 mb-2">No Reviews Yet</h3>
                    <p class="empty-description mb-6 leading-relaxed">Once you've had an appointment, you can leave a review.</p>
                </div>
            `;
            return;
        }
        
        const reviewsHtml = reviews.map(review => {
            const stars = '⭐'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
            return `
                <div class="review-card bg-white border border-gray-200 rounded-xl p-5 mb-4 shadow-sm">
                    <div class="flex items-center justify-between mb-2">
                        <div class="text-2xl">${stars}</div>
                        <span class="text-xs text-gray-500">${review.createdAt.toLocaleDateString()}</span>
                    </div>
                    <p class="text-gray-700 mb-3">${review.text}</p>
                    ${review.imageUrls && review.imageUrls.length > 0 ? `
                        <div class="grid grid-cols-2 gap-2">
                            ${review.imageUrls.map(url => `
                                <img src="${url}" alt="Review photo" class="w-full h-32 object-cover rounded-lg" />
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
        
        reviewsGrid.innerHTML = reviewsHtml;
    } catch (error) {
        console.error('Error loading reviews:', error);
    }
}

/**
 * Open review submission modal
 */
function openReviewModal(appointmentId) {
    const modal = document.getElementById('reviewModal');
    document.getElementById('reviewAppointmentId').value = appointmentId;
    document.getElementById('reviewRating').value = '';
    document.getElementById('reviewText').value = '';
    document.getElementById('reviewImage1').value = '';
    document.getElementById('reviewImage2').value = '';
    document.getElementById('previewImage1').classList.add('hidden');
    document.getElementById('previewImage2').classList.add('hidden');
    
    // Reset star rating
    document.querySelectorAll('.star-btn').forEach(btn => {
        btn.classList.remove('text-yellow-400');
        btn.classList.add('text-gray-300');
    });
    
    modal.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
    modal.classList.add('opacity-100');
}

/**
 * Close review modal
 */
function closeReviewModal() {
    const modal = document.getElementById('reviewModal');
    modal.classList.add('hidden', 'opacity-0', 'pointer-events-none');
    modal.classList.remove('opacity-100');
}

/**
 * Attach review modal listeners
 */
function attachReviewModalListeners(user, clientData) {
    // Star rating
    let selectedRating = 0;
    document.querySelectorAll('.star-btn').forEach((btn, index) => {
        btn.addEventListener('click', () => {
            selectedRating = index + 1;
            document.getElementById('reviewRating').value = selectedRating;
            document.querySelectorAll('.star-btn').forEach((b, i) => {
                if (i < selectedRating) {
                    b.classList.remove('text-gray-300');
                    b.classList.add('text-yellow-400');
                } else {
                    b.classList.remove('text-yellow-400');
                    b.classList.add('text-gray-300');
                }
            });
        });
    });
    
    // Image uploads
    ['1', '2'].forEach(num => {
        const uploadContainer = document.getElementById(`imageUpload${num}`);
        const fileInput = document.getElementById(`reviewImage${num}`);
        const preview = document.getElementById(`previewImage${num}`);
        
        uploadContainer.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    preview.src = event.target.result;
                    preview.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            }
        });
    });
    
    // Form submission
    document.getElementById('reviewForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submitReviewBtn');
        const messageDiv = document.getElementById('reviewMessage');
        
        const appointmentId = document.getElementById('reviewAppointmentId').value;
        const rating = document.getElementById('reviewRating').value;
        const text = document.getElementById('reviewText').value;
        const image1 = document.getElementById('reviewImage1').files[0];
        const image2 = document.getElementById('reviewImage2').files[0];
        
        if (!rating) {
            messageDiv.textContent = 'Please select a rating';
            messageDiv.classList.remove('hidden');
            messageDiv.classList.add('text-red-500');
            return;
        }
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        
        try {
            const images = [image1, image2].filter(img => img);
            await submitReview({
                userId: user.uid,
                appointmentId,
                rating,
                text,
                images,
                userName: clientData?.name || user.displayName,
                userEmail: user.email
            });
            
            messageDiv.textContent = 'Review submitted successfully!';
            messageDiv.classList.remove('hidden', 'text-red-500');
            messageDiv.classList.add('text-green-500');
            
            // Reload reviews and appointments
            await loadUserReviews(user.uid);
            await loadClientAppointments(user.uid);
            
            setTimeout(() => {
                closeReviewModal();
            }, 1500);
        } catch (error) {
            messageDiv.textContent = 'Error submitting review. Please try again.';
            messageDiv.classList.remove('hidden');
            messageDiv.classList.add('text-red-500');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Review';
        }
    });
    
    // Close buttons
    document.getElementById('closeReviewModal').addEventListener('click', closeReviewModal);
    document.getElementById('cancelReviewBtn').addEventListener('click', closeReviewModal);
}

// Minimal details modal (if not present)
function openAppointmentDetailsModal(appointment) {
    let modal = document.getElementById('appointmentDetailsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'appointmentDetailsModal';
        modal.className = 'fixed inset-0 bg-black/70 z-50 hidden items-center justify-center p-4';
        modal.innerHTML = `<div class="bg-white rounded-2xl p-6 max-w-xl w-full relative"><button id="closeAppointmentDetails" class="absolute top-3 right-4 text-2xl">×</button><div id="appointmentDetailsContent"></div></div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e)=>{ if (e.target === modal) { modal.classList.add('hidden'); document.body.style.overflow=''; }});
        document.getElementById('closeAppointmentDetails').addEventListener('click', ()=>{ modal.classList.add('hidden'); document.body.style.overflow=''; });
    }
    const total = Number(appointment.totalAmount || appointment.design?.price || 0);
    const paid = Number(appointment.amountPaid || 0);
    const remaining = total - paid;
    const dateStr = appointment.appointmentDate ? appointment.appointmentDate.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' }) : (appointment.selectedDate || 'N/A');
    const html = `
        <h3 class="text-xl font-bold mb-2">${appointment.designName || appointment.design?.name || 'Nail Design'}</h3>
        <p class="text-sm text-gray-600 mb-4">Booking ID: ${appointment.bookingId || appointment.id}</p>
        <div class="grid grid-cols-2 gap-3 text-sm mb-3">
            <div><span class="text-gray-500">Date:</span> <span class="font-semibold ml-1">${dateStr}</span></div>
            <div><span class="text-gray-500">Time:</span> <span class="font-semibold ml-1">${appointment.selectedTime || 'N/A'}</span></div>
            <div><span class="text-gray-500">Total:</span> <span class="font-semibold ml-1">₱${total.toFixed(2)}</span></div>
            <div><span class="text-gray-500">Paid:</span> <span class="font-semibold ml-1">₱${paid.toFixed(2)}</span></div>
        </div>
        <div class="text-sm"><span class="text-gray-500">Remaining:</span> <span class="font-semibold ml-1 ${remaining>0?'text-orange-600':'text-green-600'}">₱${remaining.toFixed(2)}</span></div>
    `;
    document.getElementById('appointmentDetailsContent').innerHTML = html;
    modal.classList.remove('hidden');
    document.body.style.overflow='hidden';
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

    // Load appointments and reviews after DOM is ready
    setTimeout(async () => {
        await loadClientAppointments(user.uid);
        await loadUserReviews(user.uid);
        attachReviewModalListeners(user, clientData);
    }, 100);
}