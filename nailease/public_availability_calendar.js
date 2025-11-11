// Public Availability Calendar - shows available/not available slots synced with Firestore
// Uses same weekday/weekend logic as booking

const APP_ID = 'nailease25-iapt';
const BOOKINGS_COLLECTION_PATH = `artifacts/${APP_ID}/bookings`;
const BLOCKED_DAYS_COLLECTION = `artifacts/${APP_ID}/blockedDays`;

const WEEKDAY_SLOTS = [
    '8:00 AM', '12:00 PM', '4:00 PM', '6:00 PM', '8:00 PM'
];
const WEEKEND_SLOTS = [
    '8:00 AM', '10:00 AM', '3:00 PM', '5:00 PM', '7:00 PM'
];

// Cache for blocked days
let blockedDaysCache = new Set();

/**
 * Check if a date is blocked
 */
async function isDayBlocked(dateString) {
    if (blockedDaysCache.has(dateString)) {
        return true;
    }
    
    try {
        const { getFirestore, doc, getDoc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
        const { getApp, initializeApp } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js");
        
        const firebaseConfig = {
            apiKey: "AIzaSyACN3A8xm9pz3bryH6xGhDAF6TCwUoGUp4",
            authDomain: "nailease25.firebaseapp.com",
            projectId: "nailease25",
            storageBucket: "nailease25.firebasestorage.app",
            messagingSenderId: "706150189317",
            appId: "1:706150189317:web:82986edbd97f545282cf6c",
            measurementId: "G-RE42B3FVRJ"
        };
        
        let app;
        try {
            app = getApp();
        } catch (e) {
            app = initializeApp(firebaseConfig);
        }
        
        const db = getFirestore(app);
        const blockedDayRef = doc(db, BLOCKED_DAYS_COLLECTION, dateString);
        const blockedDaySnap = await getDoc(blockedDayRef);
        
        if (blockedDaySnap.exists()) {
            const data = blockedDaySnap.data();
            if (data.blocked === true) {
                blockedDaysCache.add(dateString);
                return true;
            }
        }
    } catch (error) {
        console.error('Error checking blocked day:', error);
    }
    
    return false;
}

function getTimeSlotsForDate(dateStr) {
    const [y,m,d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d, 12, 0, 0);
    const day = date.getDay();
    return (day === 0 || day === 6) ? WEEKEND_SLOTS : WEEKDAY_SLOTS;
}

function formatYmd(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function isPastDate(dateStr) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const [y,m,d] = dateStr.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    target.setHours(0,0,0,0);
    return target < today;
}

function isTimePassed(dateStr, timeStr) {
    const [y,m,d] = dateStr.split('-').map(Number);
    const isPM = /PM$/i.test(timeStr);
    const [hh, mm] = timeStr.replace(/\s?(AM|PM)/i,'').split(':').map(Number);
    let hours = (hh % 12) + (isPM ? 12 : 0);
    const date = new Date(y, m - 1, d, hours, mm || 0, 0);
    return date.getTime() < Date.now();
}

async function renderCalendarSkeleton(currentMonth, bookingsByDate) {
    try {
        const first = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const last = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        const startDay = first.getDay();
        const totalDays = last.getDate();
        const days = [];
        for (let i = 0; i < startDay; i++) days.push(null);
        for (let d = 1; d <= totalDays; d++) days.push(d);

        const monthName = currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        let html = `
            <div class="flex items-center justify-between mb-3">
                <button id="pub-cal-prev" class="px-3 py-1 text-sm rounded border bg-white hover:bg-gray-50 transition">&larr; Prev</button>
                <h3 class="text-lg font-bold text-gray-800">${monthName}</h3>
                <button id="pub-cal-next" class="px-3 py-1 text-sm rounded border bg-white hover:bg-gray-50 transition">Next &rarr;</button>
            </div>
            <div class="grid grid-cols-7 gap-1 text-xs text-gray-600 mb-2">
                <div class="text-center font-semibold">Sun</div>
                <div class="text-center font-semibold">Mon</div>
                <div class="text-center font-semibold">Tue</div>
                <div class="text-center font-semibold">Wed</div>
                <div class="text-center font-semibold">Thu</div>
                <div class="text-center font-semibold">Fri</div>
                <div class="text-center font-semibold">Sat</div>
            </div>
            <div class="grid grid-cols-7 gap-2" id="pub-cal-grid">
        `;

        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        // Batch check blocked days for all dates in the month to reduce async calls
        const dateStrings = days.filter(d => d !== null).map(d => formatYmd(new Date(year, month, d)));
        const blockedDaysPromises = dateStrings.map(dateStr => isDayBlocked(dateStr));
        const blockedDaysResults = await Promise.all(blockedDaysPromises);
        const blockedDaysMap = new Map();
        dateStrings.forEach((dateStr, index) => {
            blockedDaysMap.set(dateStr, blockedDaysResults[index]);
        });

        // Get today's date for comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Process days
        for (const d of days) {
            if (d === null) {
                html += `<div class="h-24 rounded-lg bg-gray-50 border"></div>`;
            } else {
                const dateStr = formatYmd(new Date(year, month, d));
                const dateObj = new Date(year, month, d);
                dateObj.setHours(0, 0, 0, 0);
                const isToday = dateObj.getTime() === today.getTime();
                const set = new Set(bookingsByDate[dateStr] || []);
                const dayIsBlocked = blockedDaysMap.get(dateStr) || false;
                const hasBookings = set.size > 0;
                const badge = await computeDayBadge(dateStr, set);
                
                // Check available slots
                const availableSlots = dayIsBlocked ? [] : getTimeSlotsForDate(dateStr).filter(t => {
                    const passed = isTimePassed(dateStr, t);
                    const booked = set.has(t);
                    return !passed && !booked;
                });

                const isPast = isPastDate(dateStr);
                const hasAvailableSlots = !dayIsBlocked && availableSlots.length > 0 && !isPast;
                
                // Determine styling based on status - restore original design with blocked days support
                let dayClasses = 'h-24 rounded-lg border bg-white p-2 flex flex-col justify-between';
                
                if (dayIsBlocked) {
                    dayClasses = 'h-24 rounded-lg border bg-red-50 border-red-300 p-2 flex flex-col justify-between';
                } else if (isPast) {
                    dayClasses = 'h-24 rounded-lg border bg-gray-50 border-gray-200 opacity-60 p-2 flex flex-col justify-between';
                }

                html += `
                    <div class="${dayClasses}" data-day="${d}" data-date="${dateStr}">
                        <div class="flex items-center justify-between">
                            <span class="text-sm font-semibold ${isPast ? 'text-gray-400' : dayIsBlocked ? 'text-red-700' : 'text-gray-800'}">${d}</span>
                            <span class="text-[10px] px-1.5 py-0.5 rounded ${badge.cls}">${badge.text}</span>
                        </div>
                        <button class="text-xs px-2 py-1 rounded font-semibold transition self-stretch view-time-btn ${
                            hasAvailableSlots 
                                ? 'bg-pink-100 text-pink-700 hover:bg-pink-200 cursor-pointer' 
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }" 
                        data-date="${dateStr}" 
                        ${!hasAvailableSlots ? 'disabled' : ''}>
                            ${hasAvailableSlots ? 'View Times' : 'No Slots'}
                        </button>
                    </div>
                `;
            }
        }

        html += `</div>`;
        return html;
    } catch (error) {
        console.error('Error in renderCalendarSkeleton:', error);
        return `<div class="text-red-600 p-4">Error rendering calendar: ${error.message}</div>`;
    }
}

function groupBookingsByDate(bookings) {
    const map = {};
    bookings.forEach(b => {
        const dateStr = b.selectedDate || b.appointmentDate;
        const timeStr = b.selectedTime;
        if (!dateStr || !timeStr) return;
        if (!map[dateStr]) map[dateStr] = new Set();
        map[dateStr].add(timeStr);
    });
    return map;
}

async function computeDayBadge(dateStr, bookedTimesSet) {
    const dayIsBlocked = await isDayBlocked(dateStr);
    if (dayIsBlocked) {
        return { text: 'Blocked', cls: 'bg-red-200 text-red-800' };
    }
    if (isPastDate(dateStr)) {
        return { text: 'Past', cls: 'bg-gray-100 text-gray-400' };
    }
    
    const slots = getTimeSlotsForDate(dateStr);
    const available = slots.filter(t => !bookedTimesSet?.has(t) && !isTimePassed(dateStr, t)).length;
    const total = slots.length;
    if (total === 0) return { text: '', cls: '' };
    if (available === 0) return { text: 'Full', cls: 'bg-red-100 text-red-700' };
    if (available === total) return { text: 'All Free', cls: 'bg-green-100 text-green-700' };
    return { text: `${available}/${total} Free`, cls: 'bg-amber-100 text-amber-700' };
}

async function showTimesModal(dateStr, dayBookingsSet) {
    const dayIsBlocked = await isDayBlocked(dateStr);
    const slots = getTimeSlotsForDate(dateStr);
    
    // If day is blocked, show all slots as blocked
    if (dayIsBlocked) {
        const items = slots.map(t => {
            return `<div class="px-3 py-2 rounded border bg-red-100 text-red-700 text-sm font-semibold text-center">${t} • Day Blocked</div>`;
        }).join('');
        
        const wrapper = document.createElement('div');
        wrapper.className = 'fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4';
        wrapper.innerHTML = `
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
                <div class="flex items-center justify-between mb-3">
                    <h4 class="text-lg font-bold text-gray-800">Time Slots - Day Blocked</h4>
                    <button class="px-2 py-1 text-sm border rounded hover:bg-gray-50 transition" data-close-modal>Close</button>
                </div>
                <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p class="text-sm text-red-800 font-semibold">⚠️ This day is blocked. All time slots are unavailable.</p>
                </div>
                <p class="text-sm text-gray-600 mb-3">Date: ${dateStr}</p>
                <div class="grid grid-cols-1 gap-2 max-h-[60vh] overflow-auto">
                    ${items}
                </div>
                <p class="text-[11px] text-gray-500 mt-3 text-center">This day has been blocked by the administrator.</p>
            </div>
        `;
        document.body.appendChild(wrapper);
        
        wrapper.querySelector('[data-close-modal]').addEventListener('click', () => wrapper.remove());
        wrapper.addEventListener('click', (e) => {
            if (e.target === wrapper) wrapper.remove();
        });
        return;
    }
    
    // Filter only available slots (not booked and not passed)
    const availableSlots = slots.filter(t => {
        const passed = isTimePassed(dateStr, t);
        const booked = dayBookingsSet?.has(t);
        return !passed && !booked;
    });

    const items = availableSlots.map(t => {
        return `<div class="px-3 py-2 rounded border bg-green-50 text-green-600 text-sm font-semibold text-center">${t} • Available</div>`;
    }).join('');

    const wrapper = document.createElement('div');
    wrapper.className = 'fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4';
    wrapper.innerHTML = `
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
            <div class="flex items-center justify-between mb-3">
                <h4 class="text-lg font-bold text-gray-800">Available Time Slots</h4>
                <button class="px-2 py-1 text-sm border rounded hover:bg-gray-50 transition" data-close-modal>Close</button>
            </div>
            <p class="text-sm text-gray-600 mb-3">Date: ${dateStr}</p>
            <div class="grid grid-cols-1 gap-2 max-h-[60vh] overflow-auto">
                ${items || '<div class="text-center text-gray-500 py-6 text-sm">No available time slots for this date.</div>'}
            </div>
            ${availableSlots.length > 0 ? `
                <div class="mt-4 text-center">
                    <a href="book.html?date=${dateStr}" class="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg font-semibold transition inline-block">
                        Book Now
                    </a>
                </div>
            ` : ''}
            <p class="text-[11px] text-gray-500 mt-3 text-center">Shows only available time slots that can be booked.</p>
        </div>
    `;
    document.body.appendChild(wrapper);
    
    // Close modal when clicking outside or on close button
    wrapper.addEventListener('click', (e) => {
        if (e.target === wrapper || e.target?.dataset?.closeModal !== undefined) {
            wrapper.remove();
        }
    });
}

export async function renderPublicAvailabilityCalendar(container) {
    container.innerHTML = `
        <div class="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 class="text-2xl font-bold text-pink-600 mb-4 text-center">Available Time Slots Calendar</h2>
            <p class="text-gray-600 text-center mb-4">Check real-time availability and book your preferred slot</p>
            
            <div class="text-sm text-gray-500 mb-4 text-center">Legend:
                <span class="inline-block mx-2 px-2 py-0.5 rounded bg-green-100 text-green-700">All Free</span>
                <span class="inline-block mx-2 px-2 py-0.5 rounded bg-amber-100 text-amber-700">Partially Free</span>
                <span class="inline-block mx-2 px-2 py-0.5 rounded bg-red-100 text-red-700">Full</span>
                <span class="inline-block mx-2 px-2 py-0.5 rounded bg-red-200 text-red-800">Blocked</span>
                <span class="inline-block mx-2 px-2 py-0.5 rounded bg-gray-100 text-gray-400">Past</span>
            </div>
            
            <div class="text-center mb-4">
                <a href="book.html" class="bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 rounded-full font-bold transition-all shadow-lg inline-block">
                    Book Now
                </a>
            </div>
            
            <div id="pub-cal-root">
                <div class="text-center p-8 text-gray-500">
                    <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mb-2"></div>
                    <p>Loading calendar...</p>
                </div>
            </div>
        </div>
    `;

    const root = container.querySelector('#pub-cal-root');
    if (!root) {
        console.error('Calendar root element (#pub-cal-root) not found!');
        container.innerHTML = '<div class="text-red-600 p-4">Error: Calendar root element not found. Please refresh the page.</div>';
        return;
    }
    
    let currentMonth = new Date();
    let unsubscribe = null;
    let bookingsByDate = {};

    async function paint() {
        try {
            if (!root) {
                console.error('Root element is null in paint()');
                return;
            }
            
            const calendarHtml = await renderCalendarSkeleton(currentMonth, bookingsByDate);
            if (!calendarHtml) {
                console.error('renderCalendarSkeleton returned empty HTML');
                root.innerHTML = '<div class="text-red-600 p-4">Error rendering calendar. Please refresh the page.</div>';
                return;
            }
            
            root.innerHTML = calendarHtml;
            
            // Add event listeners for view time buttons
            root.querySelectorAll('.view-time-btn:not([disabled])').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const dateStr = btn.getAttribute('data-date');
                    const set = new Set(bookingsByDate[dateStr] || []);
                    showTimesModal(dateStr, set);
                });
            });

            // Add event listeners for navigation buttons
            root.querySelector('#pub-cal-prev')?.addEventListener('click', (e) => {
                e.preventDefault();
                currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
                paint();
            });

            root.querySelector('#pub-cal-next')?.addEventListener('click', (e) => {
                e.preventDefault();
                currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
                paint();
            });
        } catch (error) {
            console.error('Error in paint() function:', error);
            if (root) {
                root.innerHTML = `<div class="text-red-600 p-4">Error rendering calendar: ${error.message}. Please refresh the page.</div>`;
            }
        }
    }

    // Initial paint with 2 second loading delay
    setTimeout(async () => {
        await paint();
    }, 2000);

    // Live bookings connection to admin calendar
    try {
        const { getFirestore, collection, onSnapshot, getDocs } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
        const { getApp, initializeApp } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js");
        
        // Firebase configuration
        const firebaseConfig = {
            apiKey: "AIzaSyACN3A8xm9pz3bryH6xGhDAF6TCwUoGUp4",
            authDomain: "nailease25.firebaseapp.com",
            projectId: "nailease25",
            storageBucket: "nailease25.firebasestorage.app",
            messagingSenderId: "706150189317",
            appId: "1:706150189317:web:82986edbd97f545282cf6c",
            measurementId: "G-RE42B3FVRJ"
        };
        
        // Initialize Firebase if not already initialized
        let app;
        try {
            app = getApp();
        } catch (e) {
            app = initializeApp(firebaseConfig);
        }
        
        const db = getFirestore(app);
        const colRef = collection(db, BOOKINGS_COLLECTION_PATH);
        
        // Initialize blocked days listener
        const blockedDaysRef = collection(db, BLOCKED_DAYS_COLLECTION);
        onSnapshot(blockedDaysRef, (snapshot) => {
            blockedDaysCache.clear();
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.date && data.blocked === true) {
                    blockedDaysCache.add(data.date);
                }
            });
            paint(); // Re-render with updated blocked days
        });
        
        // Initial load of blocked days
        const initialBlockedSnapshot = await getDocs(blockedDaysRef);
        initialBlockedSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.date && data.blocked === true) {
                blockedDaysCache.add(data.date);
            }
        });
        
        unsubscribe = onSnapshot(colRef, (snap) => {
            const bookings = snap.docs.map(d => d.data());
            bookingsByDate = Object.fromEntries(
                Object.entries(groupBookingsByDate(bookings)).map(([k, v]) => [k, Array.from(v)])
            );
            paint(); // Re-render with updated data
        });

    } catch (error) {
        console.error('Error connecting to Firestore:', error);
        container.innerHTML += `
            <div class="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                <p class="text-red-600 text-sm">Unable to load real-time availability. Please refresh the page.</p>
            </div>
        `;
    }

    // Cleanup on navigation away
    window.addEventListener('beforeunload', () => {
        if (typeof unsubscribe === 'function') unsubscribe();
    });
}

// Additional function to get available slots for a specific date
export async function getAvailableSlotsForDate(dateStr) {
    try {
        // Check if day is blocked
        const dayIsBlocked = await isDayBlocked(dateStr);
        if (dayIsBlocked) {
            return []; // Return empty array if day is blocked
        }
        
        const { getFirestore, collection, getDocs, query, where } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");
        const { getApp, initializeApp } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js");
        
        const firebaseConfig = {
            apiKey: "AIzaSyACN3A8xm9pz3bryH6xGhDAF6TCwUoGUp4",
            authDomain: "nailease25.firebasestorage.app",
            projectId: "nailease25",
            storageBucket: "nailease25.firebasestorage.app",
            messagingSenderId: "706150189317",
            appId: "1:706150189317:web:82986edbd97f545282cf6c",
            measurementId: "G-RE42B3FVRJ"
        };
        
        let app;
        try {
            app = getApp();
        } catch (e) {
            app = initializeApp(firebaseConfig);
        }
        
        const db = getFirestore(app);
        const colRef = collection(db, BOOKINGS_COLLECTION_PATH);
        
        // Get bookings for the specific date
        const q = query(colRef, where("selectedDate", "==", dateStr));
        const querySnapshot = await getDocs(q);
        const bookedSlots = new Set();
        
        querySnapshot.forEach(doc => {
            const booking = doc.data();
            if (booking.selectedTime) {
                bookedSlots.add(booking.selectedTime);
            }
        });
        
        // Get all possible slots for this date
        const allSlots = getTimeSlotsForDate(dateStr);
        
        // Filter out booked slots and past times
        const availableSlots = allSlots.filter(slot => {
            const passed = isTimePassed(dateStr, slot);
            const booked = bookedSlots.has(slot);
            return !passed && !booked;
        });
        
        return availableSlots;
        
    } catch (error) {
        console.error('Error getting available slots:', error);
        return [];
    }
}