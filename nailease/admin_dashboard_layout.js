import { updateProfile } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { saveDesign, deleteDesign, saveGalleryItem, deleteGalleryItem, toggleActivePromo,state, setPage, setTab, editDesign, toggleFeaturedDesign, updateDesignInline 
} from './auth-logic.js';

//pagination per page
const DESIGNS_PER_PAGE = 3; 
const PROMOS_PER_PAGE = 5;
const CREDENTIALS_PER_PAGE = 2;

//input skeleton
const inputField = (id, label, type = 'text', value = '', required = true) => `
    <label for="${id}" class="block text-sm font-medium text-gray-700 mt-3">${label}</label>
    <input type="${type}" id="${id}" name="${id}" ${required ? 'required' : ''} 
        value="${value}"
        class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-3 border focus:border-accent-pink focus:ring focus:ring-accent-pink focus:ring-opacity-50 transition duration-150 ease-in-out bg-white">
`;
/**
 * Renders the Admin Dashboard content into the main container.
 * @param {HTMLElement} container - The main container element.
 * @param {firebase.User} user - The authenticated user object.
   @returns {string} The HTML for the Dashboard view.
*/

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

export function renderAdminLayout(container, user) {
    const adminName = user.displayName || 'Admin';
    const adminEmail = user.email || 'No Email';
    const avatarLetter = adminName.charAt(0).toUpperCase();

    const adminHTML = `
       <header class="sticky top-0 bg-white shadow-md z-50">
            <div class="w-full px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center max-w-7xl mx-auto">
                <a href="#" class="text-xl font-bold text-pink-600 tracking-wider cursor-pointer">DCAC</a>
                
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
       ${adminProfileModalHtml}
      
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
        document.getElementById('manageContentBtn')?.addEventListener('click', () => setPage('manage')); 

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
        document.getElementById('manageAppointmentsBtn')?.addEventListener('click', () => console.log('Appointments Management Opened'));
}
