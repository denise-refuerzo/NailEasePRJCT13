import { updateProfile } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { saveDesign, deleteDesign, saveGalleryItem, deleteGalleryItem, toggleActivePromo, state, setPage, setTab, editDesign, toggleFeaturedDesign, updateDesignInline 
} from './auth-logic.js';

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
};

const formatDate = (value) => {
    if (!value) return 'No date set';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatTime = (value) => {
    if (!value) return 'No time set';

    const toLocale = (date) => date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    if (value instanceof Date) {
        if (value.getMinutes() !== 0) {
            value.setMinutes(0);
        }
        return toLocale(value);
    }

    if (typeof value === 'string') {
        const parsedTimestamp = Date.parse(value);
        if (!Number.isNaN(parsedTimestamp) && value.includes('T')) {
            const date = new Date(parsedTimestamp);
            if (date.getMinutes() !== 0) {
                 date.setMinutes(0);
            }
            return toLocale(date);
        }

        try {
            const [hourStr, minuteStr] = value.split(':');
            const minute = parseInt(minuteStr || '0', 10);
            const hour = parseInt(hourStr, 10);
            
            if (hourStr === undefined) return value;
            const date = new Date();
            date.setHours(hour, 0);
            return toLocale(date);
        } catch (error) {
            return value;
        }
    }

    return value;
};

//input skeleton
const inputField = (id, label, type = 'text', value = '', required = true) => {
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

// Time formatting function - ensures minutes are always "00" and shows only hours in picker
window.formatHourlyTime = function(input) {
    if (input.type === 'time' && input.value) {
        const [hours, minutes] = input.value.split(':');
        input.value = `${hours}:00`;
    }
};

// Initialize time inputs to show only hours
window.initializeTimeInputs = function() {
    document.querySelectorAll('input[type="time"]').forEach(input => {
        input.step = 3600;
        
        if (input.value && !input.value.endsWith(':00')) {
            const [hours] = input.value.split(':');
            input.value = `${hours}:00`;
        }
        
        input.addEventListener('change', function() {
            window.formatHourlyTime(this);
        });
    });
};

// Custom time input that only shows hours
window.createHourlyTimeInput = function(id, value = '') {
    let hourValue = '';
    if (value) {
        const [hours] = value.split(':');
        hourValue = hours;
    }
    
    return `
        <select id="${id}" name="${id}" class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-accent-pink focus:ring focus:ring-accent-pink focus:ring-opacity-50 transition duration-150 ease-in-out bg-white">
            <option value="">Select Time</option>
            ${Array.from({length: 12}, (_, i) => {
                const hour = i + 8;
                const displayHour = hour > 12 ? hour - 12 : hour;
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const timeValue = `${hour.toString().padStart(2, '0')}:00`;
                const isSelected = hourValue === hour.toString().padStart(2, '0');
                return `<option value="${timeValue}" ${isSelected ? 'selected' : ''}>${displayHour}:00 ${ampm}</option>`;
            }).join('')}
        </select>
    `;
};

//Admin Profile Editing Modal
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
    
    const designsToShow = state.designs.slice(
        (state.designsCurrentPage - 1) * DESIGNS_PER_PAGE,
        state.designsCurrentPage * DESIGNS_PER_PAGE
    );
    const totalPages = Math.ceil(state.designs.length / DESIGNS_PER_PAGE);

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
    
    const promosToShow = promos.slice(
        (state.promosCurrentPage - 1) * PROMOS_PER_PAGE,
        state.promosCurrentPage * PROMOS_PER_PAGE
    );
    const totalPages = Math.ceil(promos.length / PROMOS_PER_PAGE);
    
    const activePromosPerPage = 1; 
    const currentActivePage = state.promosActiveCurrentPage || 1; 
    const currentActivePromoIndex = (currentActivePage - 1) * activePromosPerPage;
    const currentActivePromo = activePromos[currentActivePromoIndex]; 
    const totalActivePages = Math.ceil(activePromos.length / activePromosPerPage);

    const formHtml = `
        <form id="promo-form" class="p-6 bg-white rounded-xl shadow-md mb-8 border border-gray-100">
            <h3 class="text-xl font-bold text-pink-600 mb-4">Add New Promo Image</h3>
            ${inputField('promo-imageUrl', 'Image URL (Link to Photo)', 'url', '', true)}
            <button type="submit" class="w-full mt-6 px-4 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-pink-600 hover:bg-pink-700 transition duration-150">
                Add Promo Image
            </button>
        </form>
    `;
    
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
    
    const credentialsToShow = credentials.slice(
        (state.credentialsCurrentPage - 1) * CREDENTIALS_PER_PAGE,
        state.credentialsCurrentPage * CREDENTIALS_PER_PAGE
    );
    const totalPages = Math.ceil(credentials.length / CREDENTIALS_PER_PAGE);

    const formHtml = `
        <form id="credential-form" class="p-6 bg-white rounded-xl shadow-md mb-8 border border-gray-100">
            <h3 class="text-xl font-bold text-pink-600 mb-4">Add New Certificate/Credential</h3>
            
            ${inputField('credential-imageUrl', 'Image URL (Link to Certificate Photo)', 'url', '', true)}
            
            <button type="submit" class="w-full mt-6 px-4 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-pink-600 hover:bg-pink-700 transition duration-150">
                Add Certificate
            </button>
        </form>
    `;
    
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

/**
 * Renders the Content Management view.
 * @param {firebase.User} user - The authenticated user object.
 * @returns {string} The HTML for the Content Management view.
*/

//Management Logic & Structure
export function renderManageView(user) {
    let contentHtml = '';
    let tabTitle = '';
    
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
                class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-pink-500 focus:ring focus:ring-pink-500 focus:ring-opacity-50 transition duration-150 ease-in-out bg-white">
        </div>

        <div>
            <label for="selectedTime" class="block text-sm font-medium text-gray-700">Appointment Time</label>
            ${window.createHourlyTimeInput('selectedTime', '')}
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
        const calendarEmbedSectionHtml = GOOGLE_CALENDAR_EMBED_URL ? `
            <section class="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <div>
                        <h3 class="text-base font-semibold text-gray-800">Google Calendar</h3>
                        <p class="text-xs text-gray-500">This is your live calendar. Sign in with the admin Google account to edit.</p>
                    </div>
                    <a href="${GOOGLE_CALENDAR_EMBED_URL}" target="_blank" rel="noopener" class="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-pink-200 text-pink-600 hover:bg-pink-50 transition">
                        <i data-lucide="external-link" class="w-4 h-4"></i>
                        Open in new tab
                    </a>
                </div>
                <div class="relative bg-gray-100">
                    <iframe 
                        src="${GOOGLE_CALENDAR_EMBED_URL}"
                        class="w-full h-[640px] border-0"
                        frameborder="0"
                        scrolling="no"
                        loading="lazy"
                        allowfullscreen
                    ></iframe>
                </div>
            </section>
        ` : `
            <section class="bg-white border border-dashed border-pink-200 rounded-xl p-6 text-center shadow-sm">
                <p class="text-5xl mb-4 opacity-40">🔐</p>
                <h3 class="text-lg font-semibold text-gray-800">Embed URL Required</h3>
                <p class="mt-2 text-sm text-gray-500 max-w-lg mx-auto">
                    Set <code>window.__NAILEASE_CALENDAR_EMBED_URL__</code> to your Google Calendar embed link so the live calendar appears here. In Google Calendar, open settings ▶ Integrate calendar ▶ copy the iframe URL.
                    If you keep the calendar private, make sure it is shared with the service account and the admin user signed in can edit events.
                </p>
            </section>
        `;
        mainContentHtml = `
            <div class="space-y-6">
                ${calendarEmbedSectionHtml}
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
    
    setTimeout(() => {
        if (typeof window.initializeTimeInputs === 'function') {
            window.initializeTimeInputs();
        }
    }, 100);
}

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
            
            const timeParts = payload.selectedTime.split(':');
            if (timeParts.length === 2 && parseInt(timeParts[1], 10) !== 0) {
                alert('Please select a time that is on the hour (e.g., 10:00, 11:00). Minutes must be "00".');
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
    });

    document.querySelectorAll('[data-open-calendar-event]').forEach(button => {
        button.addEventListener('click', () => {
            const link = button.getAttribute('data-open-calendar-event');
            if (link) {
                window.open(link, '_blank', 'noopener,noreferrer');
            }
        });
    });
    
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
        <div class="min-h-screen bg-gray-50">
            <header class="sticky top-0 bg-white shadow-md z-50">
                <div class="w-full px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center max-w-7xl mx-auto">
                    <div class="flex items-center space-x-6">
                        <a href="#" class="text-xl font-bold text-pink-600 tracking-wider">DCAC</a>
                        <nav class="hidden md:flex space-x-4">
                            <a href="homepage.html" class="text-gray-600 hover:text-pink-600 transition duration-150">Home</a>
                            <a href="design_portfolio.html" class="text-gray-600 hover:text-pink-600 transition duration-150">Design Portfolio</a>
                            <a href="#" class="text-gray-600 hover:text-pink-600 transition duration-150">Reports</a>
                            <a href="index.html" class="text-pink-600 hover:text-pink-700 transition duration-150">Dashboard</a>
                        </nav>
                    </div>
                    <div class="flex items-center space-x-4">
                        <button id="logoutBtn" class="text-gray-600 hover:text-pink-600 transition duration-150">Log Out</button>
                    </div>
                </div>
            </header>

            <div class="text-center py-8 bg-white border-b border-gray-100">
                <h1 class="text-3xl sm:text-4xl font-extrabold text-gray-800">Admin Dashboard</h1>
                <p class="text-sm text-gray-500 mt-1">Manage operations, clients, and content</p>
            </div>
        
        <div class="w-full p-4 md:p-8"> 
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
                            <button class="flex items-center px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white font-medium rounded-lg transition duration-150 shadow-md shadow-pink-600/20">
                                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.001 0 0120.488 9z"></path></svg>
                                Dashboard
                            </button>
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
                            <button id="manageContentBtn" class="px-3 py-1 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium rounded-lg transition duration-150">Manage</button>
                        </div>
                        <p class="text-sm text-gray-500 mb-4">Manage website content including designs, promos, credentials, and portfolio showcase.</p>
                        <div class="flex flex-wrap gap-2">
                            <button class="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full border border-gray-300">Designs</button>
                            <button class="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full border border-gray-300">Promos</button>
                            <button class="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full border border-gray-300">Credentials</button>
                        </div>
                    </div>

                    <div class="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition duration-300">
                        <div class="flex justify-between items-center mb-4">
                            <div class="flex items-center">
                                <span class="text-2xl mr-2 text-pink-600">⭐</span>
                                <h3 class="text-lg font-semibold text-gray-800">Review Management</h3>
                            </div>
                            <button id="manageReviewBtn" class="px-3 py-1 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium rounded-lg transition duration-150">Manage</button>
                        </div>
                        <p class="text-sm text-gray-500 mb-4">Manage client reviews, add photos to testimonials, and moderate review content.</p>
                        <div class="flex flex-wrap gap-2">
                            <button id="addReviewPhotosBtn" class="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full border border-gray-300">Add Photos</button>
                            <button id="moderateReviewsBtn" class="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full border border-gray-300">Moderate</button>
                            <button id="featuredReviewsBtn" class="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full border border-gray-300">Featured</button>
                        </div>
                    </div>

                    <div class="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition duration-300">
                        <div class="flex justify-between items-center mb-4">
                            <div class="flex items-center">
                                <span class="text-2xl mr-2 text-pink-600">📅</span>
                                <h3 class="text-lg font-semibold text-gray-800">Appointments</h3>
                            </div>
                            <button id="manageAppointmentsBtn" class="px-3 py-1 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium rounded-lg transition duration-150">Manage</button>
                        </div>
                        <p class="text-sm text-gray-500 mb-4">View and manage all appointments, including online bookings and walk-in clients.</p>
                        <div class="flex flex-wrap gap-2">
                            <button id="addWalkInBtn" class="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full border border-gray-300">Add Walk-in</button>
                            <button id="viewCalendarBtn" class="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full border border-gray-300">Calendar</button>
                            <button id="pendingBookingsBtn" class="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full border border-gray-300">Pending</button>
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
    `;
    
    container.innerHTML = adminHTML;
    
    attachAdminDashboardListeners(logoutUser, user, setPage, updateProfile); 
}

export function attachAdminDashboardListeners(logoutUser, user, setPage, updateProfile) {
        const navigate = typeof setPage === 'function' ? setPage : window.setPage;
        const setStatusFilter = typeof window.setBookingStatusFilter === 'function' ? window.setBookingStatusFilter : null;
        const setAppointmentsTab = typeof window.setAppointmentsTab === 'function' ? window.setAppointmentsTab : null;

        // Handle logout with error handling
        const handleLogout = async () => {
            try {
                await logoutUser();
                navigate('login');
            } catch (error) {
                console.error('Logout error:', error);
                if (error.code === 'auth/cancelled-popup-request') {
                    // User cancelled the popup, no need to show error
                    return;
                }
                // Show error message to user
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'error',
                        title: 'Logout Failed',
                        text: 'Please try again. If the problem persists, refresh the page.',
                        confirmButtonColor: '#EC4899'
                    });
                } else {
                    alert('Logout failed. Please try again or refresh the page.');
                }
            }
        };
        
        const showModal = (id) => {
            const modal = document.getElementById(id);
            if (modal) {
                modal.classList.remove('hidden');
                modal.classList.add('flex');
            }
        };

        const hideModal = (id) => {
            const modal = document.getElementById(id);
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        };

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

        document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
        document.getElementById('manageContentBtn')?.addEventListener('click', () => navigate?.('manage'));

        document.getElementById('editProfileBtn')?.addEventListener('click', () => {
            const adminProfileModal = document.getElementById('adminProfileModal');
            if (adminProfileModal) {
                showModal('adminProfileModal'); 
            }
        });

        document.getElementById('cancelAdminModalBtn')?.addEventListener('click', () => { hideModal('adminProfileModal'); });
        document.getElementById('adminProfileModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'adminProfileModal') { hideModal('adminProfileModal'); }
        });

        document.getElementById('adminProfileForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newName = document.getElementById('adminNameInput').value;
            const profileError = document.getElementById('profileError');
            profileError.textContent = '';
            profileError.classList.add('hidden');
            
            try {
                await updateProfile(user, { displayName: newName }); 
                window.renderApp();
                hideModal('adminProfileModal');
            } catch (error) {
                console.error("Failed to update profile:", error);
                profileError.textContent = "Update failed: " + error.message;
                profileError.classList.remove('hidden');
            }
        });
        
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
        
        window.attachContentFormListeners = attachContentFormListeners;

        document.getElementById('manageReviewBtn')?.addEventListener('click', () => console.log('Review Management Opened'));
        document.getElementById('manageAppointmentsBtn')?.addEventListener('click', () => navigate?.('appointments'));
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
        
        setTimeout(() => {
            if (typeof window.initializeTimeInputs === 'function') {
                window.initializeTimeInputs();
            }
        }, 100);
}