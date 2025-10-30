import { updateProfile } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { // <-- FIX: REMOVED CRASHING IMPORT
    saveDesign, deleteDesign, saveGalleryItem, deleteGalleryItem, toggleActivePromo,
    state, setPage, setTab, editDesign // Removed confirmAction, assuming the crash was here.
} from './auth-logic.js';

/**
 * Helper function to create an HTML input field.
 * @param {string} id - Input ID.
 * @param {string} label - Label text.
 * @param {string} type - Input type (text, number, url).
 * @param {string|number} value - Current value.
 * @param {boolean} required - Is required.
 * @param {string} placeholder - Placeholder text.
 */
const inputField = (id, label, type = 'text', value = '', required = true, placeholder = '') => `
    <label for="${id}" class="block text-sm font-medium text-gray-700 mt-3">${label}</label>
    <input type="${type}" id="${id}" name="${id}" ${required ? 'required' : ''} placeholder="${placeholder}"
        value="${value}"
        class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-accent-pink focus:ring focus:ring-accent-pink focus:ring-opacity-50 transition duration-150 ease-in-out bg-white">
`;

// --- Content Management Tabs Rendering ---

const renderDesignsTab = () => {
    const isEditing = state.editingDesign !== null;
    const design = state.editingDesign || {};

    const formHtml = `
        <form id="design-form" class="p-6 bg-white rounded-xl shadow-md mb-8 border border-gray-100">
            <h3 class="text-xl font-bold text-pink-600 mb-4">${isEditing ? 'Edit Design' : 'Add New Design'}</h3>
            <input type="hidden" id="design-id" value="${design.id || ''}">
            
            ${inputField('design-title', 'Design Title', 'text', design.title || '', true, 'e.g., French Tip with Gems')}
            ${inputField('design-price', 'Price (PHP)', 'number', design.price || '', true, 'e.g., 850')}
            ${inputField('design-imageUrl', 'Image URL (Link to Photo)', 'url', design.imageUrl || '', true, 'e.g., https://placehold.co/400x300/F472B6/fff?text=Design')}

            <div class="flex space-x-4 mt-6">
                <button type="submit" class="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-pink-600 hover:bg-pink-700 transition duration-150">
                    ${isEditing ? 'Save Changes' : 'Add Design'}
                </button>
                ${isEditing ? `
                    <button type="button" onclick="window.setPage('manage', 'designs');" class="px-4 py-3 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition duration-150">
                        Cancel
                    </button>
                ` : ''}
            </div>
        </form>
    `;

    const listHtml = state.designs.length > 0 ? state.designs.map(d => `
        <div class="bg-white rounded-xl shadow-sm flex flex-col sm:flex-row items-center p-4 mb-4 border border-gray-100 border-l-4 border-accent-pink">
            <img src="${d.imageUrl || 'https://placehold.co/100x75/FCE7F3/DB2777?text=No+Img'}" 
                 alt="${d.title}" 
                 onerror="this.onerror=null;this.src='https://placehold.co/100x75/FCE7F3/DB2777?text=Error';"
                 class="w-full sm:w-24 h-18 object-cover rounded-lg mb-3 sm:mb-0 sm:mr-4 flex-shrink-0">
            <div class="flex-grow w-full">
                <p class="text-lg font-semibold text-gray-800 truncate">${d.title}</p>
                <p class="text-sm text-gray-600">Price: <span class="font-bold text-pink-600">₱${d.price}</span></p>
            </div>
            <div class="flex space-x-2 mt-3 sm:mt-0 flex-shrink-0">
                <button onclick="window.editDesign('${d.id}')" class="p-2 rounded-full text-pink-600 hover:bg-pink-100 transition">
                    <i data-lucide="pencil" class="w-5 h-5"></i>
                </button>
                <button onclick="window.deleteDesign('${d.id}')" class="p-2 rounded-full text-red-500 hover:bg-red-100 transition">
                    <i data-lucide="trash-2" class="w-5 h-5"></i>
                </button>
            </div>
        </div>
    `).join('') : '<p class="text-center text-gray-500 py-8">No designs added yet. Use the form above to add one!</p>';

    return `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-1">${formHtml}</div>
            <div class="lg:col-span-2">
                <h3 class="text-xl font-bold text-gray-800 mb-4">Current Designs (${state.designs.length})</h3>
                <div class="space-y-4">${listHtml}</div>
            </div>
        </div>
    `;
};

const renderPromoTab = () => {
    const activePromo = state.gallery.find(item => item.type === 'promo' && item.isActive);
    const promos = state.gallery.filter(item => item.type === 'promo');
    
    const formHtml = `
        <form id="promo-form" class="p-6 bg-white rounded-xl shadow-md mb-8 border border-gray-100">
            <h3 class="text-xl font-bold text-pink-600 mb-4">Add New Promo Image</h3>
            ${inputField('promo-imageUrl', 'Image URL (Link to Photo)', 'url', '', true, 'e.g., https://placehold.co/600x200/DB2777/fff?text=Sale+Promo')}
            <button type="submit" class="w-full mt-6 px-4 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-pink-600 hover:bg-pink-700 transition duration-150">
                Add Promo Image
            </button>
        </form>
    `;
    
    const listHtml = promos.length > 0 ? promos.map(p => `
        <div class="bg-white rounded-xl shadow-sm flex flex-col sm:flex-row items-center p-4 mb-4 border border-gray-100 border-l-4 ${p.isActive ? 'border-green-500' : 'border-gray-300'}">
            <img src="${p.imageUrl || 'https://placehold.co/120x60/FCE7F3/DB2777?text=No+Img'}" 
                 alt="Promo Image" 
                 onerror="this.onerror=null;this.src='https://placehold.co/120x60/FCE7F3/DB2777?text=Error';"
                 class="w-full sm:w-32 h-16 object-cover rounded-lg mb-3 sm:mb-0 sm:mr-4 flex-shrink-0">
            <div class="flex-grow w-full">
                <p class="text-sm font-semibold text-gray-800 truncate">${p.imageUrl}</p>
                <p class="text-xs text-gray-500 mt-1">${p.isActive ? '<span class="text-green-600 font-bold">ACTIVE</span>' : 'Inactive'}</p>
            </div>
            <div class="flex space-x-2 mt-3 sm:mt-0 flex-shrink-0">
                <button onclick="window.toggleActivePromo('${p.id}', ${!p.isActive})" 
                    class="p-2 rounded-full ${p.isActive ? 'text-gray-500 hover:bg-gray-100' : 'text-green-600 hover:bg-green-100'} transition"
                    title="${p.isActive ? 'Deactivate' : 'Set Active'}">
                    <i data-lucide="${p.isActive ? 'pause-circle' : 'play-circle'}" class="w-5 h-5"></i>
                </button>
                <button onclick="window.deleteGalleryItem('${p.id}')" class="p-2 rounded-full text-red-500 hover:bg-red-100 transition">
                    <i data-lucide="trash-2" class="w-5 h-5"></i>
                </button>
            </div>
        </div>
    `).join('') : '<p class="text-center text-gray-500 py-8">No promo images added yet.</p>';
    
    return `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-1">
                ${formHtml}
                <div class="p-6 bg-white rounded-xl shadow-md border border-gray-100">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">Currently Active</h3>
                    ${activePromo ? `
                        <img src="${activePromo.imageUrl}" 
                             alt="Active Promo" 
                             onerror="this.onerror=null;this.src='https://placehold.co/600x200/DB2777/fff?text=Error';"
                             class="w-full h-auto object-cover rounded-lg shadow-lg">
                        <p class="text-xs text-center text-gray-500 mt-2 truncate">${activePromo.imageUrl}</p>
                    ` : '<p class="text-center text-gray-500">No promo is currently active.</p>'}
                </div>
            </div>
            <div class="lg:col-span-2">
                <h3 class="text-xl font-bold text-gray-800 mb-4">All Promo Images (${promos.length})</h3>
                <div class="space-y-4">${listHtml}</div>
            </div>
        </div>
    `;
};

const renderCredentialsTab = () => {
    const credentials = state.gallery.filter(item => item.type === 'credential');
    
    const formHtml = `
        <form id="credential-form" class="p-6 bg-white rounded-xl shadow-md mb-8 border border-gray-100">
            <h3 class="text-xl font-bold text-pink-600 mb-4">Add New Certificate/Credential</h3>
            
            ${inputField('credential-imageUrl', 'Image URL (Link to Certificate Photo)', 'url', '', true, 'e.g., https://placehold.co/400x400/F472B6/fff?text=Certificate')}
            
            <button type="submit" class="w-full mt-6 px-4 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-pink-600 hover:bg-pink-700 transition duration-150">
                Add Certificate
            </button>
        </form>
    `;
    
    const listHtml = credentials.length > 0 ? credentials.map(c => `
        <div class="bg-white rounded-xl shadow-sm flex flex-col items-center p-4 mb-4 border border-gray-100 border-l-4 border-accent-pink">
            <img src="${c.imageUrl || 'https://placehold.co/200x150/FCE7F3/DB2777?text=No+Img'}" 
                 alt="Certificate" 
                 onerror="this.onerror=null;this.src='https://placehold.co/200x150/FCE7F3/DB2777?text=Error';"
                 class="w-full h-auto object-cover rounded-lg mb-3 shadow-md max-w-xs">
            <p class="text-xs text-gray-500 mt-2 mb-3 truncate w-full text-center max-w-xs">${c.imageUrl}</p>
            <button onclick="window.deleteGalleryItem('${c.id}')" class="p-2 rounded-full text-red-500 hover:bg-red-100 transition">
                <i data-lucide="trash-2" class="w-5 h-5"></i>
            </button>
        </div>
    `).join('') : '<p class="text-center text-gray-500 py-8">No credentials added yet.</p>';
    
    return `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-1">${formHtml}</div>
            <div class="lg:col-span-2">
                <h3 class="text-xl font-bold text-gray-800 mb-4">Current Certificates (${credentials.length})</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">${listHtml}</div>
            </div>
        </div>
    `;
};


/**
 * Renders the Content Management view.
 * @param {firebase.User} user - The authenticated user object.
 * @returns {string} The HTML for the Content Management view.
 */
export function renderManageView(user) {
    let contentHtml = '';
    let tabTitle = '';
    const userId = user?.uid || 'N/A';
    
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
            <!-- Header with Back Button (Matches image_2f64e8.png) -->
            <header class="flex flex-wrap items-center justify-between p-4 bg-white rounded-xl shadow-md border border-gray-100">
                <div class="flex items-center space-x-4">
                    <button onclick="window.setPage('dashboard')" class="flex items-center text-pink-600 hover:text-pink-700 transition">
                        <i data-lucide="arrow-left" class="w-6 h-6 mr-2"></i>
                        <span class="text-lg font-bold">Back to Dashboard</span>
                    </button>
                    <h1 class="text-2xl font-extrabold text-gray-800">${tabTitle}</h1>
                </div>
                <span class="text-sm text-gray-500 mt-2 sm:mt-0">User ID: ${userId}</span>
            </header>
            
            <!-- Tabs Navigation -->
            <div class="flex bg-white rounded-xl p-2 shadow-sm border border-gray-100">
                <button onclick="window.setTab('designs')" class="tab-button flex-1 text-center py-2 px-4 rounded-lg font-medium ${state.currentTab === 'designs' ? 'bg-accent-pink text-white shadow-md' : 'text-gray-600 hover:bg-light-pink'}">
                    Designs
                </button>
                <button onclick="window.setTab('promo')" class="tab-button flex-1 text-center py-2 px-4 rounded-lg font-medium ${state.currentTab === 'promo' ? 'bg-accent-pink text-white shadow-md' : 'text-gray-600 hover:bg-light-pink'}">
                    Promo
                </button>
                <button onclick="window.setTab('credentials')" class="tab-button flex-1 text-center py-2 px-4 rounded-lg font-medium ${state.currentTab === 'credentials' ? 'bg-accent-pink text-white shadow-md' : 'text-gray-600 hover:bg-light-pink'}">
                    Credentials
                </button>
            </div>
            
            <!-- Tab Content -->
            <div class="mt-6">
                ${contentHtml}
            </div>
        </div>
    `;
}

/**
 * Renders the Admin Dashboard content into the main container.
 * @param {HTMLElement} container - The DOM element to insert content into (usually 'app-content').
 * @param {firebase.User} user - The authenticated user object.
 * @returns {string} The HTML for the Dashboard view.
 */
export function renderAdminLayout(container, user) {
    const adminName = user.displayName || 'Admin';
    const adminEmail = user.email || 'No Email';
    const avatarLetter = adminName.charAt(0).toUpperCase();

    // The main admin dashboard content (based on your layout)
    const adminHTML = `
        <header class="sticky top-0 bg-white shadow-md z-50">
            <div class="w-full px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center max-w-7xl mx-auto">
                <a href="#" class="text-xl font-bold text-pink-600 tracking-wider cursor-pointer">DCAC</a>
                
                <div class="hidden sm:flex space-x-4 items-center">
                    <a href="/home.html" class="text-gray-600 hover:text-pink-600 transition duration-150">Home</a>
                    <a href="/portfolio.html" class="text-gray-600 hover:text-pink-600 transition duration-150">Design Portfolio</a>
                    <a href="#" class="text-gray-600 hover:text-pink-600 transition duration-150">Reports</a>
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
                            <a href="#" class="flex items-center px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white font-medium rounded-lg transition duration-150 shadow-md shadow-pink-600/20">
                                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path></svg>
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
                    <!-- Content Management Card (Redirects via setPage) -->
                    <div class="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition duration-300">
                        <div class="flex justify-between items-center mb-4">
                            <div class="flex items-center">
                                <span class="text-2xl mr-2 text-pink-600">🎨</span>
                                <h3 class="text-lg font-semibold text-gray-800">Content Management</h3>
                            </div>
                            <!-- Primary manage button -->
                            <button id="manageContentBtn" onclick="window.setPage('manage')" class="px-3 py-1 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium rounded-lg transition duration-150">Manage</button>
                        </div>
                        <p class="text-sm text-gray-500 mb-4">Manage website content including designs, promos, credentials, and portfolio showcase.</p>
                        <div class="flex flex-wrap gap-2">
                            <!-- Direct links to tabs -->
                            <button onclick="window.setPage('manage', 'designs')" class="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full border border-gray-300">Designs</button>
                            <button onclick="window.setPage('manage', 'promo')" class="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full border border-gray-300">Promos</button>
                            <button onclick="window.setPage('manage', 'credentials')" class="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full border border-gray-300">Credentials</button>
                        </div>
                    </div>

                    <div class="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition duration-300">
                        <div class="flex justify-between items-center mb-4"><div class="flex items-center"><span class="text-2xl mr-2 text-pink-600">⭐</span><h3 class="text-lg font-semibold text-gray-800">Review Management</h3></div><button id="manageReviewBtn" class="px-3 py-1 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium rounded-lg transition duration-150">Manage</button></div>
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
    `;

    container.innerHTML = adminHTML;
}


/**
 * Attaches all necessary event listeners to the Admin Dashboard elements.
 * @param {function} logoutUser - The logout function from auth_logic.js.
 * @param {object} user - The authenticated user object.
 */
export function attachAdminDashboardListeners(logoutUser, user) {
    const showModal = (id) => document.getElementById(id)?.classList.add('active'); // Use active class
    const hideModal = (id) => document.getElementById(id)?.classList.remove('active');

    // --- Core Action Listeners ---
    document.getElementById('logoutBtn')?.addEventListener('click', logoutUser); 
    
    // The main content management buttons now use the exported setPage function
    document.getElementById('manageContentBtn')?.addEventListener('click', () => setPage('manage')); 
    // The sub-buttons already use inline onclick="window.setPage(...)"

    // Edit Profile Button
    document.getElementById('editProfileBtn')?.addEventListener('click', () => {
        const adminProfileModal = document.getElementById('adminProfileModal');
        if (adminProfileModal) {
            // Update modal inputs before showing
            document.getElementById('adminNameInput').value = user?.displayName || '';
            document.getElementById('adminEmailInput').value = user?.email || '';
            showModal('adminProfileModal');
        }
    });

    // Modal Close Buttons
    document.getElementById('hideAdminModalBtn')?.addEventListener('click', () => { hideModal('adminProfileModal'); });
    document.getElementById('cancelAdminModalBtn')?.addEventListener('click', () => { hideModal('adminProfileModal'); });

    // Modal Overlay Close 
    document.getElementById('adminProfileModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'adminProfileModal') { hideModal('adminProfileModal'); }
    });
    
    // Admin Profile Form Submission (Uses Firebase updateProfile logic)
    document.getElementById('adminProfileForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = document.getElementById('adminNameInput').value;
        
        try {
            await updateProfile(user, { displayName: newName });
            window.renderApp(); // Global function to re-render the whole app
            hideModal('adminProfileModal');
        } catch (error) {
            console.error("Failed to update profile:", error);
            // Instead of alert, you'd show a message in the modal:
            // document.getElementById('profileError').textContent = "Update failed."; 
        }
    });
    
    // Forms for Content Management (Attached on the 'manage' page only)
    const attachContentFormListeners = () => {
        const designForm = document.getElementById('design-form');
        if (designForm) {
            designForm.onsubmit = (e) => {
                e.preventDefault();
                const id = document.getElementById('design-id').value;
                const title = document.getElementById('design-title').value;
                const price = parseFloat(document.getElementById('design-price').value);
                const imageUrl = document.getElementById('design-imageUrl').value;
                saveDesign(id, { title, price, imageUrl });
            };
        }
        
        const promoForm = document.getElementById('promo-form');
        if (promoForm) {
            promoForm.onsubmit = (e) => {
                e.preventDefault();
                const imageUrl = document.getElementById('promo-imageUrl').value;
                saveGalleryItem('promo', { imageUrl });
            };
        }
        
        const credentialForm = document.getElementById('credential-form');
        if (credentialForm) {
            credentialForm.onsubmit = (e) => {
                e.preventDefault();
                const imageUrl = document.getElementById('credential-imageUrl').value;
                saveGalleryItem('credential', { imageUrl });
            };
        }
    };
    
    // Export the form attachment function for use after rendering the manage view
    window.attachContentFormListeners = attachContentFormListeners;

    // Placeholder console logs for other buttons
    document.getElementById('manageReviewBtn')?.addEventListener('click', () => console.log('Review Management Opened'));
    document.getElementById('manageAppointmentsBtn')?.addEventListener('click', () => console.log('Appointments Management Opened'));
}
