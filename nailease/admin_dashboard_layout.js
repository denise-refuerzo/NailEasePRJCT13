import { updateProfile } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { saveDesign, deleteDesign, saveGalleryItem, deleteGalleryItem, toggleActivePromo,state, setPage, setTab, editDesign, toggleFeaturedDesign, updateDesignInline, saveQRCode, deleteQRCode 
} from './auth-logic.js';
import { getAllReviews, deleteReview, getExternalReviewPhotos, uploadExternalReviewPhoto, deleteExternalReviewPhoto } from './review-logic.js';

//pagination per page
const DESIGNS_PER_PAGE = 3; 
const PROMOS_PER_PAGE = 5;
const CREDENTIALS_PER_PAGE = 2;

const DEFAULT_GOOGLE_CALENDAR_EMBED_URL = 'https://calendar.google.com/calendar/embed?src=naileaseph%40gmail.com&ctz=Asia%2FManila';
const GOOGLE_CALENDAR_EMBED_URL = typeof window !== 'undefined'
    ? (window.__NAILEASE_CALENDAR_EMBED_URL__ || DEFAULT_GOOGLE_CALENDAR_EMBED_URL)
    : DEFAULT_GOOGLE_CALENDAR_EMBED_URL;

// REMOVED 'cancelled' from filters and meta
const APPOINTMENT_STATUS_FILTERS = ['all', 'pending', 'confirmed', 'completed'];
const APPOINTMENT_STATUS_META = {
    pending: {
        label: 'Pending',
        badgeClasses: 'bg-amber-100 text-amber-700 border border-amber-200',
        dotClasses: 'bg-amber-500'
    },
    confirmed: {
        label: 'Confirmed',
        badgeClasses: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
        dotClasses: 'bg-emerald-500'
    },
    completed: {
        label: 'Completed',
        badgeClasses: 'bg-sky-100 text-sky-700 border border-sky-200',
        dotClasses: 'bg-sky-500'
    }
    // REMOVED 'cancelled' META
    // cancelled: {
    //     label: 'Cancelled',
    //     badgeClasses: 'bg-rose-100 text-rose-700 border border-rose-200',
    //     dotClasses: 'bg-rose-500'
    // }
};

const formatDate = (value) => {
    if (!value) return 'No date set';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
//
const formatTime = (value) => {
    if (!value) return 'No time set';

    const toLocale = (date) => date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    if (value instanceof Date) {
        // Enforce minute is 00 for display (though the source time might have minutes)
        if (value.getMinutes() !== 0) {
            value.setMinutes(0);
        }
        return toLocale(value);
    }

    if (typeof value === 'string') {
        // If already in 12-hour format with consistent spacing, return as is
        if (value.includes('AM') || value.includes('PM')) {
            return value.replace(/\s+/g, ' ').trim(); // Normalize spacing
        }

        const parsedTimestamp = Date.parse(value);
        if (!Number.isNaN(parsedTimestamp) && value.includes('T')) {
            const date = new Date(parsedTimestamp);
             // Enforce minute is 00 for display
            if (date.getMinutes() !== 0) {
                 date.setMinutes(0);
            }
            return toLocale(date);
        }

        try {
            // Handle 24-hour format (08:00) and convert to 12-hour format (8:00 AM)
            const [hourStr, minuteStr] = value.split(':');
            const minute = parseInt(minuteStr || '0', 10);
            const hour = parseInt(hourStr, 10);

            // Time format check: ensure minute is 00
            if (minute !== 0) {
                 // For display, we force it to the hour, but for data integrity, we might want to alert if it's not.
                 // Since this is a display function, we will force the display to the hour.
            }
            
            if (hourStr === undefined) return value;
            const date = new Date();
            date.setHours(hour, 0); // Force minutes to 0
            return toLocale(date);
        } catch (error) {
            return value;
        }
    }

    return value;
};
//
//input skeleton
const inputField = (id, label, type = 'text', value = '', required = true) => {
    // Special handling for time input to show only hours and auto-set minutes to "00"
    if (type === 'time') {
        return `
            <label for="${id}" class="block text-sm font-medium text-gray-700 mt-3">${label}</label>
            <input type="time" id="${id}" name="${id}" ${required ? 'required' : ''} 
                value="${value}"
                step="3600" 
                class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-accent-pink focus:ring focus:ring-accent-pink focus:ring-opacity-50 transition duration-150 ease-in-out bg-white"
                onchange="formatHourlyTime(this)">
        `;
    }
    
    return `
        <label for="${id}" class="block text-sm font-medium text-gray-700 mt-3">${label}</label>
        <input type="${type}" id="${id}" name="${id}" ${required ? 'required' : ''} 
            value="${value}"
            class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-accent-pink focus:ring focus:ring-accent-pink focus:ring-opacity-50 transition duration-150 ease-in-out bg-white">
    `;
};

// Time formatting function - ensures only allowed time slots are used
window.formatHourlyTime = function(input) {
    if (input.type === 'time' && input.value) {
        const [hours, minutes] = input.value.split(':');
        const timeValue = `${hours}:${minutes || '00'}`;
        
        // Define allowed time slots
        const allowedTimeSlots = ['08:00', '10:00', '13:00', '15:00', '17:00', '19:00'];
        
        // If the selected time is not in allowed slots, clear it
        if (!allowedTimeSlots.includes(timeValue)) {
            input.value = '';
            alert('Please select one of the available time slots: 8:00 AM, 10:00 AM, 1:00 PM, 3:00 PM, 5:00 PM, or 7:00 PM');
        }
    }
};

// Initialize time inputs to enforce strict time slots
window.initializeTimeInputs = function() {
    document.querySelectorAll('input[type="time"]').forEach(input => {
        // Set step to 1 hour to show only hour options
        input.step = 3600;
        
        // Ensure current value is one of the allowed slots
        if (input.value) {
            const [hours, minutes] = input.value.split(':');
            const timeValue = `${hours}:${minutes || '00'}`;
            const allowedTimeSlots = ['08:00', '10:00', '13:00', '15:00', '17:00', '19:00'];
            
            if (!allowedTimeSlots.includes(timeValue)) {
                input.value = '';
            }
        }
        
        // Add event listener to enforce allowed time slots
        input.addEventListener('change', function() {
            window.formatHourlyTime(this);
        });
    });
};

// Get time slots based on day of week - SAME LOGIC AS USER BOOKING SYSTEM
function getTimeSlotsForDateAdmin(dateString) {
    if (!dateString) {
        // Default to weekday slots
        return ['08:00', '12:00', '16:00', '18:00', '20:00'];
    }
    
    // Parse date string (format: YYYY-MM-DD) to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    // Monday-Friday (1-5): 8:00 AM, 12:00 PM, 4:00 PM, 6:00 PM, 8:00 PM
    // Saturday-Sunday (0, 6): 8:00 AM, 10:00 AM, 1:00 PM, 3:00 PM, 5:00 PM, 7:00 PM
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // Weekdays (Mon-Fri) - 24-hour format
        return ['08:00', '12:00', '16:00', '18:00', '20:00'];
    } else {
        // Weekends (Sat-Sun) - 24-hour format
        return ['08:00', '10:00', '13:00', '15:00', '17:00', '19:00'];
    }
}

// Custom time input that only shows specific time slots based on weekday/weekend
window.createHourlyTimeInput = function(id, value = '', selectedDate = '') {
    // Get time slots based on selected date (weekday vs weekend)
    const allowedTimeSlots = getTimeSlotsForDateAdmin(selectedDate);
    
    // Extract hour from value if provided
    let hourValue = '';
    if (value) {
        const [hours, minutes] = value.split(':');
        hourValue = `${hours}:${minutes || '00'}`;
    }
    
    const now = new Date();
    const selectedDateTime = selectedDate ? new Date(selectedDate) : null;
    const isToday = selectedDateTime && selectedDateTime.toDateString() === now.toDateString();
    
    return `
        <select id="${id}" name="${id}" class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-accent-pink focus:ring focus:ring-accent-pink focus:ring-opacity-50 transition duration-150 ease-in-out bg-white">
            <option value="">Select Time</option>
            ${allowedTimeSlots.map(timeValue => {
                const [hours, minutes] = timeValue.split(':');
                const hour = parseInt(hours, 10);
                const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const isSelected = hourValue === timeValue;
                
                // Check if this time slot is in the past
                let isDisabled = false;
                if (isToday) {
                    const timeSlot = new Date();
                    timeSlot.setHours(hour, 0, 0, 0);
                    isDisabled = timeSlot <= now;
                }
                
                return `<option value="${timeValue}" ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}>${displayHour}:00 ${ampm}${isDisabled ? ' (Past)' : ''}</option>`;
            }).join('')}
        </select>
    `;
};

// Function to update time options based on selected date - uses weekday/weekend logic
window.updateTimeOptions = function(selectedDate) {
    const timeSelect = document.getElementById('selectedTime');
    if (!timeSelect) return;
    
    // Get time slots based on weekday/weekend - SAME LOGIC AS USER BOOKING SYSTEM
    const allowedTimeSlots = getTimeSlotsForDateAdmin(selectedDate);
    
    const now = new Date();
    const selectedDateTime = selectedDate ? new Date(selectedDate) : null;
    const isToday = selectedDateTime && selectedDateTime.toDateString() === now.toDateString();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    
    // Clear existing options except the first "Select Time" option
    const firstOption = timeSelect.options[0];
    timeSelect.innerHTML = '';
    if (firstOption && firstOption.value === '') {
        timeSelect.appendChild(firstOption);
    } else {
        timeSelect.innerHTML = '<option value="">Select Time</option>';
    }
    
    // Add time slots based on weekday/weekend
    allowedTimeSlots.forEach(timeValue => {
        const [hours, minutes] = timeValue.split(':');
        const hour = parseInt(hours, 10);
        const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        
        // Check if this time slot is in the past
        let isDisabled = false;
        if (isToday) {
            if (hour < currentHour || (hour === currentHour && 0 < currentMinutes)) {
                isDisabled = true;
            }
        }
        
        const option = document.createElement('option');
        option.value = timeValue;
        option.textContent = `${displayHour}:00 ${ampm}${isDisabled ? ' (Past)' : ''}`;
        option.disabled = isDisabled;
        timeSelect.appendChild(option);
    });
};
//
// Admin Profile Editing Modal
const adminProfileModalHtml = `
    <div id="adminProfileModal" class="fixed inset-0 z-50 items-center justify-center bg-gray-900 bg-opacity-50 hidden">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 transform transition-all duration-300">
            <h3 class="text-xl font-bold text-gray-800 mb-4">Edit Admin Profile</h3>
            
            <form id="adminProfileForm" class="space-y-4">
                
                <label for="adminNameInput" class="block text-sm font-medium text-gray-700">Display Name</label>
                <input type="text" id="adminNameInput" required
                       class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-pink-500 focus:ring focus:ring-pink-500 focus:ring-opacity-50 transition duration-150 ease-in-out">

                <label for="adminEmailInput" class="block text-sm font-medium text-gray-700">Email Address (Read-only)</label>
                <input type="email" id="adminEmailInput" disabled
                       class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 border bg-gray-100 cursor-not-allowed">
                       
                <p id="profileError" class="text-red-500 text-sm hidden"></p>

                <div class="flex justify-end space-x-3 pt-4">
                    <button type="button" id="cancelAdminModalBtn" class="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 transition">
                        Cancel
                    </button>
                    <button type="submit" class="px-4 py-2 text-sm font-medium rounded-lg text-white bg-pink-600 hover:bg-pink-700 transition">
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    </div>
`;

//Design Tab
const renderDesignsTab = () => {
    const isAddingNew = state.editingDesign === null;
    const design = state.editingDesign || {};
    
    // pagination logic
    const designsToShow = state.designs.slice(
        (state.designsCurrentPage - 1) * DESIGNS_PER_PAGE,
        state.designsCurrentPage * DESIGNS_PER_PAGE
    );
    const totalPages = Math.ceil(state.designs.length / DESIGNS_PER_PAGE);

    // Design Form
    const formHtml = `
        <form id="design-form" class="p-6 bg-white rounded-xl shadow-md mb-8 border border-gray-100">
            <h3 class="text-xl font-bold text-pink-600 mb-4">${isAddingNew ? 'Add New Design' : 'Edit Design'}</h3>
            <input type="hidden" id="design-id" value="${design.id || ''}">
            
            ${inputField('design-title', 'Design Title', 'text', design.title || '', true)}
            ${inputField('design-price', 'Price (PHP)', 'number', design.price || '', true)}
            ${inputField('design-imageUrl', 'Image URL (Link to Photo)', 'url', design.imageUrl || '', true)}

            <div class="flex space-x-4 mt-6">
                <button type="submit" class="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-pink-600 hover:bg-pink-700 transition duration-150">
                    ${isAddingNew ? 'Add Design' : 'Save Changes'}
                </button>
                ${!isAddingNew ? `
                    <button type="button" onclick="window.setPage('manage', 'designs');" class="px-4 py-3 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition duration-150">
                        Cancel Edit
                    </button>
                ` : ''}
            </div>
        </form>
    `;

    // Design Display
    const listHtml = designsToShow.length > 0 ? designsToShow.map(d => `
        <form id="design-item-form-${d.id}" class="design-item-form bg-white rounded-xl shadow-sm flex items-start p-4 mb-4 border border-gray-100 border-l-4 ${d.isFeatured ? 'border-purple-600' : 'border-accent-pink'}">
            <img src="${d.imageUrl || 'https://placehold.co/100x75/FCE7F3/DB2777?text=No+Img'}" 
                alt="${d.title}" 
                onerror="this.onerror=null;this.src='https://placehold.co/100x75/FCE7F3/DB2777?text=Error';"
                class="w-full sm:w-24 h-18 object-cover rounded-lg mr-4 flex-shrink-0">
            <div class="flex-grow w-full space-y-1">
                <input type="text" id="design-title-${d.id}" data-initial-value="${d.title}" value="${d.title}" required
                        oninput="window.toggleSaveButton('${d.id}')"
                        class="text-lg font-semibold text-gray-800 w-full mb-1 p-0.5 border-b border-gray-200 focus:border-pink-500 focus:ring-0">
                
                <div class="flex items-center text-sm text-gray-600 mb-2">
                    <span class="mr-1">Price:</span> 
                    <span class="font-bold text-pink-600">₱</span>
                    <input type="number" id="design-price-${d.id}" data-initial-value="${d.price}" value="${d.price}" required
                            oninput="window.toggleSaveButton('${d.id}')"
                            class="font-bold text-pink-600 p-0.5 border-b border-gray-200 focus:border-pink-600 focus:ring-0 w-20">
                </div>
                
                <div class="flex items-center mt-2">
                    <input id="featured-${d.id}" type="checkbox" ${d.isFeatured ? 'checked' : ''} 
                            onchange="window.toggleFeaturedDesign('${d.id}', this.checked)"
                            class="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500">
                    <label for="featured-${d.id}" class="ml-2 text-sm font-medium text-gray-700">Featured</label>
                </div>
            </div>
            
            <div class="flex flex-col space-y-2 flex-shrink-0 ml-4">
                
                <button type="button" onclick="window.editDesign('${d.id}')" class="px-3 py-1 text-sm font-medium rounded-lg text-pink-600 border border-pink-600 hover:bg-pink-50 transition">
                    Edit
                </button>
                
                <button type="button" onclick="window.deleteDesign('${d.id}')" class="px-3 py-1 text-sm font-medium rounded-lg text-red-500 border border-red-500 hover:bg-red-50 transition">
                    Delete
                </button>
            </div>
        </form>
    `).join('') : '<p class="text-center text-gray-500 py-8">No designs added yet. Use the form above to add one!</p>';

    // Pagination format & design
    const paginationHtml = totalPages > 1 ? `
        <div class="flex justify-center space-x-2 mt-6">
            <button onclick="window.setPage('manage', 'designs', ${state.designsCurrentPage - 1})" ${state.designsCurrentPage === 1 ? 'disabled' : ''} 
                    class="px-4 py-2 text-sm font-medium rounded-lg ${state.designsCurrentPage === 1 ? 'bg-gray-200 text-gray-500' : 'bg-white text-pink-600 hover:bg-pink-50'} transition">
                Previous
            </button>
            <span class="px-4 py-2 text-sm font-medium text-gray-700">Page ${state.designsCurrentPage} of ${totalPages}</span>
            <button onclick="window.setPage('manage', 'designs', ${state.designsCurrentPage + 1})" ${state.designsCurrentPage === totalPages ? 'disabled' : ''} 
                    class="px-4 py-2 text-sm font-medium rounded-lg ${state.designsCurrentPage === totalPages ? 'bg-gray-200 text-gray-500' : 'bg-white text-pink-600 hover:bg-pink-50'} transition">
                Next
            </button>
        </div>
    ` : '';

    return `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-1">${formHtml}</div>
            <div class="lg:col-span-2">
                <h3 class="text-xl font-bold text-gray-800 mb-4">Current Designs (${state.designs.length})</h3>
                <div class="space-y-4">${listHtml}</div>
                ${paginationHtml}
            </div>
        </div>
    `;
};

//Promo Tab
const renderPromoTab = () => {
    const activePromos = state.gallery.filter(item => item.type === 'promo' && item.isActive);
    const promos = state.gallery.filter(item => item.type === 'promo');
    
    // pagination logic -- All displays
    const promosToShow = promos.slice(
        (state.promosCurrentPage - 1) * PROMOS_PER_PAGE,
        state.promosCurrentPage * PROMOS_PER_PAGE
    );
    const totalPages = Math.ceil(promos.length / PROMOS_PER_PAGE);
    
    // pagination logic --Currently Active displays
    const activePromosPerPage = 1; 
    const currentActivePage = state.promosActiveCurrentPage || 1; 
    const currentActivePromoIndex = (currentActivePage - 1) * activePromosPerPage;
    const currentActivePromo = activePromos[currentActivePromoIndex]; 
    const totalActivePages = Math.ceil(activePromos.length / activePromosPerPage);

    //Promo Form
    const formHtml = `
        <form id="promo-form" class="p-6 bg-white rounded-xl shadow-md mb-8 border border-gray-100">
            <h3 class="text-xl font-bold text-pink-600 mb-4">Add New Promo Image</h3>
            ${inputField('promo-imageUrl', 'Image URL (Link to Photo)', 'url', '', true)}
            <button type="submit" class="w-full mt-6 px-4 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-pink-600 hover:bg-pink-700 transition duration-150">
                Add Promo Image
            </button>
        </form>
    `;
    
    // Promo displays
    const listHtml = promosToShow.length > 0 ? promosToShow.map(p => `
        <div class="bg-white rounded-xl shadow-sm flex flex-col sm:flex-row items-center p-4 mb-4 border border-gray-100 border-l-4 ${p.isActive ? 'border-green-500' : 'border-gray-300'}">
            <img src="${p.imageUrl || 'https://placehold.co/120x60/FCE7F3/DB2777?text=No+Img'}" 
                alt="Promo Image" 
                onerror="this.onerror=null;this.src='https://placehold.co/120x60/FCE7F3/DB2777?text=Error';"
                class="w-full sm:w-32 h-16 object-cover rounded-lg mb-3 sm:mb-0 sm:mr-4 flex-shrink-0">
            <div class="flex-grow w-full">
                <p class="text-sm font-semibold text-gray-800 truncate">Promo ID: ${p.id}</p>
                
                <div class="flex items-center mt-2">
                    <input id="active-promo-${p.id}" type="checkbox" ${p.isActive ? 'checked' : ''} 
                            onchange="window.toggleActivePromo('${p.id}', this.checked)"
                            class="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500">
                    <label for="active-promo-${p.id}" class="ml-2 text-xs font-bold ${p.isActive ? 'text-green-600' : 'text-gray-500'}">${p.isActive ? 'ACTIVE' : 'INACTIVE'}</label>
                </div>
            </div>
            <div class="flex space-x-2 mt-3 sm:mt-0 flex-shrink-0">
                <button onclick="window.deleteGalleryItem('${p.id}')" class="p-2 rounded-full text-red-500 hover:bg-red-100 transition">
                    <i data-lucide="trash-2" class="w-5 h-5"></i>
                </button>
            </div>
        </div>
    `).join('') : '<p class="text-center text-gray-500 py-8">No promo images added yet.</p>';
    
    // Pagination format & design --All displays
    const allPromosPaginationHtml = totalPages > 1 ? `
        <div class="flex justify-center space-x-2 mt-6">
            <button onclick="window.setPage('manage', 'promo', ${state.promosCurrentPage - 1}, ${currentActivePage})" ${state.promosCurrentPage === 1 ? 'disabled' : ''} 
                    class="px-4 py-2 text-sm font-medium rounded-lg ${state.promosCurrentPage === 1 ? 'bg-gray-200 text-gray-500' : 'bg-white text-pink-600 hover:bg-pink-50'} transition">
                Previous
            </button>
            <span class="px-4 py-2 text-sm font-medium text-gray-700">Page ${state.promosCurrentPage} of ${totalPages}</span>
            <button onclick="window.setPage('manage', 'promo', ${state.promosCurrentPage + 1}, ${currentActivePage})" ${state.promosCurrentPage === totalPages ? 'disabled' : ''} 
                    class="px-4 py-2 text-sm font-medium rounded-lg ${state.promosCurrentPage === totalPages ? 'bg-gray-200 text-gray-500' : 'bg-white text-pink-600 hover:bg-pink-50'} transition">
                Next
            </button>
        </div>
    ` : '';

    //Pagination format & design --Active promos display
    const activePromosPaginationHtml = totalActivePages > 1 ? `
        <div class="flex justify-between items-center mt-3 pt-2 border-t border-gray-100">
            <button onclick="window.setPage('manage', 'promo', ${state.promosCurrentPage}, ${currentActivePage - 1})" ${currentActivePage === 1 ? 'disabled' : ''} 
                    class="px-3 py-1 text-xs font-semibold rounded-lg text-pink-600 hover:bg-pink-50 transition duration-150 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed border border-pink-100">
                &larr; Prev
            </button>
            
            <div class="flex items-center space-x-1 text-sm font-bold text-gray-700">
                <span class="text-pink-600">${currentActivePage}</span> 
                <span class="text-gray-400">of</span> 
                <span class="text-gray-500">${totalActivePages}</span>
            </div>
            
            <button onclick="window.setPage('manage', 'promo', ${state.promosCurrentPage}, ${currentActivePage + 1})" ${currentActivePage === totalActivePages ? 'disabled' : ''} 
                    class="px-3 py-1 text-xs font-semibold rounded-lg text-pink-600 hover:bg-pink-50 transition duration-150 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed border border-pink-100">
                Next &rarr;
            </button>
        </div>
    ` : '';
    
    return `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-1">
                ${formHtml}
                <div class="p-6 bg-white rounded-xl shadow-md border border-gray-100">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">Currently Active (${activePromos.length})</h3>
                    ${currentActivePromo ? `
                        <img src="${currentActivePromo.imageUrl}" 
                            alt="Active Promo" 
                            onerror="this.onerror=null;this.src='https://placehold.co/600x200/DB2777/fff?text=Error';"
                            class="w-full h-auto object-cover rounded-lg shadow-lg">
                        <p class="text-xs text-center text-gray-500 mt-2">ID: ${currentActivePromo.id}</p>
                        ${activePromosPaginationHtml}
                    ` : '<p class="text-center text-gray-500">No promo is currently active.</p>'}
                </div>
            </div>
            <div class="lg:col-span-2">
                <h3 class="text-xl font-bold text-gray-800 mb-4">All Promo Images (${promos.length})</h3>
                <div class="space-y-4">${listHtml}</div>
                ${allPromosPaginationHtml}
            </div>
        </div>
    `;
};

//Credential Tab
const renderCredentialsTab = () => {
    const credentials = state.gallery.filter(item => item.type === 'credential');
    
    // pagination Logic
    const credentialsToShow = credentials.slice(
        (state.credentialsCurrentPage - 1) * CREDENTIALS_PER_PAGE,
        state.credentialsCurrentPage * CREDENTIALS_PER_PAGE
    );
    const totalPages = Math.ceil(credentials.length / CREDENTIALS_PER_PAGE);

    // Credential Form
    const formHtml = `
        <form id="credential-form" class="p-6 bg-white rounded-xl shadow-md mb-8 border border-gray-100">
            <h3 class="text-xl font-bold text-pink-600 mb-4">Add New Certificate/Credential</h3>
            
            ${inputField('credential-imageUrl', 'Image URL (Link to Certificate Photo)', 'url', '', true)}
            
            <button type="submit" class="w-full mt-6 px-4 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-pink-600 hover:bg-pink-700 transition duration-150">
                Add Certificate
            </button>
        </form>
    `;
    
    // Credential Display
    const listHtml = credentialsToShow.length > 0 ? credentialsToShow.map(c => `
        <div class="bg-white rounded-xl shadow-sm flex flex-col items-center p-4 mb-4 border border-gray-100 border-l-4 border-accent-pink">
            <img src="${c.imageUrl || 'https://placehold.co/200x150/FCE7F3/DB2777?text=No+Img'}" 
                alt="Certificate" 
                onerror="this.onerror=null;this.src='https://placehold.co/200x150/FCE7F3/DB2777?text=Error';"
                class="w-full h-auto object-cover rounded-lg mb-3 shadow-md max-w-xs">
            <p class="text-xs text-gray-500 mt-2 mb-3 text-center max-w-xs">Credential ID: ${c.id}</p>
            <button onclick="window.deleteGalleryItem('${c.id}')" class="p-2 rounded-full text-red-500 hover:bg-red-100 transition">
                <i data-lucide="trash-2" class="w-5 h-5"></i>
            </button>
        </div>
    `).join('') : '<p class="text-center text-gray-500 py-8">No credentials added yet.</p>';

    //Pagination format & design
    const paginationHtml = totalPages > 1 ? `
        <div class="flex justify-center space-x-2 mt-6">
            <button onclick="window.setPage('manage', 'credentials', ${state.credentialsCurrentPage - 1})" ${state.credentialsCurrentPage === 1 ? 'disabled' : ''} 
                    class="px-4 py-2 text-sm font-medium rounded-lg ${state.credentialsCurrentPage === 1 ? 'bg-gray-200 text-gray-500' : 'bg-white text-pink-600 hover:bg-pink-50'} transition">
                Previous
            </button>
            <span class="px-4 py-2 text-sm font-medium text-gray-700">Page ${state.credentialsCurrentPage} of ${totalPages}</span>
            <button onclick="window.setPage('manage', 'credentials', ${state.credentialsCurrentPage + 1})" ${state.credentialsCurrentPage === totalPages ? 'disabled' : ''} 
                    class="px-4 py-2 text-sm font-medium rounded-lg ${state.credentialsCurrentPage === totalPages ? 'bg-gray-200 text-gray-500' : 'bg-white text-pink-600 hover:bg-pink-50'} transition">
                Next
            </button>
        </div>
    ` : '';
    
    return `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-1">${formHtml}</div>
            <div class="lg:col-span-2">
                <h3 class="text-xl font-bold text-gray-800 mb-4">Current Certificates (${credentials.length})</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">${listHtml}</div>
                ${paginationHtml}
            </div>
        </div>
    `;
};

//QR Code Management Layout (Separate page like Receipts)
function resolveQRCodeImageUrl(rawUrl = '') {
    if (!rawUrl) return '';

    const trimmed = rawUrl.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('data:')) return trimmed;

    // If it's already a direct image URL (jpg, png, gif, webp, svg), return as is
    if (/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(trimmed)) {
        return trimmed;
    }

    // Google Drive folder link - cannot be used as image URL
    if (trimmed.includes('drive.google.com/drive') && trimmed.includes('/folders/')) {
        // This is a folder link, not a file link - return empty to show error
        return '';
    }

    // Google Drive file link formats:
    // 1. https://drive.google.com/file/d/<ID>/view?usp=sharing
    // 2. https://drive.google.com/open?id=<ID>
    // 3. https://drive.google.com/uc?id=<ID>
    // 4. https://drive.google.com/file/d/<ID>/view
    // 5. https://drive.google.com/file/d/<ID>
    
    // Extract file ID from various Google Drive link formats
    let fileId = null;
    
    // Format 1 & 4: /file/d/<ID>/
    const fileDMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
    if (fileDMatch && fileDMatch[1]) {
        fileId = fileDMatch[1];
    }
    
    // Format 2: /open?id=<ID>
    if (!fileId) {
        const openMatch = trimmed.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/i);
        if (openMatch && openMatch[1]) {
            fileId = openMatch[1];
        }
    }
    
    // Format 3: /uc?id=<ID>
    if (!fileId) {
        const ucMatch = trimmed.match(/drive\.google\.com\/uc\?id=([a-zA-Z0-9_-]+)/i);
        if (ucMatch && ucMatch[1]) {
            fileId = ucMatch[1];
        }
    }
    
    // If we found a file ID, convert to direct view URL
    if (fileId) {
        return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }

    // If it's already a uc?export=view link, return as is
    if (trimmed.includes('drive.google.com/uc?export=view')) {
        return trimmed;
    }

    // Dropbox shared link: https://www.dropbox.com/s/<ID>/filename?dl=0
    if (/dropbox\.com\/s\//i.test(trimmed)) {
        return trimmed
            .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
            .replace('?dl=0', '')
            .replace('?dl=1', '')
            .replace('/s/', '/s/');
    }

    // Imgur links
    if (trimmed.includes('imgur.com')) {
        // Convert imgur.com/xxx to i.imgur.com/xxx.jpg
        const imgurMatch = trimmed.match(/imgur\.com\/([a-zA-Z0-9]+)/i);
        if (imgurMatch && imgurMatch[1]) {
            return `https://i.imgur.com/${imgurMatch[1]}.jpg`;
        }
    }

    // Google user content URLs (should work as-is)
    if (trimmed.includes('googleusercontent.com')) {
        try {
            const urlObj = new URL(trimmed);
            return urlObj.toString();
        } catch (e) {
            return trimmed;
        }
    }

    // Try to validate URL format
    try {
        new URL(trimmed);
        return trimmed;
    } catch (e) {
        // Invalid URL format
        return '';
    }
}

export function renderQRLayout(container, user, state) {
    // QR Code Form
    const formHtml = `
        <form id="qr-form" class="p-6 bg-white rounded-xl shadow-md mb-8 border border-gray-100">
            <h3 class="text-xl font-bold text-pink-600 mb-4">Add New QR Code</h3>
            <input type="hidden" id="qr-id" value="">
            
            ${inputField('qr-name', 'QR Code Name (e.g., GCash, PayMaya)', 'text', '', true)}
            
            <div class="mb-4">
                <label for="qr-imageFile" class="block text-sm font-medium text-gray-700 mb-1">Upload QR Image</label>
                <input id="qr-imageFile" type="file" accept="image/*" class="w-full border border-gray-300 rounded-lg p-2 bg-white">
                <p class="text-xs text-gray-500 mt-1">PNG/JPG/WebP. Max 5 MB.</p>
            </div>
            
            <div class="mb-4 flex items-center gap-3">
                <input id="qr-active" type="checkbox" class="h-4 w-4 text-pink-600 border-gray-300 rounded" checked>
                <label for="qr-active" class="text-sm text-gray-700">Active</label>
            </div>
            
            <div class="flex space-x-4 mt-6">
                <button type="submit" class="flex-1 flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-pink-600 hover:bg-pink-700 transition duration-150">
                    Add QR Code
                </button>
            </div>
        </form>
    `;

    // QR Code Display
    const listHtml = state.qrCodes.length > 0 ? state.qrCodes.map(qr => {
        const imageSrc = qr.imageDataUrl || resolveQRCodeImageUrl(qr.imageUrl || qr.originalUrl || '');
        const fallbackImage = 'https://placehold.co/200x200/FCE7F3/DB2777?text=No+QR';
        const errorImage = 'https://placehold.co/200x200/FCE7F3/DB2777?text=Error+Loading';
        
        return `
        <div class="bg-white rounded-xl shadow-sm flex flex-col items-center p-6 mb-4 border border-gray-100 border-l-4 border-pink-500">
            <div class="w-full mb-4">
                <div class="flex items-center justify-between">
                    <h4 class="text-lg font-bold text-gray-800 mb-2">${qr.name || 'Unnamed QR Code'}</h4>
                    <span class="px-2 py-0.5 text-xs rounded-full ${qr.active === false ? 'bg-gray-200 text-gray-700' : 'bg-green-100 text-green-700'}">
                        ${qr.active === false ? 'Inactive' : 'Active'}
                    </span>
                </div>
            </div>
            <div class="relative w-48 h-48 mb-4">
                <img src="${imageSrc || fallbackImage}" 
                    alt="${qr.name || 'QR Code'}" 
                    onerror="this.onerror=null;this.src='${errorImage}';this.classList.add('opacity-50');"
                    onload="this.classList.remove('opacity-50');"
                    crossorigin="anonymous"
                    referrerpolicy="no-referrer"
                    class="w-full h-full object-contain rounded-lg shadow-md border border-gray-200 bg-white p-2 transition-opacity"
                    loading="lazy">
                ${!imageSrc ? '<div class="absolute inset-0 flex items-center justify-center text-red-500 text-xs font-semibold">Invalid URL</div>' : ''}
            </div>
            <div class="flex flex-wrap gap-2 w-full justify-center">
                <button onclick="window.toggleQRCodeActive('${qr.id}', ${qr.active === false ? 'true' : 'false'})" class="px-4 py-2 text-sm font-medium rounded-lg ${qr.active === false ? 'text-green-600 border border-green-600 hover:bg-green-50' : 'text-yellow-600 border border-yellow-600 hover:bg-yellow-50'} transition">
                    ${qr.active === false ? 'Activate' : 'Deactivate'}
                </button>
                <button onclick="window.deleteQRCode('${qr.id}')" class="px-4 py-2 text-sm font-medium rounded-lg text-red-500 border border-red-500 hover:bg-red-50 transition">
                    Delete
                </button>
            </div>
        </div>
    `;
    }).join('') : '<p class="text-center text-gray-500 py-8">No QR codes added yet. Use the form above to add one!</p>';

    const qrHtml = `
        <div class="space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
            <header class="flex flex-wrap items-center justify-between p-4 bg-white rounded-xl shadow-md border border-gray-100">
                <div class="flex items-center space-x-4">
                    <button class="flex items-center text-pink-600 hover:text-pink-700 transition" data-navigate-dashboard>
                        <i data-lucide="arrow-left" class="w-6 h-6 mr-2"></i>
                        <span class="text-lg font-bold">Back to Dashboard</span>
                    </button>
                    <h1 class="text-2xl font-extrabold text-gray-800">QR Code Management</h1>
                </div>
                <div class="flex gap-4">
                    <div class="text-center">
                        <p class="text-2xl font-bold text-pink-600">${state.qrCodes.length}</p>
                        <p class="text-xs font-medium text-gray-500">Total QR Codes</p>
                    </div>
                </div>
            </header>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div class="lg:col-span-1">${formHtml}</div>
                <div class="lg:col-span-2">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">Current QR Codes (${state.qrCodes.length})</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">${listHtml}</div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = qrHtml;
}

/**
 * Renders the Content Management view.
 * @param {firebase.User} user - The authenticated user object.
 * @returns {string} The HTML for the Content Management view.
*/

//Management Logic & Structure
export function renderManageView(user) {
    let contentHtml = '';
    let tabTitle = '';
    
    //this is for the clearing of the editing form
    if (state.editingDesign !== null && state.currentTab === 'designs' && state.currentPage !== 'editing') {
          state.editingDesign = null;
    }
    
    switch (state.currentTab) {
        case 'designs':
            contentHtml = renderDesignsTab();
            tabTitle = 'Designs Management';
            break;
        case 'promo':
            contentHtml = renderPromoTab();
            tabTitle = 'Promo Management';
            break;
        case 'credentials':
            contentHtml = renderCredentialsTab();
            tabTitle = 'Credentials Management';
            break;
    }

    //the structure of the content management
    return `
        <div class="space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
            <header class="flex flex-wrap items-center justify-between p-4 bg-white rounded-xl shadow-md border border-gray-100">
                <div class="flex items-center space-x-4">
                    <button onclick="window.setPage('dashboard')" class="flex items-center text-pink-600 hover:text-pink-700 transition">
                        <i data-lucide="arrow-left" class="w-6 h-6 mr-2"></i>
                        <span class="text-lg font-bold">Back to Dashboard</span>
                    </button>
                    <h1 class="text-2xl font-extrabold text-gray-800">${tabTitle}</h1>
                </div>
            </header>
            
            <div class="flex bg-white rounded-xl p-2 shadow-sm border border-gray-100">
                <button onclick="window.setTab('designs')" class="tab-button flex-1 text-center py-2 px-4 rounded-lg font-medium ${state.currentTab === 'designs' ? 'bg-pink-600 text-white shadow-md' : 'text-gray-600 hover:bg-pink-50'}">
                    Designs
                </button>
                <button onclick="window.setTab('promo')" class="tab-button flex-1 text-center py-2 px-4 rounded-lg font-medium ${state.currentTab === 'promo' ? 'bg-pink-600 text-white shadow-md' : 'text-gray-600 hover:bg-pink-50'}">
                    Promo
                </button>
                <button onclick="window.setTab('credentials')" class="tab-button flex-1 text-center py-2 px-4 rounded-lg font-medium ${state.currentTab === 'credentials' ? 'bg-pink-600 text-white shadow-md' : 'text-gray-600 hover:bg-pink-50'}">
                    Credentials
                </button>
            </div>
            
            <div class="mt-6">
                ${contentHtml}
            </div>
        </div>
    `;
}

export function renderAppointmentsLayout(container, user, state) {
    const currentTab = state.appointmentsTab || state.currentTab || 'list';
    const statusFilter = state.bookingStatusFilter || 'all';
    const bookings = Array.isArray(state.bookings) ? state.bookings : [];
    const calendarEvents = Array.isArray(state.calendarEvents) ? state.calendarEvents : [];
    const calendarError = state.calendarEventsError;
    const calendarLoading = state.calendarEventsLoading;

    const filteredBookings = bookings
        .filter(booking => {
            if (statusFilter === 'all') return true;
            const normalizedStatus = (booking.status || 'pending').toLowerCase();
            return normalizedStatus === statusFilter;
        })
        .sort((a, b) => {
            const dateA = a.appointmentDate || a.createdAt || 0;
            const dateB = b.appointmentDate || b.createdAt || 0;
            const timeA = dateA instanceof Date ? dateA.getTime() : new Date(dateA).getTime();
            const timeB = dateB instanceof Date ? dateB.getTime() : new Date(dateB).getTime();
            return timeA - timeB;
        });

    const stats = {
        total: bookings.length,
        pending: bookings.filter(b => (b.status || 'pending').toLowerCase() === 'pending').length,
        confirmed: bookings.filter(b => (b.status || 'pending').toLowerCase() === 'confirmed').length,
        completed: bookings.filter(b => (b.status || 'pending').toLowerCase() === 'completed').length,
        calendarEvents: calendarEvents.length
    };

    const statusFiltersHtml = APPOINTMENT_STATUS_FILTERS.map(filterValue => {
        const isActive = statusFilter === filterValue;
        const label = filterValue === 'all' ? 'All' : (APPOINTMENT_STATUS_META[filterValue]?.label || filterValue);
        return `
            <button data-status-filter="${filterValue}" class="flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition border ${isActive ? 'bg-pink-600 text-white shadow-md border-pink-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-pink-50'}">
                ${label}
                ${filterValue === 'all' ? `<span class="ml-2 text-xs text-gray-500">${stats.total}</span>` : ''}
            </button>
        `;
    }).join('');

    const bookingCardsHtml = filteredBookings.length ? filteredBookings.map(booking => {
        const currentStatusKey = (booking.status || 'pending').toLowerCase();
        const statusMeta = APPOINTMENT_STATUS_META[currentStatusKey] || {
            label: booking.status || 'Unknown',
            badgeClasses: 'bg-gray-100 text-gray-600 border border-gray-200',
            dotClasses: 'bg-gray-400'
        };

        const scheduledDate = booking.appointmentDate || booking.selectedDate;
        const createdAt = booking.createdAt ? formatDate(booking.createdAt) : '—';
        const updatedAt = booking.updatedAt ? formatDate(booking.updatedAt) : '—';

        return `
            <article class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-5">
                <header class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div>
                        <div class="flex items-center gap-2">
                            <h3 class="text-lg font-semibold text-gray-900">${booking.clientName || 'Unnamed Client'}</h3>
                        <span class="px-2 py-0.5 text-xs font-semibold rounded-full ${statusMeta.badgeClasses}">
                                <span class="inline-flex w-2 h-2 rounded-full mr-1 ${statusMeta.dotClasses}"></span>
                                ${statusMeta.label}
                            </span>
                        </div>
                        <p class="text-sm text-gray-500">${booking.clientPhone || 'No contact provided'}</p>
                        ${booking.clientEmail ? `<p class="text-xs text-gray-400">${booking.clientEmail}</p>` : ''}
                    </div>
                    <div class="text-right">
                        <p class="text-sm font-medium text-gray-700">${booking.bookingId || booking.id}</p>
                        <p class="text-xs text-gray-400">Created ${createdAt}</p>
                        ${booking.updatedAt ? `<p class="text-xs text-gray-400">Updated ${updatedAt}</p>` : ''}
                    </div>
                </header>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div class="bg-pink-50/60 border border-pink-100 rounded-lg p-3">
                        <p class="text-xs uppercase font-semibold text-pink-500 tracking-wide">Schedule</p>
                        <p class="text-base font-semibold text-gray-900">${formatDate(scheduledDate)}</p>
                        <p class="text-sm text-gray-600">${formatTime(booking.selectedTime)}</p>
                    </div>
                    <div class="bg-gray-50 border border-gray-100 rounded-lg p-3">
                        <p class="text-xs uppercase font-semibold text-gray-400 tracking-wide">Service</p>
                        <p class="text-base font-semibold text-gray-900">${booking.designName || 'General Service'}</p>
                        <p class="text-sm text-gray-600">Source: ${(booking.source || 'Online').toUpperCase()}</p>
                    </div>
                    <div class="bg-gray-50 border border-gray-100 rounded-lg p-3">
                        <p class="text-xs uppercase font-semibold text-gray-400 tracking-wide">Payment</p>
                        <p class="text-base font-semibold text-gray-900">₱${Number(booking.totalAmount || 0).toLocaleString()}</p>
                        <p class="text-sm text-gray-600">Reserved: ₱${Number(booking.amountPaid || 0).toLocaleString()}</p>
                    </div>
                </div>

                ${booking.notes ? `<p class="text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-lg p-3">${booking.notes}</p>` : ''}

                <footer class="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
                    <form class="flex flex-wrap items-center gap-3 appointment-status-form" data-booking-id="${booking.id}">
                        <label class="text-sm font-medium text-gray-700" for="status-${booking.id}">Update Status</label>
                        <select id="status-${booking.id}" name="status" class="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500">
                            ${Object.keys(APPOINTMENT_STATUS_META).map(statusKey => {
                                const isSelected = statusKey === currentStatusKey;
                                // HINDI na sinasama ang 'cancelled' option dito
                                return `<option value="${statusKey}" ${isSelected ? 'selected' : ''}>${APPOINTMENT_STATUS_META[statusKey].label}</option>`;
                            }).join('')}
                        </select>
                        <button type="submit" class="px-4 py-2 bg-pink-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-pink-700 transition">Save</button>
                        <button type="button" onclick="window.deleteBooking('${booking.id}')" class="px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-red-600 transition">Delete</button>
                    </form>
                    <div class="text-xs text-gray-400">
                        <span>Booked via ${booking.platform || booking.source || 'unknown source'}</span>
                    </div>
                </footer>
            </article>
        `;
    }).join('') : `
        <div class="text-center py-12 border border-dashed border-pink-200 rounded-2xl bg-pink-50/40">
            <p class="text-5xl mb-4 opacity-40">📅</p>
            <h3 class="text-lg font-semibold text-gray-700">No Appointments Found</h3>
            <p class="text-sm text-gray-500 mt-2">Try adjusting the filters or add a new walk-in appointment.</p>
        </div>
    `;

// Updated Walk-in Form with strict time slot validation
const walkInFormHtml = `
<form id="walkInForm" class="space-y-4 bg-white border border-gray-100 p-6 rounded-xl shadow-sm">
    <div>
        <h3 class="text-xl font-semibold text-gray-800">Add Walk-in Appointment</h3>
        <p class="text-sm text-gray-500 mt-1">Record quick walk-in bookings and sync to the master list.</p>
    </div>

    <div class="space-y-4">
        <div>
            <label for="clientName" class="block text-sm font-medium text-gray-700">Client Name</label>
            <input type="text" id="clientName" name="clientName" required
                class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-pink-500 focus:ring focus:ring-pink-500 focus:ring-opacity-50 transition duration-150 ease-in-out bg-white">
        </div>

        <div>
            <label for="clientPhone" class="block text-sm font-medium text-gray-700">Contact Number</label>
            <input type="text" id="clientPhone" name="clientPhone" required
                class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-pink-500 focus:ring focus:ring-pink-500 focus:ring-opacity-50 transition duration-150 ease-in-out bg-white">
        </div>

        <div>
            <label for="clientEmail" class="block text-sm font-medium text-gray-700">Email Address</label>
            <input type="email" id="clientEmail" name="clientEmail"
                class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-pink-500 focus:ring focus:ring-pink-500 focus:ring-opacity-50 transition duration-150 ease-in-out bg-white">
        </div>

        <div>
            <label for="designName" class="block text-sm font-medium text-gray-700">Requested Service / Design</label>
            <input type="text" id="designName" name="designName" value="Walk-in Service"
                class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-pink-500 focus:ring focus:ring-pink-500 focus:ring-opacity-50 transition duration-150 ease-in-out bg-white">
        </div>

        <div>
            <label for="selectedDate" class="block text-sm font-medium text-gray-700">Appointment Date</label>
            <input type="date" id="selectedDate" name="selectedDate" required
                class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-pink-500 focus:ring focus:ring-pink-500 focus:ring-opacity-50 transition duration-150 ease-in-out bg-white"
                onchange="window.updateTimeOptions(this.value)">
        </div>

        <div>
            <label for="selectedTime" class="block text-sm font-medium text-gray-700">Appointment Time</label>
            ${window.createHourlyTimeInput('selectedTime', '', new Date().toISOString().split('T')[0])}
        </div>

        <div>
            <label for="totalAmount" class="block text-sm font-medium text-gray-700">Estimated Total (₱)</label>
            <input type="number" id="totalAmount" name="totalAmount"
                class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-pink-500 focus:ring focus:ring-pink-500 focus:ring-opacity-50 transition duration-150 ease-in-out bg-white">
        </div>

        <div>
            <label for="paymentMethod" class="block text-sm font-medium text-gray-700">Payment Method</label>
            <select id="paymentMethod" name="paymentMethod" class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-pink-500 focus:ring focus:ring-pink-500 focus:ring-opacity-50 transition duration-150 ease-in-out bg-white">
                <option value="cash">Cash</option>
                <option value="gcash">GCash</option>
                <option value="card">Card</option>
            </select>
        </div>

        <div>
            <label for="notes" class="block text-sm font-medium text-gray-700">Notes</label>
            <textarea id="notes" name="notes" rows="3" class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-pink-500 focus:ring focus:ring-pink-500 focus:ring-opacity-50 transition duration-150 ease-in-out bg-white" placeholder="Optional instructions"></textarea>
        </div>
    </div>

    <button type="submit" class="w-full flex items-center justify-center px-4 py-3 text-sm font-semibold rounded-lg shadow-sm text-white bg-pink-600 hover:bg-pink-700 transition duration-150">
        Save Walk-in Booking
    </button>
</form>
`;

    const calendarEventsHtml = calendarEvents.length ? calendarEvents.map(event => {
        const startValue = event.start?.dateTime || event.start?.date;
        const endValue = event.end?.dateTime || event.end?.date;
        const startDate = startValue ? new Date(startValue) : null;
        const endDate = endValue ? new Date(endValue) : null;

        const dateLabel = startDate ? formatDate(startDate) : 'No date';
        const isAllDay = !!event.start?.date;
        const timeLabel = isAllDay ? 'All-day' : `${formatTime(startValue)}${endValue ? ` – ${formatTime(endValue)}` : ''}`;

        const description = event.description ? event.description.replace(/\n/g, '<br>') : '';
        const attendees = Array.isArray(event.attendees) ? event.attendees.map(att => att.email).filter(Boolean) : [];

        return `
            <article class="border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition">
                <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <p class="text-xs uppercase font-semibold text-pink-500 tracking-wide">${dateLabel}</p>
                        <h4 class="text-lg font-semibold text-gray-900">${event.summary || 'Untitled Event'}</h4>
                        <p class="text-sm text-gray-600">${timeLabel}</p>
                    </div>
                    <div class="flex items-center gap-2">
                        ${event.htmlLink ? `<button type="button" class="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg border border-pink-200 text-pink-600 hover:bg-pink-50 transition" data-open-calendar-event="${event.htmlLink}">
                            <i data-lucide="external-link" class="w-4 h-4"></i>
                            Open in Calendar
                        </button>` : ''}
                    </div>
                </header>
                <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-gray-50 border border-gray-100 rounded-lg p-4">
                        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Location</p>
                        <p class="text-sm font-medium text-gray-800">${event.location || 'Not specified'}</p>
                    </div>
                    <div class="bg-gray-50 border border-gray-100 rounded-lg p-4">
                        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Created / Updated</p>
                        <p class="text-xs text-gray-600">Created: ${event.created ? formatDate(event.created) : '—'}</p>
                        <p class="text-xs text-gray-600">Updated: ${event.updated ? formatDate(event.updated) : '—'}</p>
                    </div>
                </div>
                ${description ? `<p class="mt-3 text-sm text-gray-600 leading-relaxed">${description}</p>` : ''}
                ${attendees.length ? `<div class="mt-3 text-xs text-gray-500">Attendees: ${attendees.join(', ')}</div>` : ''}
            </article>
        `;
    }).join('') : calendarError ? `
        <div class="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
            <i data-lucide="alert-triangle" class="w-5 h-5 flex-shrink-0 mt-0.5"></i>
            <div>
                <p class="text-sm font-semibold">Calendar Sync Warning</p>
                <p class="text-sm">${calendarError}</p>
                <p class="text-xs text-amber-600 mt-1">Deploy the cloud function and ensure the service account has access, then press Refresh.</p>
            </div>
        </div>
    ` : calendarLoading ? `
        <div class="flex justify-center py-12">
            <div class="flex items-center gap-2 text-pink-600">
                <svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M4 12a8 8 0 0 1 8-8"></path></svg>
                <span class="text-sm font-semibold">Loading Google Calendar events…</span>
            </div>
        </div>
    ` : `
        <div class="text-center py-12 border border-dashed border-pink-200 rounded-2xl bg-pink-50/40">
            <p class="text-5xl mb-4 opacity-40">🗓️</p>
            <h3 class="text-lg font-semibold text-gray-700">No Google Calendar Events Found</h3>
            <p class="text-sm text-gray-500 mt-2">Try refreshing or check your calendar setup.</p>
        </div>
    `;

    let mainContentHtml = '';
    if (currentTab === 'walk-in') {
        mainContentHtml = `
            <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div class="xl:col-span-2 space-y-6">
                    <div class="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                        <h3 class="text-lg font-semibold text-gray-800 mb-4">Recent Appointments</h3>
                        <div class="space-y-4 max-h-[28rem] overflow-y-auto pr-1 custom-scroll">${bookingCardsHtml}</div>
                    </div>
                </div>
                <div class="space-y-6">
                    ${walkInFormHtml}
                </div>
            </div>
        `;
    } else if (currentTab === 'calendar') {
        // Import calendar view functions
        let firestoreCalendarHtml = '';
        try {
            // Dynamically import and render Firestore calendar view
            if (typeof renderAppointmentCalendar === 'function') {
                const currentMonth = window.currentCalendarMonth || new Date();
                firestoreCalendarHtml = renderAppointmentCalendar(bookings, currentMonth);
            } else {
                // Fallback: Load the module
                firestoreCalendarHtml = `
                    <div class="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
                        <div class="text-center py-8">
                            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
                            <p class="text-gray-600">Loading calendar view...</p>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error rendering Firestore calendar:', error);
            firestoreCalendarHtml = `
                <div class="bg-white border border-red-200 rounded-xl shadow-sm p-6">
                    <p class="text-red-600">Error loading calendar view. Please refresh the page.</p>
                </div>
            `;
        }
        
        // Remove duplicate embedded Google Calendar to avoid showing a second calendar without slot times
        const calendarEmbedSectionHtml = '';
        mainContentHtml = `
            <div class="space-y-6">
                <div id="firestore-calendar-container">
                    ${firestoreCalendarHtml}
                </div>
                <section class="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                    <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h3 class="text-lg font-semibold text-gray-800">Google Calendar Sync</h3>
                            <p class="text-sm text-gray-500">Events created via automatic sync or directly in Google Calendar.</p>
                        </div>
                        <div class="flex flex-wrap items-center gap-2">
                            <button type="button" data-refresh-calendar class="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg border border-pink-200 text-pink-600 hover:bg-pink-50 transition">
                                <i data-lucide="refresh-cw" class="w-4 h-4"></i>
                                Refresh
                            </button>
                            <a href="https://calendar.google.com/calendar/u/0/r" target="_blank" rel="noopener" class="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg bg-pink-600 text-white hover:bg-pink-700 transition">
                                <i data-lucide="calendar" class="w-4 h-4"></i>
                                Open Google Calendar
                            </a>
                        </div>
                    </div>
                    <div class="mt-6 space-y-4">${calendarEventsHtml}</div>
                </section>
            </div>
        `;
    } else {
        mainContentHtml = `
            <div class="space-y-6">
                <section class="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <h3 class="text-lg font-semibold text-gray-800">Appointments (${filteredBookings.length})</h3>
                        <div class="grid grid-cols-2 md:flex md:flex-row gap-2 w-full md:w-auto">
                            ${statusFiltersHtml}
                        </div>
                    </div>
                    <div class="mt-6 space-y-4">${bookingCardsHtml}</div>
                </section>
            </div>
        `;
    }

    const appointmentsHtml = `
        <div class="space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
            <header class="flex flex-wrap items-center justify-between p-4 bg-white rounded-xl shadow-md border border-gray-100">
                <div class="flex items-center space-x-4">
                    <button class="flex items-center text-pink-600 hover:text-pink-700 transition" data-navigate-dashboard>
                        <i data-lucide="arrow-left" class="w-6 h-6 mr-2"></i>
                        <span class="text-lg font-bold">Back to Dashboard</span>
                    </button>
                    <h1 class="text-2xl font-extrabold text-gray-800">Appointments Management</h1>
                </div>
                <div class="flex gap-4">
                    <div class="text-center">
                        <p class="text-2xl font-bold text-pink-600">${stats.total}</p>
                        <p class="text-xs font-medium text-gray-500">Total</p>
                    </div>
                    <div class="text-center">
                        <p class="text-2xl font-bold text-amber-500">${stats.pending}</p>
                        <p class="text-xs font-medium text-gray-500">Pending</p>
                    </div>
                    <div class="text-center">
                        <p class="text-2xl font-bold text-emerald-500">${stats.confirmed}</p>
                        <p class="text-xs font-medium text-gray-500">Confirmed</p>
                    </div>
                    <div class="text-center">
                        <p class="text-2xl font-bold text-sky-500">${stats.completed}</p>
                        <p class="text-xs font-medium text-gray-500">Completed</p>
                    </div>
                    <div class="text-center hidden sm:block">
                        <p class="text-2xl font-bold text-purple-500">${stats.calendarEvents}</p>
                        <p class="text-xs font-medium text-gray-500">Calendar Events</p>
                    </div>
                </div>
            </header>

            <nav class="flex bg-white rounded-xl p-2 shadow-sm border border-gray-100">
                ${['list', 'walk-in', 'calendar'].map(tab => {
                    const isActive = currentTab === tab;
                    const label = tab === 'list' ? 'Appointments' : tab === 'walk-in' ? 'Walk-in' : 'Calendar';
                    return `<button data-appointments-tab="${tab}" class="flex-1 text-center py-2 px-4 rounded-lg font-medium ${isActive ? 'bg-pink-600 text-white shadow-md' : 'text-gray-600 hover:bg-pink-50'}">${label}</button>`;
                }).join('')}
            </nav>

            <div class="mt-6">
                ${mainContentHtml}
            </div>
        </div>
    `;

    container.innerHTML = appointmentsHtml;
    
    // Initialize calendar view and real-time listeners if on calendar tab
    if (currentTab === 'calendar') {
        // Store appointments globally for time slot modal
        window.currentAppointments = bookings;
        
        // Set up walk-in booking handler
        window.onBookWalkIn = async function(date, time) {
            // Import Swal if available, otherwise use prompt
            if (typeof Swal !== 'undefined') {
                const { value: formValues } = await Swal.fire({
                    title: 'Walk-in Appointment',
                    html: `
                        <div class="text-left space-y-4">
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-1">Date</label>
                                <input id="walkInDate" class="swal2-input" value="${date}" readonly>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-1">Time</label>
                                <input id="walkInTime" class="swal2-input" value="${time}" readonly>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-1">Client Name *</label>
                                <input id="walkInName" class="swal2-input" placeholder="Enter client name" required>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-1">Phone Number *</label>
                                <input id="walkInPhone" class="swal2-input" placeholder="Enter phone number" required>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-1">Email (Optional)</label>
                                <input id="walkInEmail" class="swal2-input" type="email" placeholder="Enter email">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-1">Design/Service</label>
                                <input id="walkInDesign" class="swal2-input" value="Walk-in Service" placeholder="Service name">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-1">Total Amount (₱)</label>
                                <input id="walkInAmount" class="swal2-input" type="number" placeholder="0.00" value="0">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-1">Notes (Optional)</label>
                                <textarea id="walkInNotes" class="swal2-textarea" placeholder="Additional notes"></textarea>
                            </div>
                        </div>
                    `,
                    focusConfirm: false,
                    showCancelButton: true,
                    confirmButtonText: 'Create Walk-in',
                    confirmButtonColor: '#ec4899',
                    cancelButtonText: 'Cancel',
                    preConfirm: () => {
                        return {
                            selectedDate: document.getElementById('walkInDate').value,
                            selectedTime: document.getElementById('walkInTime').value,
                            clientName: document.getElementById('walkInName').value,
                            clientPhone: document.getElementById('walkInPhone').value,
                            clientEmail: document.getElementById('walkInEmail').value || '',
                            designName: document.getElementById('walkInDesign').value || 'Walk-in Service',
                            totalAmount: parseFloat(document.getElementById('walkInAmount').value) || 0,
                            notes: document.getElementById('walkInNotes').value || '',
                            paymentMethod: 'cash'
                        };
                    },
                    didOpen: () => {
                        // Make inputs readonly for date/time
                        document.getElementById('walkInDate').readOnly = true;
                        document.getElementById('walkInTime').readOnly = true;
                    }
                });
                
                if (formValues) {
                    // Import createWalkInBooking function
                    const { createWalkInBooking } = await import('./auth-logic.js');
                    await createWalkInBooking(formValues);
                    
                    // Refresh appointments after creating walk-in
                    if (window.refreshAppointments) {
                        window.refreshAppointments();
                    }
                }
            } else {
                // Fallback to simple prompt
                const clientName = prompt('Enter client name:');
                if (clientName) {
                    const clientPhone = prompt('Enter phone number:');
                    if (clientPhone) {
                        // Redirect to walk-in form with pre-filled data
                        window.location.href = `#appointments?tab=walk-in&date=${date}&time=${encodeURIComponent(time)}&name=${encodeURIComponent(clientName)}&phone=${encodeURIComponent(clientPhone)}`;
                    }
                }
            }
        };
        
        // Dynamically import and initialize calendar view
        import('./appointment-calendar-view.js').then(({ renderAppointmentCalendar, attachCalendarListeners }) => {
            const currentMonth = window.currentCalendarMonth || new Date();
            const calendarContainer = document.getElementById('firestore-calendar-container');
            
            if (calendarContainer) {
                // Initial render
                const calendarHtml = renderAppointmentCalendar(bookings, currentMonth);
                calendarContainer.innerHTML = calendarHtml;
                
                // Attach navigation listeners
                const updateCalendar = (newMonth) => {
                    window.currentCalendarMonth = newMonth;
                    // Refresh appointments before re-rendering
                    if (state && state.bookings) {
                        window.currentAppointments = state.bookings;
                    }
                    const updatedHtml = renderAppointmentCalendar(window.currentAppointments || bookings, newMonth);
                    calendarContainer.innerHTML = updatedHtml;
                    attachCalendarListeners(updateCalendar);
                };
                attachCalendarListeners(updateCalendar);
            }
        }).catch(error => {
            console.error('Error loading calendar view:', error);
        });
        
        // Setup real-time listeners for instant updates
        import('./realtime-appointments.js').then(({ setupRealtimeAppointments }) => {
            const refreshCalendarView = () => {
                if (currentTab === 'calendar') {
                    import('./appointment-calendar-view.js').then(({ renderAppointmentCalendar, attachCalendarListeners }) => {
                        const currentMonth = window.currentCalendarMonth || new Date();
                        const calendarContainer = document.getElementById('firestore-calendar-container');
                        if (calendarContainer) {
                            // Get updated appointments
                            const updatedBookings = window.currentAppointments || bookings;
                            const updatedHtml = renderAppointmentCalendar(updatedBookings, currentMonth);
                            calendarContainer.innerHTML = updatedHtml;
                            
                            // Re-attach listeners
                            const updateCalendar = (newMonth) => {
                                window.currentCalendarMonth = newMonth;
                                if (state && state.bookings) {
                                    window.currentAppointments = state.bookings;
                                }
                                const newHtml = renderAppointmentCalendar(window.currentAppointments || bookings, newMonth);
                                calendarContainer.innerHTML = newHtml;
                                attachCalendarListeners(updateCalendar);
                            };
                            attachCalendarListeners(updateCalendar);
                        }
                    });
                }
            };
            
            setupRealtimeAppointments(
                async (newAppointment) => {
                    // Appointment added - update appointments list and refresh calendar
                    if (window.currentAppointments) {
                        window.currentAppointments.push(newAppointment);
                    } else {
                        // Refresh from Firestore if not available
                        const { getCurrentAppointments } = await import('./realtime-appointments.js');
                        window.currentAppointments = await getCurrentAppointments();
                    }
                    refreshCalendarView();
                    
                    // Also refresh the main state if available
                    if (state && state.bookings) {
                        state.bookings.push(newAppointment);
                    }
                },
                async (updatedAppointment) => {
                    // Appointment updated - update in list and refresh calendar
                    if (window.currentAppointments) {
                        const index = window.currentAppointments.findIndex(apt => apt.id === updatedAppointment.id);
                        if (index !== -1) {
                            window.currentAppointments[index] = updatedAppointment;
                        }
                    } else {
                        // Refresh from Firestore if not available
                        const { getCurrentAppointments } = await import('./realtime-appointments.js');
                        window.currentAppointments = await getCurrentAppointments();
                    }
                    refreshCalendarView();
                    
                    // Also update the main state if available
                    if (state && state.bookings) {
                        const index = state.bookings.findIndex(apt => apt.id === updatedAppointment.id);
                        if (index !== -1) {
                            state.bookings[index] = updatedAppointment;
                        }
                    }
                },
                async (removedAppointment) => {
                    // Appointment removed - remove from list and refresh calendar
                    if (window.currentAppointments) {
                        window.currentAppointments = window.currentAppointments.filter(apt => apt.id !== removedAppointment.id);
                    } else {
                        // Refresh from Firestore if not available
                        const { getCurrentAppointments } = await import('./realtime-appointments.js');
                        window.currentAppointments = await getCurrentAppointments();
                    }
                    refreshCalendarView();
                    
                    // Also update the main state if available
                    if (state && state.bookings) {
                        state.bookings = state.bookings.filter(apt => apt.id !== removedAppointment.id);
                    }
                }
            );
        }).catch(error => {
            console.error('Error setting up real-time listeners:', error);
        });
    }
    
    // Initialize time inputs after rendering
    setTimeout(() => {
        if (typeof window.initializeTimeInputs === 'function') {
            window.initializeTimeInputs();
        }
        // Set initial date to today and update time options
        const dateInput = document.getElementById('selectedDate');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
            dateInput.min = today; // Prevent selecting past dates
            window.updateTimeOptions(today);
        }
    }, 100);
}

export function renderReceiptsLayout(container, user, state) {
    const bookings = Array.isArray(state.bookings) ? state.bookings : [];
    
    // Filter bookings that have receipts (check for receiptUrl, receiptImageUrl, or receiptUploaded)
    const bookingsWithReceipts = bookings.filter(booking => {
        return booking.receiptUrl || booking.receiptImageUrl || booking.receiptUploaded === true || booking.receipt;
    });

    // Sort by creation date (newest first)
    const sortedReceipts = bookingsWithReceipts.sort((a, b) => {
        const dateA = a.createdAt || a.appointmentDate || 0;
        const dateB = b.createdAt || b.appointmentDate || 0;
        const timeA = dateA instanceof Date ? dateA.getTime() : new Date(dateA).getTime();
        const timeB = dateB instanceof Date ? dateB.getTime() : new Date(dateB).getTime();
        return timeB - timeA; // Newest first
    });

    const stats = {
        total: sortedReceipts.length,
        pending: sortedReceipts.filter(b => (b.status || 'pending').toLowerCase() === 'pending').length,
        confirmed: sortedReceipts.filter(b => (b.status || 'pending').toLowerCase() === 'confirmed').length,
        completed: sortedReceipts.filter(b => (b.status || 'pending').toLowerCase() === 'completed').length
    };

    const receiptCardsHtml = sortedReceipts.length > 0 ? sortedReceipts.map(booking => {
        const currentStatusKey = (booking.status || 'pending').toLowerCase();
        const statusMeta = APPOINTMENT_STATUS_META[currentStatusKey] || {
            label: booking.status || 'Unknown',
            badgeClasses: 'bg-gray-100 text-gray-600 border border-gray-200',
            dotClasses: 'bg-gray-400'
        };

        const scheduledDate = booking.appointmentDate || booking.selectedDate;
        const createdAt = booking.createdAt ? formatDate(booking.createdAt) : '—';
        const receiptUrl = booking.receiptUrl || booking.receiptImageUrl || booking.receipt || null;
        const receiptImageUrl = receiptUrl || (booking.receiptUploaded ? 'https://via.placeholder.com/300x200?text=Receipt+Uploaded' : null);

        return `
            <article class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-5">
                <header class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div>
                        <div class="flex items-center gap-2">
                            <h3 class="text-lg font-semibold text-gray-900">${booking.clientName || 'Unnamed Client'}</h3>
                            <span class="px-2 py-0.5 text-xs font-semibold rounded-full ${statusMeta.badgeClasses}">
                                <span class="inline-flex w-2 h-2 rounded-full mr-1 ${statusMeta.dotClasses}"></span>
                                ${statusMeta.label}
                            </span>
                        </div>
                        <p class="text-sm text-gray-500">${booking.clientPhone || 'No contact provided'}</p>
                        ${booking.clientEmail ? `<p class="text-xs text-gray-400">${booking.clientEmail}</p>` : ''}
                    </div>
                    <div class="text-right">
                        <p class="text-sm font-medium text-gray-700">${booking.bookingId || booking.id}</p>
                        <p class="text-xs text-gray-400">Created ${createdAt}</p>
                    </div>
                </header>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div class="bg-pink-50/60 border border-pink-100 rounded-lg p-3">
                        <p class="text-xs uppercase font-semibold text-pink-500 tracking-wide">Schedule</p>
                        <p class="text-base font-semibold text-gray-900">${formatDate(scheduledDate)}</p>
                        <p class="text-sm text-gray-600">${formatTime(booking.selectedTime)}</p>
                    </div>
                    <div class="bg-gray-50 border border-gray-100 rounded-lg p-3">
                        <p class="text-xs uppercase font-semibold text-gray-400 tracking-wide">Service</p>
                        <p class="text-base font-semibold text-gray-900">${booking.designName || 'General Service'}</p>
                        <p class="text-sm text-gray-600">Source: ${(booking.source || 'Online').toUpperCase()}</p>
                    </div>
                    <div class="bg-gray-50 border border-gray-100 rounded-lg p-3">
                        <p class="text-xs uppercase font-semibold text-gray-400 tracking-wide">Payment</p>
                        <p class="text-base font-semibold text-gray-900">₱${Number(booking.totalAmount || 0).toLocaleString()}</p>
                        <p class="text-sm text-gray-600">Reserved: ₱${Number(booking.amountPaid || 0).toLocaleString()}</p>
                    </div>
                </div>

                ${receiptImageUrl ? `
                    <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <p class="text-sm font-semibold text-gray-700 mb-3">Payment Receipt</p>
                        <div class="relative">
                            <img src="${receiptImageUrl}" 
                                alt="Receipt for ${booking.clientName || 'Client'}" 
                                onerror="this.onerror=null;this.src='https://via.placeholder.com/400x300?text=Receipt+Not+Available';"
                                class="w-full h-auto max-h-96 object-contain rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition"
                                onclick="window.openReceiptImage('${receiptImageUrl}', '${booking.clientName || 'Client'}')">
                            <div class="absolute top-2 right-2 bg-white rounded-full p-2 shadow-md">
                                <i data-lucide="expand" class="w-4 h-4 text-gray-600"></i>
                            </div>
                        </div>
                        <button onclick="window.openReceiptImage('${receiptImageUrl}', '${booking.clientName || 'Client'}')" 
                                class="mt-3 w-full px-4 py-2 bg-pink-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-pink-700 transition">
                            View Full Receipt
                        </button>
                    </div>
                ` : `
                    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p class="text-sm text-yellow-800">⚠️ Receipt image not available. Client may have uploaded but image URL was not saved.</p>
                    </div>
                `}

                ${booking.notes ? `<p class="text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-lg p-3">${booking.notes}</p>` : ''}

                <footer class="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
                    <form class="flex flex-wrap items-center gap-3 appointment-status-form" data-booking-id="${booking.id}">
                        <label class="text-sm font-medium text-gray-700" for="status-${booking.id}">Update Status</label>
                        <select id="status-${booking.id}" name="status" class="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500">
                            ${Object.keys(APPOINTMENT_STATUS_META).filter(statusKey => statusKey !== 'completed').map(statusKey => {
                                const isSelected = statusKey === currentStatusKey;
                                return `<option value="${statusKey}" ${isSelected ? 'selected' : ''}>${APPOINTMENT_STATUS_META[statusKey].label}</option>`;
                            }).join('')}
                        </select>
                        <button type="submit" class="px-4 py-2 bg-pink-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-pink-700 transition">Save</button>
                        <button type="button" onclick="window.deleteBooking('${booking.id}')" class="px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-red-600 transition">Delete</button>
                    </form>
                    <div class="text-xs text-gray-400">
                        <span>Booked via ${booking.platform || booking.source || 'unknown source'}</span>
                    </div>
                </footer>
            </article>
        `;
    }).join('') : `
        <div class="text-center py-12 border border-dashed border-pink-200 rounded-2xl bg-pink-50/40">
            <p class="text-5xl mb-4 opacity-40">🧾</p>
            <h3 class="text-lg font-semibold text-gray-700">No Receipts Found</h3>
            <p class="text-sm text-gray-500 mt-2">No receipts have been submitted by clients yet.</p>
        </div>
    `;

    const receiptsHtml = `
        <div class="space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
            <header class="flex flex-wrap items-center justify-between p-4 bg-white rounded-xl shadow-md border border-gray-100">
                <div class="flex items-center space-x-4">
                    <button class="flex items-center text-pink-600 hover:text-pink-700 transition" data-navigate-dashboard>
                        <i data-lucide="arrow-left" class="w-6 h-6 mr-2"></i>
                        <span class="text-lg font-bold">Back to Dashboard</span>
                    </button>
                    <h1 class="text-2xl font-extrabold text-gray-800">Receipts Management</h1>
                </div>
                <div class="flex gap-4">
                    <div class="text-center">
                        <p class="text-2xl font-bold text-pink-600">${stats.total}</p>
                        <p class="text-xs font-medium text-gray-500">Total Receipts</p>
                    </div>
                    <div class="text-center">
                        <p class="text-2xl font-bold text-amber-500">${stats.pending}</p>
                        <p class="text-xs font-medium text-gray-500">Pending</p>
                    </div>
                    <div class="text-center">
                        <p class="text-2xl font-bold text-emerald-500">${stats.confirmed}</p>
                        <p class="text-xs font-medium text-gray-500">Confirmed</p>
                    </div>
                </div>
            </header>

            <div class="mt-6">
                <section class="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                        <h3 class="text-lg font-semibold text-gray-800">All Receipts (${sortedReceipts.length})</h3>
                    </div>
                    <div class="space-y-4">${receiptCardsHtml}</div>
                </section>
            </div>
        </div>
    `;

    container.innerHTML = receiptsHtml;
}

export function attachReceiptsListeners() {
    const navigate = typeof window.setPage === 'function' ? window.setPage : null;
    const updateBookingStatus = typeof window.updateBookingStatus === 'function' ? window.updateBookingStatus : null;

    document.querySelector('[data-navigate-dashboard]')?.addEventListener('click', () => {
        navigate?.('dashboard');
    });

    document.querySelectorAll('.appointment-status-form').forEach(form => {
        form.addEventListener('submit', event => {
            event.preventDefault();
            const bookingId = form.getAttribute('data-booking-id');
            const statusSelect = form.querySelector('select[name="status"]');
            if (bookingId && statusSelect) {
                updateBookingStatus?.(bookingId, statusSelect.value);
            }
        });
    });
}

export function attachQRListeners() {
    const navigate = typeof window.setPage === 'function' ? window.setPage : null;

    document.querySelector('[data-navigate-dashboard]')?.addEventListener('click', () => {
        navigate?.('dashboard');
    });

    // QR Form Listener
    const qrForm = document.getElementById('qr-form');
    const qrImageFileInput = document.getElementById('qr-imageFile');
    const activeCheckbox = document.getElementById('qr-active');
    let selectedImageDataUrl = null;
    let selectedFilename = null;
    
    // Preview on file select
    if (qrImageFileInput) {
        qrImageFileInput.addEventListener('change', () => {
            const file = qrImageFileInput.files && qrImageFileInput.files[0];
            selectedImageDataUrl = null;
            selectedFilename = null;
            if (!file) return;

            if (file.size > 5 * 1024 * 1024) {
                Swal.fire({
                    icon: 'warning',
                    title: 'File Too Large',
                    text: 'Please upload an image smaller than 5 MB.'
                });
                qrImageFileInput.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                selectedImageDataUrl = e.target.result;
                selectedFilename = file.name;
            };
            reader.readAsDataURL(file);
        });
    }
    
    if (qrForm) {
        qrForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const form = e.target;
            const id = document.getElementById('qr-id').value;
            const name = document.getElementById('qr-name').value.trim();
            const active = activeCheckbox ? activeCheckbox.checked : true;

            if (!name) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Missing QR Name',
                    text: 'Please provide a name for this QR code (e.g., GCash, PayMaya).'
                });
                return;
            }

            if (!selectedImageDataUrl) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Missing Image',
                    text: 'Please upload a QR image.'
                });
                return;
            }

            if (typeof window.saveQRCode === 'function') {
                window.saveQRCode(id, { 
                    name, 
                    imageDataUrl: selectedImageDataUrl, 
                    originalFilename: selectedFilename,
                    active 
                }).then(() => {
                    form.reset();
                    document.getElementById('qr-id').value = '';
                    selectedImageDataUrl = null;
                    selectedFilename = null;
                    if (qrImageFileInput) {
                        qrImageFileInput.value = '';
                    }
                    if (activeCheckbox) {
                        activeCheckbox.checked = true;
                    }
                }).catch(err => {
                    console.error('QR save failed:', err);
                    Swal.fire({
                        icon: 'error',
                        title: 'Save Failed',
                        text: err?.message || 'Could not save QR code. Please try again.'
                    });
                });
            }
        });
    }
}

// Global function to open receipt image in modal/lightbox
window.openReceiptImage = function(imageUrl, clientName) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75';
    modal.innerHTML = `
        <div class="relative max-w-4xl max-h-[90vh] p-4">
            <button onclick="this.closest('.fixed').remove()" class="absolute top-4 right-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition z-10">
                <i data-lucide="x" class="w-6 h-6 text-gray-700"></i>
            </button>
            <img src="${imageUrl}" alt="Receipt for ${clientName}" class="max-w-full max-h-[90vh] object-contain rounded-lg">
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
};

export function attachAppointmentsListeners() {
    const navigate = typeof window.setPage === 'function' ? window.setPage : null;
    const setTab = typeof window.setAppointmentsTab === 'function' ? window.setAppointmentsTab : null;
    const setStatusFilter = typeof window.setBookingStatusFilter === 'function' ? window.setBookingStatusFilter : null;
    const updateBookingStatus = typeof window.updateBookingStatus === 'function' ? window.updateBookingStatus : null;
    const createWalkInBooking = typeof window.createWalkInBooking === 'function' ? window.createWalkInBooking : null;

    document.querySelector('[data-navigate-dashboard]')?.addEventListener('click', () => {
        navigate?.('dashboard');
    });

    document.querySelectorAll('[data-appointments-tab]').forEach(button => {
        button.addEventListener('click', () => {
            const tabValue = button.getAttribute('data-appointments-tab');
            if (setTab) {
                setTab(tabValue);
            } else {
                navigate?.('appointments', tabValue);
            }
        });
    });

    document.querySelectorAll('[data-status-filter]').forEach(button => {
        button.addEventListener('click', () => {
            const filterValue = button.getAttribute('data-status-filter');
            setStatusFilter?.(filterValue);
        });
    });

    document.querySelectorAll('.appointment-status-form').forEach(form => {
        form.addEventListener('submit', event => {
            event.preventDefault();
            const bookingId = form.getAttribute('data-booking-id');
            const statusSelect = form.querySelector('select[name="status"]');
            if (bookingId && statusSelect) {
                updateBookingStatus?.(bookingId, statusSelect.value);
            }
        });
    });

    const walkInForm = document.getElementById('walkInForm');
    if (walkInForm) {
        walkInForm.addEventListener('submit', event => {
            event.preventDefault();
            const formData = new FormData(walkInForm);
            const payload = Object.fromEntries(formData.entries());
            
            // Validate time is one of the allowed slots for the selected date (weekday/weekend)
            const allowedTimeSlots = getTimeSlotsForDateAdmin(payload.selectedDate);
            if (!allowedTimeSlots.includes(payload.selectedTime)) {
                // Format date to show weekday/weekend info
                const [year, month, day] = payload.selectedDate.split('-').map(Number);
                const dateObj = new Date(year, month - 1, day);
                const dayOfWeek = dateObj.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const timeSlotsText = isWeekend 
                    ? '8:00 AM, 10:00 AM, 1:00 PM, 3:00 PM, 5:00 PM, 7:00 PM'
                    : '8:00 AM, 12:00 PM, 4:00 PM, 6:00 PM, 8:00 PM';
                alert(`Please select one of the available time slots for this date: ${timeSlotsText}`);
                return;
            }
            
            createWalkInBooking?.(payload);
            walkInForm.reset();
        });
    }

    document.querySelector('[data-refresh-calendar]')?.addEventListener('click', async () => {
        if (typeof window.refreshCalendarEvents === 'function') {
            await window.refreshCalendarEvents(true);
        }
        // Also trigger availability sync from Google Calendar so homepage reflects admin calendar slots
        try {
            await fetch('https://us-central1-nailease25.cloudfunctions.net/syncAvailabilityFromCalendar', {
                method: 'POST'
            });
        } catch (e) {
            console.warn('Availability sync request failed (non-blocking):', e);
        }
    });

    document.querySelectorAll('[data-open-calendar-event]').forEach(button => {
        button.addEventListener('click', () => {
            const link = button.getAttribute('data-open-calendar-event');
            if (link) {
                window.open(link, '_blank', 'noopener,noreferrer');
            }
        });
    });
    
    // Initialize time inputs when appointments page loads
    setTimeout(() => {
        if (typeof window.initializeTimeInputs === 'function') {
            window.initializeTimeInputs();
        }
    }, 100);
}

export function renderAdminLayout(container, user) {
    const adminName = user.displayName || 'Admin';
    const adminEmail = user.email || 'No Email';
    const avatarLetter = adminName.charAt(0).toUpperCase();

    const adminHTML = `
    <div class="min-h-screen bg-pink-50/50">
        <div class="min-h-screen bg-pink-50/50 overflow-x-hidden" style="width: 100vw; position: relative; left: 50%; transform: translateX(-50%);">
        <header class="sticky top-0 bg-white shadow-lg z-50">
            <div class="w-full px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center max-w-7xl mx-auto">
                <a href="home.html" class="shadow-sm hover:shadow-md transition">
                    <img src="logo.png" alt="D'UR LASHNAILS BY DES" class="h-16 shadow-sm">
                </a>

                <div class="hidden sm:flex space-x-4 items-center">
                    <a href="homepage.html" class="text-gray-600 hover:text-pink-600 transition duration-150">Home</a>
                        
                    <a href="/portfolio.html" class="text-gray-600 hover:text-pink-600 transition duration-150">Design Portfolio</a>
                    <a href="#" class="text-gray-600 hover:text-pink-600 transition duration-150">Reports</a>

                        <a href="index.html" class="text-pink-600 border border-pink-600 px-3 py-1 rounded-lg hover:bg-pink-50 transition duration-150">My Dashboard</a> 

                    <button id="logoutBtn" class="text-gray-600 hover:text-pink-600 transition duration-150">Log Out</button>
                </div>
            </div>
        </header>

        <div class="text-center py-8 bg-white border-b border-gray-100">
            <h1 class="text-3xl sm:text-4xl font-extrabold text-gray-800">Admin Dashboard</h1>
            <p class="text-sm text-gray-500 mt-1">Manage operations, clients, and content</p>
        </div>
        
        <div class="max-w-7xl mx-auto w-full p-4 md:p-8"> 
            <div class="w-full px-0 mx-0">
                <div class="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-8 border border-gray-200">
                    <div class="flex flex-col md:flex-row justify-between items-start md:items-center">
                        <div class="flex items-center mb-6 md:mb-0">
                            <div id="adminAvatar" class="w-16 h-16 rounded-full bg-pink-600 text-white flex items-center justify-center text-xl font-semibold shadow-md mr-4 ring-4 ring-pink-600/20">${avatarLetter}</div>
                            <div>
                                <h2 id="adminName" class="text-xl font-bold text-gray-900">${adminName}</h2>
                                <p id="adminEmail" class="text-sm text-gray-500 mb-2">${adminEmail}</p>
                                <div class="inline-flex items-center gap-2 bg-pink-100 text-pink-700 text-xs font-medium px-3 py-1 rounded-full">
                                    <span>👑</span>
                                    <span>Super Admin</span>
                                </div>
                            </div>
                        </div>

                        <div class="flex flex-wrap gap-3">
                            <a href="#" class="flex items-center px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white font-medium rounded-lg transition duration-150 shadow-md shadow-pink-600/20">
                                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.001 0 0120.488 9z"></path></svg>
                                Dashboard
                            </a>
                            <button id="editProfileBtn" class="flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition duration-150">
                                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                Edit Profile
                            </button>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
                        <div class="bg-pink-50/70 p-4 rounded-lg text-center shadow-sm border border-pink-100"><div id="totalClients" class="text-2xl font-bold text-pink-600">0</div><div class="text-xs font-medium text-gray-500 mt-1">Total Clients</div></div>
                        <div class="bg-pink-50/70 p-4 rounded-lg text-center shadow-sm border border-pink-100"><div id="activeBookings" class="text-2xl font-bold text-pink-600">0</div><div class="text-xs font-medium text-gray-500 mt-1">Active Bookings</div></div>
                        <div class="bg-pink-50/70 p-4 rounded-lg text-center shadow-sm border border-pink-100"><div id="completedProjects" class="text-2xl font-bold text-pink-600">0</div><div class="text-xs font-medium text-gray-500 mt-1">Completed Projects</div></div>
                        <div class="bg-pink-50/70 p-4 rounded-lg text-center shadow-sm border border-pink-100"><div id="monthlyRevenue" class="text-2xl font-bold text-pink-600">₱0</div><div class="text-xs font-medium text-gray-500 mt-1">Monthly Revenue</div></div>
                    </div>
                </div>
            </div>

            <div class="w-full px-0 mx-0">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <div class="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition duration-300">
                        <div class="flex justify-between items-center mb-4">
                            <div class="flex items-center">
                                <span class="text-2xl mr-2 text-pink-600">🎨</span>
                                <h3 class="text-lg font-semibold text-gray-800">Content Management</h3>
                            </div>
                            <button id="manageContentBtn" onclick="window.setPage('manage')" class="px-3 py-1 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium rounded-lg transition duration-150">Manage</button>
                        </div>
                        <p class="text-sm text-gray-500 mb-4">Manage website content including designs, promos, credentials, and portfolio showcase.</p>
                        <div class="flex flex-wrap gap-2">
                            <button onclick="window.setPage('manage', 'designs')" class="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full border border-gray-300">Designs</button>
                            <button onclick="window.setPage('manage', 'promo')" class="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full border border-gray-300">Promos</button>
                            <button onclick="window.setPage('manage', 'credentials')" class="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full border border-gray-300">Credentials</button>
                        </div>
                    </div>

                    <div class="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition duration-300">
                        <div class="flex justify-between items-center mb-4"><div class="flex items-center"><span class="text-2xl mr-2 text-pink-600">⭐</span><h3 class="text-lg font-semibold text-gray-800">Review Management</h3></div><button id="manageReviewBtn" onclick="window.setPage('reviews')" class="px-3 py-1 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium rounded-lg transition duration-150">Manage</button></div>
                        <p class="text-sm text-gray-500 mb-4">Manage client reviews, add photos to testimonials, and moderate review content.</p>
                        <div class="flex flex-wrap gap-2">
                            <button id="addReviewPhotosBtn" class="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full border border-gray-300">Add Photos</button>
                            <button id="moderateReviewsBtn" class="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full border border-gray-300">Moderate</button>
                            <button id="featuredReviewsBtn" class="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full border border-gray-300">Featured</button>
                        </div>
                    </div>

                    <div class="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition duration-300">
                        <div class="flex justify-between items-center mb-4"><div class="flex items-center"><span class="text-2xl mr-2 text-pink-600">📅</span><h3 class="text-lg font-semibold text-gray-800">Appointments</h3></div><button id="manageAppointmentsBtn" class="px-3 py-1 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium rounded-lg transition duration-150">Manage</button></div>
                        <p class="text-sm text-gray-500 mb-4">View and manage all appointments, including online bookings and walk-in clients.</p>
                        <div class="flex flex-wrap gap-2">
                            <button id="addWalkInBtn" class="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full border border-gray-300">Add Walk-in</button>
                            <button id="viewCalendarBtn" class="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full border border-gray-300">Calendar</button>
                            <button id="pendingBookingsBtn" class="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full border border-gray-300">Pending</button>
                        </div>
                    </div>

                    <div class="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition duration-300">
                        <div class="flex justify-between items-center mb-4"><div class="flex items-center"><span class="text-2xl mr-2 text-pink-600">🧾</span><h3 class="text-lg font-semibold text-gray-800">Receipts</h3></div><button id="manageReceiptsBtn" class="px-3 py-1 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium rounded-lg transition duration-150">Manage</button></div>
                        <p class="text-sm text-gray-500 mb-4">View and manage all payment receipts submitted by clients during booking.</p>
                        <div class="flex flex-wrap gap-2">
                            <button id="viewAllReceiptsBtn" class="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full border border-gray-300">All Receipts</button>
                            <button id="pendingReceiptsBtn" class="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full border border-gray-300">Pending Review</button>
                        </div>
                    </div>

                    <div class="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition duration-300">
                        <div class="flex justify-between items-center mb-4"><div class="flex items-center"><span class="text-2xl mr-2 text-pink-600">📱</span><h3 class="text-lg font-semibold text-gray-800">QR Codes</h3></div><button id="manageQRCodesBtn" class="px-3 py-1 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium rounded-lg transition duration-150">Manage</button></div>
                        <p class="text-sm text-gray-500 mb-4">Manage payment QR codes for different payment methods like GCash, PayMaya, etc.</p>
                        <div class="flex flex-wrap gap-2">
                            <button id="viewQRCodesBtn" class="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full border border-gray-300">View All</button>
                            <button id="addQRCodeBtn" class="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full border border-gray-300">Add QR Code</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="w-full px-0 mx-0">
                <div class="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-8 border border-gray-200">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold text-gray-800 flex items-center">
                            <svg class="w-6 h-6 mr-2 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20v-2c0-.656-.126-1.283-.356-1.857M2 12l2.305 2.305A7.016 7.016 0 0012 17a7.016 7.016 0 007.695-2.695L22 12M5 15h1.5M7.5 15h1.5m4 0h1.5m-4 0h1.5"></path></svg>
                            Client Accounts
                        </h2>
                        <button id="addNewClientBtn" class="flex items-center px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition duration-150 shadow-md shadow-green-500/20">
                            <span class="mr-1">+</span> Add New Client
                        </button>
                    </div>
                    
                    <div class="flex flex-col sm:flex-row gap-4 mb-6">
                        <input type="text" placeholder="Search clients by name or email..." class="flex-grow px-4 py-2 border border-gray-300 rounded-lg focus:ring-pink-600 focus:border-pink-600 transition duration-150" />
                        <select class="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium focus:ring-pink-600 focus:border-pink-600 transition duration-150">
                            <option>Filter by Status</option>
                            <option>Active</option>
                            <option>Inactive</option>
                            <option>Pending</option>
                        </select>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        <div class="lg:col-span-3 text-center py-12 px-4">
                            <p class="text-5xl mb-4 opacity-50 text-pink-300">📁</p>
                            <h3 class="text-xl font-semibold text-gray-700 mb-2">No Client Data Found</h3>
                            <p class="text-sm text-gray-500">Add a new client or connect to the live database to load accounts.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
       ${adminProfileModalHtml}
    </div>
`;
    
    container.innerHTML = adminHTML;
    
    attachAdminDashboardListeners(logoutUser, user, setPage, updateProfile); 
}
/**
 * Attaches all necessary event listeners to the Admin Dashboard elements.
 * @param {function} logoutUser - The logout function from auth_logic.js.
 * @param {object} user - The authenticated user object.
 */

export function attachAdminDashboardListeners(logoutUser, user, setPage, updateProfile) {
        const navigate = typeof setPage === 'function' ? setPage : window.setPage;
        const setStatusFilter = typeof window.setBookingStatusFilter === 'function' ? window.setBookingStatusFilter : null;
        const setAppointmentsTab = typeof window.setAppointmentsTab === 'function' ? window.setAppointmentsTab : null;
        // Function to SHOW the modal
        const showModal = (id) => {const modal = document.getElementById(id);
            if (modal) {
                modal.classList.remove('hidden'); // 1. Make it visible
                modal.classList.add('flex');     // 2. Apply display:flex for centering
            }
        };

        // Function to HIDE the modal
        const hideModal = (id) => {const modal = document.getElementById(id);
            if (modal) {
                modal.classList.add('hidden');  // 1. Hide it
                modal.classList.remove('flex'); // 2. Clean up display:flex
            }
        };

        //to guard the save button --unless changes has been made it won't be clickable
        window.toggleSaveButton = (id) => {
            const titleInput = document.getElementById(`design-title-${id}`);
            const priceInput = document.getElementById(`design-price-${id}`);
            const saveButton = document.getElementById(`save-inline-${id}`);
            
            if (saveButton && titleInput && priceInput) {
                const isTitleChanged = titleInput.value !== titleInput.dataset.initialValue;
                const isPriceChanged = priceInput.value !== priceInput.dataset.initialValue;
                const isDisabled = !(isTitleChanged || isPriceChanged) || !titleInput.value || !priceInput.value;
                saveButton.disabled = isDisabled;
            }
        };

        //to set the new value as initial value
        window.resetSaveButton = (id) => {
            const titleInput = document.getElementById(`design-title-${id}`);
            const priceInput = document.getElementById(`design-price-${id}`);
            const saveButton = document.getElementById(`save-inline-${id}`);
            
            if (titleInput && priceInput && saveButton) {
                titleInput.dataset.initialValue = titleInput.value;
                priceInput.dataset.initialValue = priceInput.value;
                saveButton.disabled = true;
            }
        };

        document.getElementById('logoutBtn')?.addEventListener('click', logoutUser); 
        document.getElementById('manageContentBtn')?.addEventListener('click', () => navigate?.('manage')); 

        // Edit Profile Button
        document.getElementById('editProfileBtn')?.addEventListener('click', () => {
            const adminProfileModal = document.getElementById('adminProfileModal');
            if (adminProfileModal) {
                // This will now REMOVE the 'hidden' class, making the modal visible.
                showModal('adminProfileModal'); 
            }
        });

        // Modal Close Handlers    
        document.getElementById('cancelAdminModalBtn')?.addEventListener('click', () => { hideModal('adminProfileModal'); });
        document.getElementById('adminProfileModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'adminProfileModal') { hideModal('adminProfileModal'); }
        });

        
        // Admin Profile Form Submission (Uses Firebase updateProfile logic)
        document.getElementById('adminProfileForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newName = document.getElementById('adminNameInput').value;
            const profileError = document.getElementById('profileError');
            profileError.textContent = ''; // Clear previous errors
            profileError.classList.add('hidden');
            
            try {
                // Assumes 'updateProfile' is the imported Firebase function
                await updateProfile(user, { displayName: newName }); 
                window.renderApp(); // Re-render to show the new name on the dashboard
                hideModal('adminProfileModal');
            } catch (error) {
                console.error("Failed to update profile:", error);
                profileError.textContent = "Update failed: " + error.message;
                profileError.classList.remove('hidden');
            }
        });
        
        // Forms for Content Management (Attached on the 'manage' page only)
        const attachContentFormListeners = () => {
            const designForm = document.getElementById('design-form');
            if (designForm) {
                designForm.onsubmit = (e) => {
                    e.preventDefault();
                    const form = e.target; 
                    
                    const id = document.getElementById('design-id').value;
                    const title = document.getElementById('design-title').value;
                    const price = parseFloat(document.getElementById('design-price').value);
                    const imageUrl = document.getElementById('design-imageUrl').value;
                    
                    saveDesign(id, { title, price, imageUrl }); 

                    if (!id) {
                        form.reset(); 
                    }
                };
            }
            
            const promoForm = document.getElementById('promo-form');
            if (promoForm) {
                promoForm.onsubmit = (e) => {
                    e.preventDefault();
                    const form = e.target;
                    const imageUrl = document.getElementById('promo-imageUrl').value;
                    saveGalleryItem('promo', { imageUrl });
                    form.reset();
                };
            }
            
            const credentialForm = document.getElementById('credential-form');
            if (credentialForm) {
                credentialForm.onsubmit = (e) => {
                    e.preventDefault();
                    const form = e.target;
                    const imageUrl = document.getElementById('credential-imageUrl').value;
                    saveGalleryItem('credential', { imageUrl });
                    form.reset();
                };
            }
            
        };
        
        // Export the form attachment function for use after rendering the manage view
        window.attachContentFormListeners = attachContentFormListeners;

        // Placeholder console logs for other buttons
        document.getElementById('manageReviewBtn')?.addEventListener('click', () => console.log('Review Management Opened'));
        document.getElementById('manageAppointmentsBtn')?.addEventListener('click', () => navigate?.('appointments'));
        document.getElementById('manageReceiptsBtn')?.addEventListener('click', () => navigate?.('receipts'));
        document.getElementById('viewAllReceiptsBtn')?.addEventListener('click', () => navigate?.('receipts'));
        document.getElementById('pendingReceiptsBtn')?.addEventListener('click', () => navigate?.('receipts'));
        document.getElementById('manageQRCodesBtn')?.addEventListener('click', () => navigate?.('qr'));
        document.getElementById('viewQRCodesBtn')?.addEventListener('click', () => navigate?.('qr'));
        document.getElementById('addQRCodeBtn')?.addEventListener('click', () => navigate?.('qr'));
        document.getElementById('addWalkInBtn')?.addEventListener('click', () => {
            if (setAppointmentsTab) {
                setAppointmentsTab('walk-in');
            } else {
                navigate?.('appointments', 'walk-in');
            }
        });
        document.getElementById('viewCalendarBtn')?.addEventListener('click', () => {
            if (setAppointmentsTab) {
                setAppointmentsTab('calendar');
            } else {
                navigate?.('appointments', 'calendar');
            }
        });
        document.getElementById('pendingBookingsBtn')?.addEventListener('click', () => {
            if (navigate) {
                navigate('appointments', 'list');
            }
            setStatusFilter?.('pending');
        });
        
        // Initialize time inputs when admin dashboard loads
        setTimeout(() => {
            if (typeof window.initializeTimeInputs === 'function') {
                window.initializeTimeInputs();
            }
        }, 100);
}

export function renderReviewManagementLayout(container, user, state) {
    const currentTab = state.reviewsTab || 'system';
    
    const reviewsHTML = `
        <div class="space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
            <header class="flex flex-wrap items-center justify-between p-4 bg-white rounded-xl shadow-md border border-gray-100">
                <div class="flex items-center space-x-4">
                    <button onclick="window.setPage('dashboard')" class="flex items-center text-pink-600 hover:text-pink-700 transition">
                        <i data-lucide="arrow-left" class="w-6 h-6 mr-2"></i>
                        <span class="text-lg font-bold">Back to Dashboard</span>
                    </button>
                    <h1 class="text-2xl font-extrabold text-gray-800">Review Management</h1>
                </div>
            </header>

            <!-- Tabs -->
            <div class="bg-white rounded-xl shadow-lg">
                <div class="flex border-b border-gray-200">
                    <button id="systemReviewsTab" class="tab-btn px-6 py-4 font-semibold text-sm transition ${currentTab === 'system' ? 'text-pink-600 border-b-2 border-pink-600' : 'text-gray-600 hover:text-pink-600'}" data-tab="system">
                        System Reviews
                    </button>
                    <button id="externalPhotosTab" class="tab-btn px-6 py-4 font-semibold text-sm transition ${currentTab === 'external' ? 'text-pink-600 border-b-2 border-pink-600' : 'text-gray-600 hover:text-pink-600'}" data-tab="external">
                        External Review Photos
                    </button>
                </div>
            </div>

            <!-- System Reviews Tab Content -->
            <div id="systemReviewsContent" class="tab-content ${currentTab === 'system' ? '' : 'hidden'}">
                <div class="bg-white rounded-xl shadow-lg p-6">
                    <h2 class="text-2xl font-bold text-gray-800 mb-4">Client Reviews from System</h2>
                    <p class="text-gray-600 mb-6">Manage reviews submitted by clients through the booking system.</p>
                    <div id="systemReviewsList" class="space-y-4">
                        <div class="text-center py-8 text-gray-500">
                            <div class="text-4xl mb-2">⏳</div>
                            <p>Loading reviews...</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- External Review Photos Tab Content -->
            <div id="externalPhotosContent" class="tab-content ${currentTab === 'external' ? '' : 'hidden'}">
                <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
                    <h2 class="text-2xl font-bold text-gray-800 mb-4">External Review Photos</h2>
                    <p class="text-gray-600 mb-6">Add photos of reviews from other social media platforms (Facebook, Instagram, etc.)</p>
                    
                    <!-- Upload Section -->
                    <div class="border-2 border-dashed border-pink-300 rounded-xl p-8 text-center mb-6 bg-pink-50/50">
                        <input type="file" id="externalPhotoUpload" accept="image/*" class="hidden" />
                        <div class="text-4xl mb-4">📷</div>
                        <h3 class="text-lg font-semibold text-gray-800 mb-2">Upload Review Photo</h3>
                        <p class="text-sm text-gray-600 mb-4">Click to upload a photo of a review from another platform</p>
                        <button id="uploadExternalPhotoBtn" class="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-lg transition shadow-md">
                            Choose Photo
                        </button>
                        <p class="text-xs text-gray-500 mt-2">Max file size: 5MB. Supported formats: JPG, PNG</p>
                    </div>

                    <!-- Photos Grid -->
                    <div id="externalPhotosGrid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        <div class="text-center py-8 text-gray-500">
                            <div class="text-4xl mb-2">⏳</div>
                            <p>Loading photos...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = reviewsHTML;
}

export async function attachReviewManagementListeners() {
    // Tab switching
    const systemTab = document.getElementById('systemReviewsTab');
    const externalTab = document.getElementById('externalPhotosTab');
    const systemContent = document.getElementById('systemReviewsContent');
    const externalContent = document.getElementById('externalPhotosContent');

    if (systemTab && externalTab) {
        systemTab.addEventListener('click', () => {
            systemTab.classList.add('text-pink-600', 'border-b-2', 'border-pink-600');
            systemTab.classList.remove('text-gray-600');
            externalTab.classList.remove('text-pink-600', 'border-b-2', 'border-pink-600');
            externalTab.classList.add('text-gray-600');
            systemContent.classList.remove('hidden');
            externalContent.classList.add('hidden');
            loadSystemReviews();
        });

        externalTab.addEventListener('click', () => {
            externalTab.classList.add('text-pink-600', 'border-b-2', 'border-pink-600');
            externalTab.classList.remove('text-gray-600');
            systemTab.classList.remove('text-pink-600', 'border-b-2', 'border-pink-600');
            systemTab.classList.add('text-gray-600');
            externalContent.classList.remove('hidden');
            systemContent.classList.add('hidden');
            loadExternalPhotos();
        });
    }

    // Upload external photo
    const uploadBtn = document.getElementById('uploadExternalPhotoBtn');
    const fileInput = document.getElementById('externalPhotoUpload');
    
    if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 5 * 1024 * 1024) {
                    Swal.fire({
                        icon: 'error',
                        title: 'File Too Large',
                        text: 'Please upload an image smaller than 5MB.',
                    });
                    return;
                }

                if (!file.type.startsWith('image/')) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Invalid File Type',
                        text: 'Please upload an image file (JPG, PNG, etc.).',
                    });
                    return;
                }

                try {
                    Swal.fire({
                        title: 'Uploading...',
                        text: 'Please wait while we upload the photo.',
                        allowOutsideClick: false,
                        didOpen: () => {
                            Swal.showLoading();
                        }
                    });

                    await uploadExternalReviewPhoto(file);
                    
                    Swal.fire({
                        icon: 'success',
                        title: 'Success!',
                        text: 'Photo uploaded successfully.',
                        timer: 1500,
                        showConfirmButton: false
                    });

                    fileInput.value = '';
                    await loadExternalPhotos();
                } catch (error) {
                    console.error('Error uploading photo:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Upload Failed',
                        text: error.message || 'Failed to upload photo. Please try again.',
                    });
                }
            }
        });
    }

    // Load initial data
    const currentTab = document.getElementById('systemReviewsTab')?.classList.contains('text-pink-600') ? 'system' : 'external';
    if (currentTab === 'system') {
        loadSystemReviews();
    } else {
        loadExternalPhotos();
    }
}

// Load system reviews
async function loadSystemReviews() {
    try {
        const reviews = await getAllReviews('all');
        const container = document.getElementById('systemReviewsList');
        
        if (!container) return;

        if (reviews.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 text-gray-500">
                    <div class="text-5xl mb-4">⭐</div>
                    <h3 class="text-xl font-bold text-gray-700 mb-2">No Reviews Yet</h3>
                    <p>No reviews have been submitted by clients yet.</p>
                </div>
            `;
            return;
        }

        const reviewsHTML = reviews.map(review => {
            const stars = '⭐'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
            const reviewDate = review.createdAt instanceof Date ? review.createdAt : new Date(review.createdAt);
            
            return `
                <div class="border border-gray-200 rounded-xl p-6 hover:shadow-md transition">
                    <div class="flex justify-between items-start mb-4">
                        <div class="flex-1">
                            <div class="flex items-center gap-3 mb-2">
                                <div class="text-2xl">${stars}</div>
                                <span class="text-sm text-gray-500">${reviewDate.toLocaleDateString()}</span>
                            </div>
                            <p class="text-sm text-gray-600 mb-2">By: ${review.userName || 'Anonymous'}</p>
                            <p class="text-gray-700 mb-4">${review.text}</p>
                            ${review.imageUrls && review.imageUrls.length > 0 ? `
                                <div class="grid grid-cols-2 gap-2 mb-4">
                                    ${review.imageUrls.map(url => `
                                        <img src="${url}" alt="Review photo" class="w-full h-32 object-cover rounded-lg shadow-sm" />
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                        <button class="delete-review-btn ml-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition shadow-md" data-review-id="${review.id}">
                            Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = reviewsHTML;

        // Attach delete listeners
        document.querySelectorAll('.delete-review-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const reviewId = e.target.dataset.reviewId;
                
                const result = await Swal.fire({
                    title: 'Delete Review?',
                    text: 'Are you sure you want to delete this review? This action cannot be undone.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#ef4444',
                    cancelButtonColor: '#6b7280',
                    confirmButtonText: 'Yes, delete it',
                    cancelButtonText: 'Cancel'
                });

                if (result.isConfirmed) {
                    try {
                        Swal.fire({
                            title: 'Deleting...',
                            allowOutsideClick: false,
                            didOpen: () => {
                                Swal.showLoading();
                            }
                        });

                        await deleteReview(reviewId);
                        
                        Swal.fire({
                            icon: 'success',
                            title: 'Deleted!',
                            text: 'Review has been deleted successfully.',
                            timer: 1500,
                            showConfirmButton: false
                        });

                        await loadSystemReviews();
                    } catch (error) {
                        console.error('Error deleting review:', error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Delete Failed',
                            text: error.message || 'Failed to delete review. Please try again.',
                        });
                    }
                }
            });
        });
    } catch (error) {
        console.error('Error loading system reviews:', error);
        const container = document.getElementById('systemReviewsList');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-12 text-red-500">
                    <div class="text-5xl mb-4">⚠️</div>
                    <h3 class="text-xl font-bold mb-2">Error Loading Reviews</h3>
                    <p>${error.message || 'Failed to load reviews. Please try again.'}</p>
                </div>
            `;
        }
    }
}

// Load external photos
async function loadExternalPhotos() {
    try {
        const photos = await getExternalReviewPhotos();
        const container = document.getElementById('externalPhotosGrid');
        
        if (!container) return;

        if (photos.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12 text-gray-500">
                    <div class="text-5xl mb-4">📷</div>
                    <h3 class="text-xl font-bold text-gray-700 mb-2">No Photos Yet</h3>
                    <p>Upload photos of reviews from other platforms to display here.</p>
                </div>
            `;
            return;
        }

        const photosHTML = photos.map(photo => `
            <div class="relative group">
                <img src="${photo.imageUrl}" alt="External review" class="w-full h-64 object-cover rounded-xl shadow-md hover:shadow-lg transition" />
                <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition rounded-xl flex items-center justify-center">
                    <button class="delete-external-photo-btn opacity-0 group-hover:opacity-100 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition shadow-md" data-photo-id="${photo.id}" data-photo-url="${photo.imageUrl}">
                        Delete
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = photosHTML;

        // Attach delete listeners
        document.querySelectorAll('.delete-external-photo-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const photoId = e.target.dataset.photoId;
                const photoUrl = e.target.dataset.photoUrl;
                
                const result = await Swal.fire({
                    title: 'Delete Photo?',
                    text: 'Are you sure you want to delete this photo? This action cannot be undone.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#ef4444',
                    cancelButtonColor: '#6b7280',
                    confirmButtonText: 'Yes, delete it',
                    cancelButtonText: 'Cancel'
                });

                if (result.isConfirmed) {
                    try {
                        Swal.fire({
                            title: 'Deleting...',
                            allowOutsideClick: false,
                            didOpen: () => {
                                Swal.showLoading();
                            }
                        });

                        await deleteExternalReviewPhoto(photoId, photoUrl);
                        
                        Swal.fire({
                            icon: 'success',
                            title: 'Deleted!',
                            text: 'Photo has been deleted successfully.',
                            timer: 1500,
                            showConfirmButton: false
                        });

                        await loadExternalPhotos();
                    } catch (error) {
                        console.error('Error deleting photo:', error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Delete Failed',
                            text: error.message || 'Failed to delete photo. Please try again.',
                        });
                    }
                }
            });
        });
    } catch (error) {
        console.error('Error loading external photos:', error);
        const container = document.getElementById('externalPhotosGrid');
        if (container) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12 text-red-500">
                    <div class="text-5xl mb-4">⚠️</div>
                    <h3 class="text-xl font-bold mb-2">Error Loading Photos</h3>
                    <p>${error.message || 'Failed to load photos. Please try again.'}</p>
                </div>
            `;
        }
    }
}