// Public Availability Calendar - shows available/not available slots synced with Firestore
// Uses same weekday/weekend logic as booking

const APP_ID = 'nailease25-iapt';
const BOOKINGS_COLLECTION_PATH = `artifacts/${APP_ID}/bookings`;

const WEEKDAY_SLOTS = [
    '8:00 AM', '12:00 PM', '4:00 PM', '6:00 PM', '8:00 PM'
];
const WEEKEND_SLOTS = [
    '8:00 AM', '10:00 AM', '3:00 PM', '5:00 PM', '7:00 PM'
];

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

function renderCalendarSkeleton(currentMonth, bookingsByDate) {
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

    days.forEach((d) => {
        if (d === null) {
            html += `<div class="h-24 rounded-lg bg-gray-50 border"></div>`;
        } else {
            const dateStr = formatYmd(new Date(year, month, d));
            const set = new Set(bookingsByDate[dateStr] || []);
            const badge = computeDayBadge(dateStr, set);
            
            // Check available slots
            const availableSlots = getTimeSlotsForDate(dateStr).filter(t => {
                const passed = isTimePassed(dateStr, t);
                const booked = set.has(t);
                return !passed && !booked;
            });

            const isPast = isPastDate(dateStr);
            const hasAvailableSlots = availableSlots.length > 0 && !isPast;

            html += `
                <div class="h-24 rounded-lg border bg-white p-2 flex flex-col justify-between" data-day="${d}">
                    <div class="flex items-center justify-between">
                        <span class="text-sm font-semibold ${isPast ? 'text-gray-400' : 'text-gray-800'}">${d}</span>
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
    });

    html += `</div>`;
    return html;
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

function computeDayBadge(dateStr, bookedTimesSet) {
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

function showTimesModal(dateStr, dayBookingsSet) {
    const slots = getTimeSlotsForDate(dateStr);
    
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
                <span class="inline-block mx-2 px-2 py-0.5 rounded bg-gray-100 text-gray-400">Past</span>
            </div>
            
            <div class="text-center mb-4">
                <a href="book.html" class="bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 rounded-full font-bold transition-all shadow-lg inline-block">
                    Book Now
                </a>
            </div>
            
            <div id="pub-cal-root"></div>
        </div>
    `;

    const root = container.querySelector('#pub-cal-root');
    let currentMonth = new Date();
    let unsubscribe = null;
    let bookingsByDate = {};

    function paint() {
        root.innerHTML = renderCalendarSkeleton(currentMonth, bookingsByDate);
        
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
    }

    // Initial paint
    paint();

    // Live bookings connection to admin calendar
    try {
        const { getFirestore, collection, onSnapshot } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");
        const { getApp, initializeApp } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js");
        
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