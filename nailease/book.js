// book.js - FULL CORRECTED VERSION

// CRITICAL: Use global auth object from HTML instead of imports
// The HTML sets window.auth, window.db, etc. from auth-logic.js
// We'll access them after they're available

// Booking state management
let currentStep = 1;
let bookingData = {
    design: {
        id: null,
        name: 'Clean & Modern',
        price: 299,
        image: 'Clean & Modern',
        description: 'Minimalist logo design with modern aesthetics'
    },
    selectedDate: null,
    selectedTime: null,
    personalInfo: {},
    paymentMethod: 'gcash',
    receiptUploaded: false,
    otpVerified: false
};

// Initialize booking data from URL parameters
function initializeFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const designName = urlParams.get('design');
    const designPrice = urlParams.get('price');
    const designImage = urlParams.get('image');
    const designDescription = urlParams.get('description');

    if (designName) {
        bookingData.design.name = decodeURIComponent(designName);
        bookingData.design.price = parseFloat(designPrice) || 299;
        bookingData.design.image = decodeURIComponent(designImage) || 'Design';
        bookingData.design.description = decodeURIComponent(designDescription) || 'Professional design service';
        
        updateSelectedDesign();
    }
}

// Update selected design display
function updateSelectedDesign() {
    document.getElementById('selectedDesignName').textContent = bookingData.design.name;
    document.getElementById('selectedDesignPrice').textContent = `₱${bookingData.design.price.toFixed(2)}`;
    document.getElementById('selectedDesignImage').textContent = bookingData.design.image;
    document.getElementById('selectedDesignDescription').textContent = bookingData.design.description;
}

// Change design - redirect to collection page
function changeDesign() {
    window.location.href = 'collection page.html';
}

// Calendar functionality
let currentDate = new Date();
let selectedDate = null;

// Helper function to format date string (YYYY-MM-DD) to readable format without timezone issues
function formatDateString(dateString) {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-').map(Number);
    // Create date at noon to avoid timezone edge cases, then use it only for day of week
    const date = new Date(year, month - 1, day, 12, 0, 0);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const dayName = dayNames[date.getDay()];
    const monthName = monthNames[month - 1]; // Use month from dateString directly (1-indexed)
    // Use day from dateString directly, not from Date object
    return `${dayName}, ${monthName} ${day}, ${year}`;
}

// Unavailable dates (example data - in production, fetch from backend)
const unavailableDates = [
    '2024-12-25', '2024-12-31', '2025-01-01', '2024-12-22', '2024-12-29'
];

function generateCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    document.getElementById('monthYear').textContent = 
        new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const firstDayWeekday = firstDayOfMonth.getDay(); 
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let html = '';
    
    const dayHeaders = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    dayHeaders.forEach((day, index) => {
        html += `<div class="calendar-day header bg-gradient-to-r from-pink-500 to-pink-400 text-white font-bold text-sm flex items-center justify-center" style="grid-column: ${index + 1};">${day}</div>`;
    });
    
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - firstDayWeekday);
    
    let dayCount = 0;
    for (let week = 0; week < 6; week++) {
        for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
            const currentDateObj = new Date(startDate);
            currentDateObj.setDate(startDate.getDate() + dayCount);
            
            const day = currentDateObj.getDate();
            const currentMonth = currentDateObj.getMonth();
            const currentYear = currentDateObj.getFullYear();
            // Format date as YYYY-MM-DD without timezone conversion to avoid date offset issues
            const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            const isCurrentMonth = currentMonth === month && currentYear === year;
            const isPast = currentDateObj < today;
            const isToday = currentDateObj.getTime() === today.getTime();
            const isUnavailable = unavailableDates.includes(dateString);
            const isSelected = selectedDate === dateString;
            
            let classes = 'calendar-day bg-white text-gray-800 font-bold flex items-center justify-center cursor-pointer hover:bg-pink-100 transition-all';
            let clickHandler = '';
            
            if (!isCurrentMonth || isPast) {
                classes = 'calendar-day bg-gray-50 text-gray-400 cursor-not-allowed flex items-center justify-center';
            } else if (isUnavailable) {
                classes = 'calendar-day unavailable flex items-center justify-center';
            } else {
                clickHandler = `onclick="selectDate('${dateString}')"`;
            }
            
            if (isToday) classes += ' today border-2 border-orange-500';
            if (isSelected) classes = 'calendar-day selected bg-gradient-to-r from-pink-500 to-pink-400 text-white font-bold flex items-center justify-center relative';
            
            const gridRow = week + 2; 
            const gridCol = dayOfWeek + 1;
            
            html += `<div class="${classes}" data-date="${dateString}" ${clickHandler} style="grid-row: ${gridRow}; grid-column: ${gridCol};">${day}</div>`;
            
            dayCount++;
        }
    }
    document.getElementById('calendarGrid').innerHTML = html;
}

function selectDate(dateString) {
    const dateElement = document.querySelector(`[data-date="${dateString}"]`);
    if (!dateElement || dateElement.classList.contains('disabled') || 
        dateElement.classList.contains('unavailable') || 
        dateElement.classList.contains('other-month')) {
        return;
    }
    
    if (currentStep !== 2) {
        showStep(2);
    }
    
    document.querySelectorAll('.calendar-day.selected').forEach(el => {
        el.classList.remove('selected');
    });
    
    dateElement.classList.add('selected');
    selectedDate = dateString;
    bookingData.selectedDate = dateString;
    
    // Format date string without timezone conversion to avoid date offset
    const formattedDate = formatDateString(dateString);
    document.getElementById('selectedDateDisplay').textContent = formattedDate;
    
    generateTimeSlots(dateString);
    
    showStep(2);
}

document.getElementById('prevMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    generateCalendar();
    if (currentStep === 2) {
        showStep(2);
    }
});

document.getElementById('nextMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    generateCalendar();
    if (currentStep === 2) {
        showStep(2);
    }
});

// Time slot functionality
// Get time slots based on day of week
function getTimeSlotsForDate(dateString) {
    if (!dateString) {
        console.error('getTimeSlotsForDate: No date string provided');
        return ['8:00 AM', '12:00 PM', '4:00 PM', '6:00 PM', '8:00 PM']; // Default to weekday
    }
    
    // Parse date string (format: YYYY-MM-DD) to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    console.log(`Date: ${dateString}, Day of Week: ${dayOfWeek} (${date.toLocaleDateString('en-US', { weekday: 'long' })})`);
    
    // Monday-Friday (1-5): 8am, 12pm, 4pm, 6pm, 8pm
    // Saturday-Sunday (0, 6): 8am, 10am, 1pm, 3pm, 5pm, 7pm
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // Weekdays (Mon-Fri)
        console.log('Returning weekday time slots');
        return ['8:00 AM', '12:00 PM', '4:00 PM', '6:00 PM', '8:00 PM'];
    } else {
        // Weekends (Sat-Sun)
        console.log('Returning weekend time slots');
        return ['8:00 AM', '10:00 AM', '1:00 PM', '3:00 PM', '5:00 PM', '7:00 PM'];
    }
}

const unavailableTimeSlots = {
    '2024-12-20': ['10:00 AM', '2:00 PM'],
    '2024-12-21': ['9:00 AM', '1:00 PM', '3:00 PM']
};

function generateTimeSlots(date) {
    if (!date) {
        console.error('generateTimeSlots: No date provided');
        return;
    }
    
    console.log('generateTimeSlots called with date:', date);
    
    const unavailableForDate = unavailableTimeSlots[date] || [];
    const timeSlots = getTimeSlotsForDate(date);
    
    console.log('Generated time slots:', timeSlots);
    
    let html = '';
    
    // Update time slot info display - parse date properly to avoid timezone issues
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day); // month is 0-indexed
    const dayOfWeek = dateObj.getDay();
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const timeSlotInfoEl = document.getElementById('timeSlotInfo');
    
    if (timeSlotInfoEl) {
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            // Weekdays (Mon-Fri)
            timeSlotInfoEl.innerHTML = `<strong>${dayName} (Weekday):</strong> 8:00 AM, 12:00 PM, 4:00 PM, 6:00 PM, 8:00 PM`;
        } else {
            // Weekends (Sat-Sun)
            timeSlotInfoEl.innerHTML = `<strong>${dayName} (Weekend):</strong> 8:00 AM, 10:00 AM, 1:00 PM, 3:00 PM, 5:00 PM, 7:00 PM`;
        }
    }
    
    timeSlots.forEach(time => {
        const isUnavailable = unavailableForDate.includes(time);
        const baseClasses = 'px-4 py-3 border-2 rounded-xl text-center font-bold transition-all';
        const classes = isUnavailable 
            ? `${baseClasses} bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed`
            : `${baseClasses} bg-white text-gray-700 border-gray-300 hover:border-pink-500 hover:bg-pink-50 cursor-pointer`;
        html += `<div class="${classes}" data-time="${time}" onclick="selectTime('${time}')">${time}</div>`;
    });
    
    const timeGridEl = document.getElementById('timeGrid');
    if (timeGridEl) {
        timeGridEl.innerHTML = html;
        console.log('Time grid updated with', timeSlots.length, 'time slots');
    } else {
        console.error('Time grid element not found!');
    }
}

function selectTime(time) {
    const timeElement = document.querySelector(`[data-time="${time}"]`);
    if (timeElement.classList.contains('unavailable') || timeElement.classList.contains('cursor-not-allowed')) {
        return;
    }
    
    document.querySelectorAll('[data-time]').forEach(el => {
        el.classList.remove('selected', 'bg-pink-500', 'text-white', 'border-pink-500');
        if (!el.classList.contains('unavailable') && !el.classList.contains('cursor-not-allowed')) {
            el.classList.add('bg-white', 'text-gray-700', 'border-gray-300');
        }
    });
    
    timeElement.classList.add('selected', 'bg-pink-500', 'text-white', 'border-pink-500');
    timeElement.classList.remove('bg-white', 'text-gray-700', 'border-gray-300');
    bookingData.selectedTime = time;
}

// Step navigation
function updateProgressBar() {
    for (let i = 1; i <= 5; i++) {
        const nail = document.getElementById(`step${i}Box`);
        const stepNumber = nail.querySelector('.step-number');
        const stepCheck = nail.querySelector('.step-check');
        
        nail.classList.remove('nail-active', 'nail-inactive', 'nail-completed');
        
        if (i < currentStep) {
            nail.classList.add('nail-completed');
            stepNumber.classList.add('hidden');
            stepCheck.classList.remove('hidden');
        } else if (i === currentStep) {
            nail.classList.add('nail-active');
            stepNumber.classList.remove('hidden');
            stepCheck.classList.add('hidden');
        } else {
            nail.classList.add('nail-inactive');
            stepNumber.classList.remove('hidden');
            stepCheck.classList.add('hidden');
        }
        
        if (i < 5) {
            const progressFill = document.getElementById(`progressFill${i}`);
            if (progressFill) {
                if (i < currentStep) {
                    progressFill.style.width = '100%';
                } else if (i === currentStep - 1) {
                    progressFill.style.width = '50%';
                } else {
                    progressFill.style.width = '0%';
                }
            }
        }
    }
}

function showStep(stepNumber) {
    document.querySelectorAll('.step-content').forEach(step => {
        step.classList.remove('active');
    });
    
    document.getElementById(`step${stepNumber}`).classList.add('active');
    
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    prevBtn.disabled = stepNumber === 1;
    
    if (stepNumber === 5) {
        nextBtn.textContent = 'Complete Booking';
        nextBtn.classList.add('complete-btn');
    } else {
        nextBtn.textContent = 'Next';
        nextBtn.classList.remove('complete-btn');
    }
    
    updateProgressBar();
    
    // Regenerate time slots when step 3 is shown (if date is already selected)
    if (stepNumber === 3 && bookingData.selectedDate) {
        generateTimeSlots(bookingData.selectedDate);
    }
    
    // Auto-fill user info when step 4 is shown
    if (stepNumber === 4) {
        autoFillUserInfo();
    }
    
    if (stepNumber === 5) {
        updatePaymentSummary();
    }
}

// --- ACCESS RESTRICTION & AUTO-FILL ---
function restrictAccess(user) {
    // If no user is logged in, redirect to the login page (index.html)
    // But only redirect after a small delay to ensure DOM is ready
    if (!user) {
        setTimeout(() => {
            alert('You must be logged in to access the booking page.');
            window.location.href = 'index.html';
        }, 100);
        return false;
    }
    return true;
}

async function autoFillUserInfo() {
    // Access auth from global window object (set in HTML)
    const auth = window.auth;
    if (!auth) {
        console.warn('Auth not available yet');
        return;
    }
    
    const user = auth.currentUser;
    if (!user) return; 
    let clientData = null;
    try {
        // Fetch user data from the 'clients' subcollection in Firestore
        // Use getClientDocRef from global scope if available, or construct manually
        if (typeof getClientDocRef === 'function') {
            const clientDoc = await getClientDocRef(user.uid).get();
            clientData = clientDoc.exists() ? clientDoc.data() : null;
        } else {
            // Fallback: try to access Firestore directly
            const { getFirestore, doc, getDoc } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");
            const db = getFirestore();
            const clientDocRef = doc(db, `artifacts/nailease25-iapt/users/${user.uid}/clients/${user.uid}`);
            const clientDoc = await getDoc(clientDocRef);
            clientData = clientDoc.exists() ? clientDoc.data() : null;
        }
    } catch (error) {
        console.error("Error fetching client data:", error);
    }
    
    // Element selectors
    const displayFullName = document.getElementById('displayFullName');
    const displayPhoneNumber = document.getElementById('displayPhoneNumber');
    const displayEmail = document.getElementById('displayEmail');
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const phoneNumberInput = document.getElementById('phoneNumber');
    const countryCodeSelect = document.getElementById('countryCode');
    
    // --- Data Sources ---
    const fullName = clientData?.name || user.displayName || 'Not provided';
    const email = user.email || 'Not provided';
    // Prioritize phone from Firestore client data (where verification status is stored)
    const phone = clientData?.phone || 'Not provided'; 
    
    // 1. Set Display View
    if (displayFullName) displayFullName.textContent = fullName;
    if (displayEmail) displayEmail.textContent = email;
    if (displayPhoneNumber) displayPhoneNumber.textContent = phone;
    
    // 2. Set Edit Form Fields
    if (fullNameInput && !fullNameInput.value.trim()) {
        fullNameInput.value = user.displayName || clientData?.name || '';
    }
    if (emailInput && !emailInput.value.trim()) {
        emailInput.value = user.email || '';
    }
    
    if (phone !== 'Not provided') {
        let numberPart = phone;
        let codePart = '+63'; 
        
        // Split the phone number into code and number parts
        if (phone.startsWith('+')) {
            const match = phone.match(/^(\+\d+)(.+)$/); 
            if (match) {
                codePart = match[1];
                numberPart = match[2];
            }
        }
        if (countryCodeSelect) countryCodeSelect.value = codePart;
        if (phoneNumberInput && !phoneNumberInput.value.trim()) {
            phoneNumberInput.value = numberPart;
        }
        
        // Set OTP verification status based on Firestore
        bookingData.otpVerified = clientData?.isVerified || false;
    }
    // 3. Update Booking Data State
    bookingData.personalInfo = {
        fullName: fullName,
        phone: phone, 
        email: email
    };
    
    // Determine which view to show
    const needsEdit = fullName === 'Not provided' || phone === 'Not provided';
    
    if (needsEdit) {
         showEditView(); 
    } else {
         showDisplayView();
    }
}

// Show edit view
function showEditView() {
    document.getElementById('detailsDisplayView').style.display = 'none';
    document.getElementById('detailsEditView').style.display = 'block';
}

// Show display view
function showDisplayView() {
    document.getElementById('detailsEditView').style.display = 'none';
    document.getElementById('detailsDisplayView').style.display = 'block';
}

// Save details and update display
function saveDetails() {
    const fullName = document.getElementById('fullName').value.trim();
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    const countryCode = document.getElementById('countryCode').value;
    const email = document.getElementById('email').value.trim();
    
    // Validate
    if (!fullName || fullName.length < 2) {
        document.getElementById('nameError').classList.add('show');
        return;
    }
    
    if (!phoneNumber || phoneNumber.length < 10) {
        document.getElementById('phoneError').classList.add('show');
        return;
    }
    
    document.querySelectorAll('.error-message').forEach(el => el.classList.remove('show'));
    
    const fullPhone = `${countryCode}${phoneNumber}`;
    
    // Update display view
    document.getElementById('displayFullName').textContent = fullName;
    document.getElementById('displayPhoneNumber').textContent = fullPhone;
    document.getElementById('displayEmail').textContent = email || 'Not provided';
    
    // Update booking data
    bookingData.personalInfo = {
        fullName: fullName,
        phone: fullPhone,
        email: email
    };
    
    showDisplayView();
}

function nextStep() {
    if (!validateCurrentStep()) {
        return;
    }
    
    if (currentStep === 5) {
        completeBooking();
        return;
    }
    
    currentStep++;
    showStep(currentStep);
}

function previousStep() {
    if (currentStep > 1) {
        currentStep--;
        showStep(currentStep);
    }
}

// Validation functions
function validateCurrentStep() {
    switch (currentStep) {
        case 1:
            return true;
        case 2:
            if (!bookingData.selectedDate) {
                alert('Please select a date for your appointment.');
                return false;
            }
            return true;
        case 3:
            if (!bookingData.selectedTime) {
                alert('Please select a time for your appointment.');
                return false;
            }
            return true;
        case 4:
            return validatePersonalInfo();
        case 5:
            if (!bookingData.receiptUploaded) {
                alert('Please upload your payment receipt to complete the booking.');
                return false;
            }
            return true;
        default:
            return true;
    }
}

function validatePersonalInfo() {
    const isDataMissing = !bookingData.personalInfo || !bookingData.personalInfo.fullName || !bookingData.personalInfo.phone || bookingData.personalInfo.fullName === 'Not provided' || bookingData.personalInfo.phone === 'Not provided';
    
    if (isDataMissing) {
        // If mandatory details are missing, force user into edit mode and validate
        if (document.getElementById('detailsEditView').style.display !== 'none') {
            const fullName = document.getElementById('fullName').value.trim();
            const phoneNumber = document.getElementById('phoneNumber').value.trim();
            
            document.querySelectorAll('.error-message').forEach(el => el.classList.remove('show'));
            let isValid = true;
            
            if (!fullName || fullName.length < 2) {
                document.getElementById('nameError').classList.add('show');
                isValid = false;
            }
            if (!phoneNumber || phoneNumber.length < 10) {
                document.getElementById('phoneError').classList.add('show');
                isValid = false;
            }
            
            if (!isValid) {
                alert('Please fill and save your complete details.');
                return false;
            }
            
            saveDetails(); // Save details to bookingData after validation
        } else {
            showEditView();
            alert('Please fill in your details to continue.');
            return false;
        }
    }
    
    // Check OTP status after ensuring data is present and saved
    if (bookingData.personalInfo && bookingData.personalInfo.phone && !bookingData.otpVerified) {
        sendOTP();
        return false; 
    }
    
    return bookingData.personalInfo && bookingData.personalInfo.fullName && bookingData.personalInfo.phone && bookingData.otpVerified;
}

// OTP functionality
let otpCountdown = 60;
let otpTimer = null;

function sendOTP() {
    const countryCode = document.getElementById('countryCode').value;
    const phoneNumber = document.getElementById('phoneNumber').value;
    const fullPhone = `${countryCode}${phoneNumber}`;
    
    bookingData.personalInfo = {
        fullName: document.getElementById('fullName').value.trim(),
        phone: fullPhone,
        email: document.getElementById('email').value.trim()
    };
    
    document.getElementById('otpContainer').style.display = 'block';
    document.getElementById('phoneDisplay').textContent = fullPhone;
    
    startOTPCountdown();
    
    console.log('OTP sent to:', fullPhone);
    alert(`Verification code sent to ${fullPhone}`);
    
    document.querySelector('.otp-input').focus();
}

function startOTPCountdown() {
    otpCountdown = 60;
    const countdownElement = document.getElementById('countdown');
    const resendButton = document.getElementById('resendOtp');
    
    resendButton.style.display = 'none';
    
    if(otpTimer) clearInterval(otpTimer);
    
    otpTimer = setInterval(() => {
        otpCountdown--;
        countdownElement.textContent = otpCountdown;
        
        if (otpCountdown <= 0) {
            clearInterval(otpTimer);
            countdownElement.textContent = '0';
            resendButton.style.display = 'inline';
        }
    }, 1000);
}

function resendOTP() {
    sendOTP();
}

function verifyOTP() {
    const otpInputs = document.querySelectorAll('.otp-input');
    const otpCode = Array.from(otpInputs).map(input => input.value).join('');
    
    if (otpCode.length === 6) {
        // Simulated Verification Success
        bookingData.otpVerified = true;
        document.getElementById('otpContainer').style.display = 'none';
        document.getElementById('otpError').classList.remove('show');
        alert('Phone number verified successfully! Proceeding to the next step.');
        return true;
    } else {
        document.getElementById('otpError').classList.add('show');
        return false;
    }
}

// OTP input handling
document.addEventListener('DOMContentLoaded', function() {
    const otpInputs = document.querySelectorAll('.otp-input');
    
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', function(e) {
            if (e.target.value.length === 1) {
                if (index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                } else {
                    setTimeout(() => {
                        if (verifyOTP() && currentStep === 4) {
                            // If successful verification happens at step 4, move next
                            nextStep();
                        }
                    }, 100);
                }
            }
        });
        
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
                otpInputs[index - 1].focus();
            }
        });
    });
});

// Payment functionality
function updatePaymentSummary() {
    const reservationFee = bookingData.design.price / 2;
    
    document.getElementById('paymentDesignName').textContent = bookingData.design.name;
    document.getElementById('paymentDate').textContent = 
        bookingData.selectedDate ? formatDateString(bookingData.selectedDate) : '-';
    document.getElementById('paymentTime').textContent = bookingData.selectedTime || '-';
    document.getElementById('reservationAmount').textContent = `₱${reservationFee.toFixed(2)}`;
}

// Payment method selection
document.addEventListener('DOMContentLoaded', function() {
    const paymentMethods = document.querySelectorAll('.payment-method');
    
    paymentMethods.forEach(method => {
        method.addEventListener('click', function() {
            paymentMethods.forEach(m => m.classList.remove('selected'));
            this.classList.add('selected');
            
            const methodType = this.dataset.method;
            bookingData.paymentMethod = methodType;
            
            const methodNames = {
                gcash: 'GCash',
                maya: 'Maya (PayMaya)',
                bank: 'Bank Transfer'
            };
            document.getElementById('selectedPaymentMethod').textContent = methodNames[methodType];
        });
    });
});

// Receipt upload functionality
document.addEventListener('DOMContentLoaded', function() {
    const receiptUpload = document.getElementById('receiptUpload');
    const receiptFile = document.getElementById('receiptFile');
    const uploadedReceipt = document.getElementById('uploadedReceipt');
    receiptFile.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            handleReceiptUpload(e.target.files[0]);
        }
    });
    
    // Drag and drop functionality
    if (receiptUpload) {
        receiptUpload.addEventListener('dragover', function(e) {
            e.preventDefault();
            receiptUpload.classList.add('dragover');
        });
        
        receiptUpload.addEventListener('dragleave', function(e) {
            e.preventDefault();
            receiptUpload.classList.remove('dragover');
        });
        
        receiptUpload.addEventListener('drop', function(e) {
            e.preventDefault();
            receiptUpload.classList.remove('dragover');
            
            if (e.dataTransfer.files.length > 0) {
                handleReceiptUpload(e.dataTransfer.files[0]);
            }
        });
    }
});

function handleReceiptUpload(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file (PNG, JPG, etc.)');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB');
        return;
    }
    
    bookingData.receiptUploaded = true;
    
    const uploadedReceipt = document.getElementById('uploadedReceipt');
    uploadedReceipt.style.display = 'block';
    uploadedReceipt.innerHTML = `
        <div class="flex items-center gap-4 bg-white border border-gray-300 rounded-xl p-4">
            <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
            </div>
            <div class="flex-1">
                <div class="font-bold text-gray-800">${file.name}</div>
                <div class="text-gray-600 text-sm">${(file.size / 1024).toFixed(1)} KB</div>
            </div>
            <button onclick="removeReceipt()" class="bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center cursor-pointer transition-all">×</button>
        </div>
    `;
    
    document.getElementById('receiptUpload').classList.add('hidden');
    uploadedReceipt.classList.remove('hidden');
}

window.removeReceipt = function() { // Expose globally for onclick attribute
    bookingData.receiptUploaded = false;
    document.getElementById('uploadedReceipt').classList.add('hidden');
    document.getElementById('receiptUpload').classList.remove('hidden');
    document.getElementById('receiptFile').value = '';
}

// Complete booking
async function completeBooking() {
    const bookingId = 'DCAC-' + new Date().getFullYear() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    
    // Store bookingId in bookingData for calendar integration
    bookingData.bookingId = bookingId;
    
    document.getElementById('stepNavigation').style.display = 'none';
    document.getElementById('successStep').style.display = 'block';
    
    const reservationFee = bookingData.design.price / 2;
    const remainingBalance = bookingData.design.price - reservationFee;
    
    document.getElementById('bookingId').textContent = '#' + bookingId;
    document.getElementById('summaryDesign').textContent = bookingData.design.name;
    // Format date string without timezone conversion to avoid date offset
    document.getElementById('summaryDate').textContent = formatDateString(bookingData.selectedDate);
    document.getElementById('summaryTime').textContent = bookingData.selectedTime;
    document.getElementById('summaryTotal').textContent = `₱${bookingData.design.price.toFixed(2)}`;
    document.getElementById('summaryPaid').textContent = `₱${reservationFee.toFixed(2)}`;
    document.getElementById('summaryBalance').textContent = `₱${remainingBalance.toFixed(2)}`;
    
    console.log('Booking completed:', {
        bookingId,
        ...bookingData,
        status: 'pending',
        createdAt: new Date().toISOString()
    });
    
    // Automatically create calendar event in admin's Google Calendar
    const calendarStatusEl = document.getElementById('calendarStatus');
    if (calendarStatusEl) {
        calendarStatusEl.innerHTML = '<div class="text-blue-600 flex items-center gap-2"><svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Adding to admin calendar...</div>';
        calendarStatusEl.style.display = 'block';
    }
    
    // Call admin calendar function
    if (typeof createAdminCalendarEvent === 'function') {
        try {
            const calendarResult = await createAdminCalendarEvent(bookingData);
            if (calendarStatusEl) {
                if (calendarResult.success) {
                    calendarStatusEl.innerHTML = `<div class="text-green-600 flex items-center gap-2"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg> Added to admin calendar successfully!</div>`;
                } else {
                    calendarStatusEl.innerHTML = `<div class="text-yellow-600 flex items-center gap-2"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg> Calendar: ${calendarResult.message || 'Not configured'}</div>`;
                }
            }
        } catch (error) {
            console.error('Error creating calendar event:', error);
            if (calendarStatusEl) {
                calendarStatusEl.innerHTML = `<div class="text-yellow-600 flex items-center gap-2"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg> Calendar: Setup required (see GOOGLE_CALENDAR_SETUP.md)</div>`;
            }
        }
    }
    
    setTimeout(() => {
        console.log('Booking confirmation sent!');
    }, 2000);
}

// Download booking details
function downloadBookingDetails() {
    const bookingDetails = `
DCAC Design Studio - Booking Confirmation
========================================

Booking ID: ${document.getElementById('bookingId').textContent}
Design: ${document.getElementById('summaryDesign').textContent}
Date: ${document.getElementById('summaryDate').textContent}
Time: ${document.getElementById('summaryTime').textContent}
Client: ${bookingData.personalInfo.fullName}
Phone: ${bookingData.personalInfo.phone}
Email: ${bookingData.personalInfo.email}

Payment Summary:
- Total Amount: ${document.getElementById('summaryTotal').textContent}
- Paid (Reservation): ${document.getElementById('summaryPaid').textContent}
- Remaining Balance: ${document.getElementById('summaryBalance').textContent}

Status: Pending Confirmation

Thank you for choosing DCAC Design Studio!
    `.trim();
    
    const blob = new Blob([bookingDetails], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'DCAC_Booking_Details.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

window.downloadBookingDetails = downloadBookingDetails; // Expose globally for onclick attribute

// --- INITIALIZATION ---
let autoAdvanceTriggered = false; 

// CRITICAL: Expose functions globally IMMEDIATELY so onclick handlers work
window.nextStep = nextStep;
window.previousStep = previousStep;
window.changeDesign = changeDesign;
window.selectDate = selectDate;
window.selectTime = selectTime;
window.resendOTP = resendOTP;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize calendar and steps immediately (before auth check)
    initializeFromURL();
    generateCalendar();
    showStep(currentStep);
    
    // Scroll to step1 if hash is present
    if (window.location.hash === '#step1') {
        setTimeout(() => {
            const step1Element = document.getElementById('step1');
            if (step1Element) {
                step1Element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    }
    
    // Attach button event listeners directly (backup for onclick handlers)
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    
    if (nextBtn) {
        // Remove existing onclick and use addEventListener
        nextBtn.onclick = null;
        nextBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof nextStep === 'function') {
                nextStep();
            } else {
                console.error('nextStep function not available');
            }
        });
    }
    
    if (prevBtn) {
        prevBtn.onclick = null;
        prevBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof previousStep === 'function') {
                previousStep();
            }
        });
    }
    
    // Attach Edit/Save/Cancel listeners
    const editDetailsBtn = document.getElementById('editDetailsBtn');
    if (editDetailsBtn) {
        editDetailsBtn.addEventListener('click', showEditView);
    }
    
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', showDisplayView);
    }
    
    const saveDetailsBtn = document.getElementById('saveDetailsBtn');
    if (saveDetailsBtn) {
        saveDetailsBtn.addEventListener('click', saveDetails);
    }
    
    // 1. CRITICAL: Restrict access and start flow based on login status
    // Use onAuthStateChanged from global auth or import dynamically
    if (window.auth) {
        // Import onAuthStateChanged dynamically
        import("https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js").then(({ onAuthStateChanged }) => {
            onAuthStateChanged(window.auth, (user) => {
                if (!restrictAccess(user)) {
                    return; // User will be redirected, don't continue initialization
                }
                
                // User is logged in, refresh initialization
                initializeFromURL();
                generateCalendar();
                showStep(currentStep); 
                
                // Auto-advance from step 1 if design is pre-selected
                if (new URLSearchParams(window.location.search).get('design') && !autoAdvanceTriggered) {
                    autoAdvanceTriggered = true;
                    setTimeout(() => {
                        if (currentStep === 1) {
                            nextStep();
                        }
                    }, 1500);
                }
            });
        }).catch(err => {
            console.error('Failed to load Firebase Auth:', err);
            // Fallback: try to proceed without auth check (for testing)
            initializeFromURL();
            generateCalendar();
            showStep(currentStep);
        });
    } else {
        // Auth not available yet, wait a bit and try again
        setTimeout(() => {
            if (window.auth) {
                import("https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js").then(({ onAuthStateChanged }) => {
                    onAuthStateChanged(window.auth, (user) => {
                        if (!restrictAccess(user)) {
                            return;
                        }
                        initializeFromURL();
                        generateCalendar();
                        showStep(currentStep);
                    });
                });
            } else {
                console.warn('Auth still not available, proceeding without auth check');
            }
        }, 500);
    }
});
