

export const clientDashboardTemplate = `
    <div class="account-container max-w-7xl mx-auto p-4 md:p-8">
        <!-- Header -->
        <header class="bg-white/95 backdrop-blur-sm p-4 md:p-8 rounded-xl border-b-4 border-pink-700 shadow-xl mb-8">
            <div class="logo font-['Playfair_Display'] text-4xl font-bold text-pink-900 text-center uppercase tracking-widest leading-none" style="text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);">
                NailEase
            </div>
        </header>

        <h1 class="font-['Playfair_Display'] text-4xl font-extrabold text-pink-600 text-center mb-10" style="text-shadow: 2px 2px 4px rgba(255, 255, 255, 0.8);">
        Your Client Hub
    </h1>

    <!-- Profile Section -->
    <section class="profile-section bg-white/95 rounded-2xl p-6 md:p-8 mb-8 shadow-2xl">
        <div class="profile-header flex flex-col md:flex-row items-center justify-between pb-6 border-b border-gray-100 mb-6">
            <div class="profile-info flex items-center mb-4 md:mb-0">
                <div class="profile-avatar w-20 h-20 rounded-full bg-gradient-to-br from-pink-600 to-pink-400 flex items-center justify-center text-white text-3xl font-bold mr-5 shadow-lg shadow-pink-300/50">
                    \${userInitial}
                </div>
                <div class="profile-details text-left">
                    <h2 id="userName" class="text-2xl font-bold text-gray-800 mb-1">\${userName}</h2>
                    <p class="profile-email text-gray-500 text-lg mb-2" id="userEmail">\${userEmail}</p>
                    <div class="profile-status flex items-center">
                        <span id="verificationStatus" class="status-badge \${verificationStatusClass} text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1 shadow-md">
                            \${verificationStatusText}
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="flex flex-col md:flex-row gap-4 w-full md:w-auto mt-4 md:mt-0">
                <button class="edit-profile-btn bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-none px-6 py-3 rounded-full font-bold cursor-pointer transition transform hover:scale-105 shadow-lg shadow-purple-300/50" id="editProfileBtn">
                    Edit Profile
                </button>
                <button class="cancel-btn bg-gray-300 text-gray-700 border-none px-6 py-3 rounded-full font-bold cursor-pointer transition hover:bg-gray-400" id="logoutBtn">
                    Logout
                </button>
            </div>
        </div>
    </section>

    <!-- History and Reviews Container -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Appointment History Section -->
        <section class="history-section bg-white/95 rounded-2xl p-6 md:p-8 shadow-2xl">
            <div class="history-header mb-6 border-b pb-4 border-gray-100">
                <h2 class="history-title font-['Playfair_Display'] text-3xl font-bold text-pink-600">Appointment History</h2>
            </div>
            <div class="appointments-grid">
                <div class="empty-state text-center p-8 text-gray-500">
                    <div class="empty-icon text-5xl mb-4 opacity-70">📅</div>
                    <h3 class="empty-title text-xl font-bold text-pink-700 mb-2">No Appointments Yet</h3>
                    <p class="empty-description mb-6 leading-relaxed">Your future and past appointments will appear here once booked.</p>
                    <a href="#" class="book-now-btn bg-gradient-to-r from-pink-500 to-red-400 text-white px-8 py-3 rounded-full font-bold inline-block transition transform hover:scale-105 shadow-xl shadow-pink-300/50" id="bookNowBtn">
                        Book Now
                    </a>
                </div>
            </div>
        </section>

        <!-- Reviews Section -->
        <section class="reviews-section bg-white/95 rounded-2xl p-6 md:p-8 shadow-2xl">
            <div class="history-header mb-6 border-b pb-4 border-gray-100">
                <h2 class="history-title font-['Playfair_Display'] text-3xl font-bold text-pink-600">Your Reviews</h2>
            </div>
            <div class="reviews-grid">
                <div class="empty-state text-center p-8 text-gray-500">
                    <div class="empty-icon text-5xl mb-4 opacity-70">⭐</div>
                    <h3 class="empty-title text-xl font-bold text-pink-700 mb-2">No Reviews Yet</h3>
                    <p class="empty-description mb-6 leading-relaxed">Once you’ve had an appointment, you can leave a review.</p>
                    <a href="#" class="submit-review-btn bg-gradient-to-r from-pink-500 to-red-400 text-white px-8 py-3 rounded-full font-bold inline-block transition transform hover:scale-105 shadow-xl shadow-pink-300/50">
                        View Bookings
                    </a>
                </div>
            </div>
        </section>
    </div>
</div>

<!-- 🔹 Edit Profile/Verification Modal -->
<div class="modal-overlay fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300 opacity-0 pointer-events-none" id="editModal">    <div class="modal-card bg-white rounded-2xl p-8 max-w-lg w-full relative transform scale-95 transition-transform duration-300 shadow-3xl" id="modalCard">
        <button class="modal-close absolute top-4 right-5 text-gray-600 text-3xl hover:text-pink-600 transition" id="closeModal">&times;</button>
        <h2 class="modal-title text-2xl font-bold text-gray-700 mb-6 text-center">Update Profile & Verify Phone</h2>

        <!-- Name Input -->
        <div class="form-group mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2" for="newName">Name:</label>
            <input type="text" class="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-pink-500 transition" id="newName" placeholder="Enter new name" value="\${userName}">
        </div>

        <!-- Phone Input -->
        <div class="form-group mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2" for="newPhone">Phone Number (OTP Required):</label>
            <div class="flex gap-2">
                <input type="text" class="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-pink-500 transition" id="newPhone" placeholder="+63xxxxxxxxxx" value="\${userPhone}">
                <button class="save-btn bg-pink-500 text-white px-4 py-2 rounded-xl font-bold transition hover:bg-pink-600 disabled:opacity-50" id="sendOTP" disabled>Send OTP</button>
            </div>
        </div>

        <!-- Profile Message (Error/Success) -->
        <p id="profileMessage" class="mt-2 text-center text-sm text-red-500 hidden"></p>

        <!-- OTP Verification Section -->
        <div id="otpSection" class="otp-container bg-pink-50 p-4 rounded-xl text-center hidden">
            <p class="text-sm text-gray-600 mb-4">Enter the 6-digit verification code sent to the number above:</p>
            <div class="otp-inputs flex justify-center gap-3 mb-4">
                <input type="text" id="otpCode" maxlength="6" class="otp-input w-24 p-3 text-center text-xl font-mono font-bold border-2 border-pink-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-200" placeholder="000000">
            </div>
            <button class="save-btn w-full bg-green-600 text-white py-3 rounded-full font-bold transition hover:bg-green-700 disabled:opacity-50" id="verifyOTP">
                Verify & Save
            </button>
        </div>
        
        <!-- Form Actions -->
        <div class="form-actions flex justify-end gap-3 mt-6">
            <!-- NEW BUTTON: Save Name Only -->
            <button class="save-btn bg-indigo-500 text-white px-6 py-3 rounded-full font-bold transition hover:bg-indigo-600 disabled:opacity-50" id="saveNameBtn">
                Save Name
            </button>
            <button class="cancel-btn bg-gray-300 text-gray-700 px-6 py-3 rounded-full font-bold transition hover:bg-gray-400" id="modalCancelBtn">
                Close
            </button>
        </div>
    </div>
</div>
`;
