// client_dashboard_template.js

export const clientDashboardTemplate = `
            <style>
            /* Custom scrollbar styling for appointment and review sections */
            .custom-scrollbar::-webkit-scrollbar {
                width: 8px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 10px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
                background: #ec4899;
                border-radius: 10px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #db2777;
            }
            /* Firefox */
            .custom-scrollbar {
                scrollbar-width: thin;
                scrollbar-color: #ec4899 #f1f1f1;
            }
        </style>
        <header class="sticky top-0 bg-white shadow-lg z-50">
            <div class="w-full px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center max-w-7xl mx-auto">
                <a href="homepage.html" class="text-xl font-bold text-pink-600 tracking-wider cursor-pointer">DCAC</a>
                    <nav class="flex space-x-4 items-center">
                        <a href="homepage.html" class="text-gray-600 hover:text-pink-600 transition duration-150 font-medium">Home</a>
                        <a href="design_portfolio.html" class="text-gray-600 hover:text-pink-600 transition duration-150 font-medium">Design Portfolio</a>
                        <a href="book.html" class="text-gray-600 hover:text-pink-600 transition duration-150 font-medium">Book</a>
                        <a href="feedback.html" class="text-gray-600 hover:text-pink-600 transition duration-150 font-medium">Feedback</a>
                        <a href="about.html" class="text-gray-600 hover:text-pink-600 transition duration-150 font-medium">About us</a>
                        <button id="logoutBtn" class="text-gray-600 hover:text-pink-600 transition duration-150 font-medium">Log Out</button>
                    </nav>
            </div>
        </header>
    
    <div class="account-container max-w-7xl mx-auto p-4 md:p-8">
        
        <h1 class="font-['Playfair_Display'] text-4xl font-extrabold text-pink-600 text-center mb-10" style="text-shadow: 2px 2px 4px rgba(255, 255, 255, 0.8);">
            Your Client Hub
        </h1>

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
                    </div>
            </div>
        </section>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <section class="history-section bg-white/95 rounded-2xl p-6 md:p-8 shadow-2xl flex flex-col">
                <div class="history-header mb-6 border-b pb-4 border-gray-100 flex-shrink-0">
                    <h2 class="history-title font-['Playfair_Display'] text-3xl font-bold text-pink-600">Appointment History</h2>
                </div>
                    <div class="appointments-grid flex-1 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar" id="appointmentsGrid" style="min-height: 200px;">
                    <div class="empty-state text-center p-8 text-gray-500">
                        <div class="empty-icon text-5xl mb-4 opacity-70">📅</div>
                        <h3 class="empty-title text-xl font-bold text-pink-700 mb-2">No Appointments Yet</h3>
                        <p class="empty-description mb-6 leading-relaxed">Your future and past appointments will appear here once booked.</p>
                        <a href="book.html" class="book-now-btn bg-gradient-to-r from-pink-500 to-red-400 text-white px-8 py-3 rounded-full font-bold inline-block transition transform hover:scale-105 shadow-xl shadow-pink-300/50" id="bookNowBtn">
                            Book Now
                        </a>
                    </div>
                </div>
            </section>

            <section class="reviews-section bg-white/95 rounded-2xl p-6 md:p-8 shadow-2xl flex flex-col">
                <div class="history-header mb-6 border-b pb-4 border-gray-100 flex-shrink-0">
                    <h2 class="history-title font-['Playfair_Display'] text-3xl font-bold text-pink-600">Your Reviews</h2>
                </div>
                <div class="reviews-grid flex-1 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar" id="reviewsGrid" style="min-height: 200px;">
                    <div class="empty-state text-center p-8 text-gray-500">
                        <div class="empty-icon text-5xl mb-4 opacity-70">⭐</div>
                        <h3 class="empty-title text-xl font-bold text-pink-700 mb-2">No Reviews Yet</h3>
                        <p class="empty-description mb-6 leading-relaxed">Once you've had an appointment, you can leave a review.</p>
                    </div>
                </div>
            </section>
        </div>
    </div>

    <!-- Review Submission Modal -->
    <div class="modal-overlay fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300 opacity-0 pointer-events-none hidden" id="reviewModal">
        <div class="modal-card bg-white rounded-2xl p-8 max-w-2xl w-full relative transform scale-95 transition-transform duration-300 shadow-3xl max-h-[90vh] overflow-y-auto">
            <button class="modal-close absolute top-4 right-5 text-gray-600 text-3xl hover:text-pink-600 transition" id="closeReviewModal">&times;</button>
            <h2 class="modal-title text-2xl font-bold text-gray-700 mb-6 text-center">Leave a Review</h2>
            
            <form id="reviewForm">
                <input type="hidden" id="reviewAppointmentId" />
                
                <!-- Star Rating -->
                <div class="mb-6">
                    <label class="block text-sm font-medium text-gray-700 mb-3">Rating</label>
                    <div class="flex gap-2" id="starRating">
                        <button type="button" class="star-btn text-4xl text-gray-300 hover:text-yellow-400 transition" data-rating="1">★</button>
                        <button type="button" class="star-btn text-4xl text-gray-300 hover:text-yellow-400 transition" data-rating="2">★</button>
                        <button type="button" class="star-btn text-4xl text-gray-300 hover:text-yellow-400 transition" data-rating="3">★</button>
                        <button type="button" class="star-btn text-4xl text-gray-300 hover:text-yellow-400 transition" data-rating="4">★</button>
                        <button type="button" class="star-btn text-4xl text-gray-300 hover:text-yellow-400 transition" data-rating="5">★</button>
                    </div>
                    <input type="hidden" id="reviewRating" required />
                </div>
                
                <!-- Review Text -->
                <div class="mb-6">
                    <label for="reviewText" class="block text-sm font-medium text-gray-700 mb-2">Your Review</label>
                    <textarea id="reviewText" rows="5" class="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-pink-500 transition" placeholder="Share your experience..." required></textarea>
                </div>
                
                <!-- Image Upload (Max 2) -->
                <div class="mb-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Photos (Optional, Max 2)</label>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="image-upload-container border-2 border-dashed border-pink-300 rounded-xl p-4 text-center cursor-pointer hover:bg-pink-50 transition" id="imageUpload1">
                            <input type="file" accept="image/*" class="hidden" id="reviewImage1" />
                            <div class="text-3xl mb-2">📷</div>
                            <div class="text-sm text-gray-600">Click to upload</div>
                            <img id="previewImage1" class="hidden mt-2 max-h-32 w-full object-cover rounded" />
                        </div>
                        <div class="image-upload-container border-2 border-dashed border-pink-300 rounded-xl p-4 text-center cursor-pointer hover:bg-pink-50 transition" id="imageUpload2">
                            <input type="file" accept="image/*" class="hidden" id="reviewImage2" />
                            <div class="text-3xl mb-2">📷</div>
                            <div class="text-sm text-gray-600">Click to upload</div>
                            <img id="previewImage2" class="hidden mt-2 max-h-32 w-full object-cover rounded" />
                        </div>
                    </div>
                </div>
                
                <div id="reviewMessage" class="hidden mb-4 text-center text-sm"></div>
                
                <div class="flex justify-end gap-3">
                    <button type="button" class="cancel-btn bg-gray-300 text-gray-700 px-6 py-3 rounded-full font-bold transition hover:bg-gray-400" id="cancelReviewBtn">
                        Cancel
                    </button>
                    <button type="submit" class="save-btn bg-pink-500 text-white px-6 py-3 rounded-full font-bold transition hover:bg-pink-600 disabled:opacity-50" id="submitReviewBtn">
                        Submit Review
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Existing Edit Profile Modal -->
    <div class="modal-overlay fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300 opacity-0 pointer-events-none" id="editModal">
        <div class="modal-card bg-white rounded-2xl p-8 max-w-lg w-full relative transform scale-95 transition-transform duration-300 shadow-3xl" id="modalCard">
        <button class="modal-close absolute top-4 right-5 text-gray-600 text-3xl hover:text-pink-600 transition" id="closeModal">&times;</button>
        <h2 class="modal-title text-2xl font-bold text-gray-700 mb-6 text-center">Update Profile & Verify Phone</h2>

        <div class="form-group mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2" for="newName">Name:</label>
            <input type="text" class="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-pink-500 transition" id="newName" placeholder="Enter new name" value="\${userName}">
        </div>

        <div class="form-group mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2" for="newPhone">Phone Number (OTP Required):</label>
            <div class="flex gap-2">
                <input type="text" class="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-pink-500 transition" id="newPhone" placeholder="+63xxxxxxxxxx" value="\${userPhone}">
                <button class="save-btn bg-pink-500 text-white px-4 py-2 rounded-xl font-bold transition hover:bg-pink-600 disabled:opacity-50" id="sendOTP" disabled>Send OTP</button>
            </div>
        </div>

        <p id="profileMessage" class="mt-2 text-center text-sm text-red-500 hidden"></p>

        <div id="otpSection" class="otp-container bg-pink-50 p-4 rounded-xl text-center hidden">
            <p class="text-sm text-gray-600 mb-4">Enter the 6-digit verification code sent to the number above:</p>
            <div class="otp-inputs flex justify-center gap-3 mb-4">
                <input type="text" id="otpCode" maxlength="6" class="otp-input w-24 p-3 text-center text-xl font-mono font-bold border-2 border-pink-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-200" placeholder="000000">
            </div>
            <button class="save-btn w-full bg-green-600 text-white py-3 rounded-full font-bold transition hover:bg-green-700 disabled:opacity-50" id="verifyOTP">
                Verify & Save
            </button>
        </div>
        
        <div class="form-actions flex justify-end gap-3 mt-6">
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