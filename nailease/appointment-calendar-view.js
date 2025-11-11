function formatDateString(date) {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Get appointments for a specific date
 */
function getAppointmentsForDate(appointments, dateString) {
    return appointments.filter(apt => apt.selectedDate === dateString && apt.status !== 'cancelled');
}

/**
 * Render calendar view with appointments
 */
export function renderAppointmentCalendar(appointments, currentMonth = new Date()) {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const firstDayWeekday = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    let calendarHtml = `
        <div class="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-pink-50 to-pink-100">
                <h3 class="text-xl font-bold text-gray-800">Appointment Calendar</h3>
                <div class="flex items-center gap-3">
                    <button id="prevMonthBtn" class="p-2 rounded-lg hover:bg-white transition">
                        <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                        </svg>
                    </button>
                    <button id="nextMonthBtn" class="p-2 rounded-lg hover:bg-white transition">
                        <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </button>
                    <button id="todayBtn" class="px-4 py-2 text-sm font-semibold text-pink-600 bg-white rounded-lg hover:bg-pink-50 transition">
                        Today
                    </button>
                </div>
            </div>
            
            <div class="p-6">
                <div class="grid grid-cols-7 gap-2 mb-4">
                    ${dayHeaders.map(day => `
                        <div class="text-center text-sm font-semibold text-gray-600 py-2">${day}</div>
                    `).join('')}
                </div>
                
                <div class="grid grid-cols-7 gap-2" id="calendarDays">
    `;
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayWeekday; i++) {
        calendarHtml += `<div class="aspect-square bg-gray-50 rounded-lg"></div>`;
    }
    
    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dateObj = new Date(year, month, day);
        const isToday = dateObj.getTime() === today.getTime();
        const isPast = dateObj < today;
        
        const dayAppointments = getAppointmentsForDate(appointments, dateString);
        const pendingCount = dayAppointments.filter(apt => apt.status === 'pending').length;
        const confirmedCount = dayAppointments.filter(apt => apt.status === 'confirmed').length;
        const completedCount = dayAppointments.filter(apt => apt.status === 'completed').length;
        
        // Sort appointments by time for display
        const sortedAppointments = [...dayAppointments].sort((a, b) => {
            const timeA = a.selectedTime || '';
            const timeB = b.selectedTime || '';
            return timeA.localeCompare(timeB);
        });
        
        let dayClasses = 'aspect-square bg-white border-2 rounded-lg p-2 overflow-y-auto hover:shadow-md transition-all cursor-pointer';
        if (isToday) {
            dayClasses += ' border-pink-500 bg-pink-50';
        } else if (isPast) {
            dayClasses += ' border-gray-200 opacity-60';
        } else {
            dayClasses += ' border-gray-200 hover:border-pink-300';
        }
        
        calendarHtml += `
            <div class="${dayClasses}" data-date="${dateString}" data-day="${day}">
                <div class="flex items-center justify-between mb-1">
                    <span class="text-sm font-bold ${isToday ? 'text-pink-600' : 'text-gray-700'}">${day}</span>
                    ${isToday ? '<span class="text-xs text-pink-600 font-semibold bg-pink-200 px-1.5 py-0.5 rounded">Today</span>' : ''}
                </div>
                <div class="space-y-1 flex flex-col items-center justify-center h-full">
                    ${!isPast ? `
                        <button class="w-full text-xs bg-pink-100 text-pink-700 px-1.5 py-1 rounded font-semibold hover:bg-pink-200 transition" 
                                onclick="showTimeSlots('${dateString}')">
                            Time
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    // Add empty cells for days after the last day of the month
    const totalCells = firstDayWeekday + daysInMonth;
    const remainingCells = 42 - totalCells; // 6 rows * 7 days = 42 cells
    for (let i = 0; i < remainingCells && i < 7; i++) {
        calendarHtml += `<div class="aspect-square bg-gray-50 rounded-lg"></div>`;
    }
    
    calendarHtml += `
                </div>
            </div>
            
            <div class="px-6 py-4 border-t border-gray-100 bg-gray-50">
                <div class="flex flex-wrap items-center gap-4 text-sm">
                    <div class="flex items-center gap-2">
                        <div class="w-4 h-4 bg-pink-500 rounded"></div>
                        <span class="text-gray-600">Today</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-4 h-4 bg-amber-100 border-2 border-amber-300 rounded"></div>
                        <span class="text-gray-600">Pending</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-4 h-4 bg-emerald-100 border-2 border-emerald-300 rounded"></div>
                        <span class="text-gray-600">Confirmed</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-4 h-4 bg-sky-100 border-2 border-sky-300 rounded"></div>
                        <span class="text-gray-600">Completed</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return calendarHtml;
}

/**
 * Attach event listeners for calendar navigation
 */
export function attachCalendarListeners(onMonthChange) {
    const prevBtn = document.getElementById('prevMonthBtn');
    const nextBtn = document.getElementById('nextMonthBtn');
    const todayBtn = document.getElementById('todayBtn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (onMonthChange) {
                const current = new Date(window.currentCalendarMonth || new Date());
                current.setMonth(current.getMonth() - 1);
                window.currentCalendarMonth = current;
                onMonthChange(current);
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (onMonthChange) {
                const current = new Date(window.currentCalendarMonth || new Date());
                current.setMonth(current.getMonth() + 1);
                window.currentCalendarMonth = current;
                onMonthChange(current);
            }
        });
    }
    
    if (todayBtn) {
        todayBtn.addEventListener('click', () => {
            if (onMonthChange) {
                const today = new Date();
                window.currentCalendarMonth = today;
                onMonthChange(today);
            }
        });
    }
    
    // Add click handlers for calendar days (for time slot display)
    document.querySelectorAll('[data-date]').forEach(dayEl => {
        dayEl.addEventListener('click', (e) => {
            // Don't trigger if clicking the Time button (it has its own handler)
            if (e.target.tagName === 'BUTTON') return;
            
            const date = dayEl.getAttribute('data-date');
            if (window.showTimeSlots) {
                window.showTimeSlots(date);
            }
        });
    });
}

/**
 * Convert 24-hour format to 12-hour format with consistent spacing
 */
function formatTimeTo12Hour(time24) {
    if (!time24) return '';
    
    // If already in 12-hour format, return as is but ensure consistent spacing
    if (time24.includes('AM') || time24.includes('PM')) {
        return time24.replace(/\s+/g, ' ').trim(); // Normalize spacing
    }
    
    // Convert 24-hour format (08:00) to 12-hour format (8:00 AM)
    const [hours, minutes] = time24.split(':');
    const hour24 = parseInt(hours, 10);
    let hour12 = hour24;
    let period = 'AM';
    
    if (hour24 === 0) {
        hour12 = 12;
        period = 'AM';
    } else if (hour24 === 12) {
        hour12 = 12;
        period = 'PM';
    } else if (hour24 > 12) {
        hour12 = hour24 - 12;
        period = 'PM';
    } else {
        hour12 = hour24;
        period = 'AM';
    }
    
    return `${hour12}:00 ${period}`;
}

/**
 * Get available time slots for a date
 * Uses the same logic as the user booking system (book.js)
 * Returns time slots with availability status
 */
export async function getAvailableTimeSlots(dateString, appointments) {
    // Get time slots based on day of week - SAME LOGIC AS USER BOOKING SYSTEM
    const [year, month, day] = dateString.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay();
    
    // Monday-Friday (1-5): 8:00 AM, 12:00 PM, 4:00 PM, 6:00 PM, 8:00 PM
    // Saturday-Sunday (0, 6): 8:00 AM, 10:00 AM, 1:00 PM, 3:00 PM, 5:00 PM, 7:00 PM
    // This matches the exact time slots from book.js getTimeSlotsForDate function
    let allTimeSlots = [];
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // Weekdays (Mon-Fri)
        allTimeSlots = ['8:00 AM', '12:00 PM', '4:00 PM', '6:00 PM', '8:00 PM'];
    } else {
        // Weekends (Sat-Sun)
        allTimeSlots = ['8:00 AM', '10:00 AM', '1:00 PM', '3:00 PM', '5:00 PM', '7:00 PM'];
    }
    
    // Get booked appointments for this date (from both online and walk-in bookings)
    const dayAppointments = appointments.filter(apt => {
        if (!apt.selectedDate || apt.status === 'cancelled') return false;
        // Normalize date format for comparison (YYYY-MM-DD)
        const aptDate = apt.selectedDate instanceof Date 
            ? apt.selectedDate.toISOString().split('T')[0]
            : apt.selectedDate;
        return aptDate === dateString;
    });
    
    // Normalize booked times to match format (handle both 12-hour and 24-hour formats)
    const normalizeTime = (timeStr) => {
        return formatTimeTo12Hour(timeStr);
    };
    
    const bookedTimes = dayAppointments.map(apt => normalizeTime(apt.selectedTime));
    
    // Check if time has passed (for today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = dateObj.getTime() === today.getTime();
    
    return allTimeSlots.map(time => {
        // Normalize time for comparison
        const normalizedTime = normalizeTime(time);
        const isBooked = bookedTimes.includes(normalizedTime) || bookedTimes.includes(time);
        let isPassed = false;
        
        if (isToday) {
            isPassed = isTimePassed(dateString, time);
        }
        
        // Find the appointment that matches this time slot
        const matchingAppointment = dayAppointments.find(apt => {
            const aptTime = normalizeTime(apt.selectedTime);
            return aptTime === normalizedTime || aptTime === time;
        });
        
        return {
            time,
            available: !isBooked && !isPassed,
            booked: isBooked,
            passed: isPassed,
            appointment: matchingAppointment || null
        };
    });
}

/**
 * Check if a time slot has already passed for today
 */
function isTimePassed(dateString, timeString) {
    if (!dateString || !timeString) return false;
    
    const [year, month, day] = dateString.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDateOnly = new Date(selectedDate);
    selectedDateOnly.setHours(0, 0, 0, 0);
    
    if (selectedDateOnly.getTime() !== today.getTime()) {
        return false;
    }
    
    const timeMatch = timeString.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!timeMatch) return false;
    
    let hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]);
    const period = timeMatch[3].toUpperCase();
    
    if (period === 'PM' && hours !== 12) {
        hours += 12;
    } else if (period === 'AM' && hours === 12) {
        hours = 0;
    }
    
    const selectedDateTime = new Date(year, month - 1, day, hours, minutes);
    const now = new Date();
    
    return selectedDateTime < now;
}

/**
 * Show time slots modal for a selected date
 */
export async function showTimeSlotsModal(dateString, appointments, onBookWalkIn) {
    const timeSlots = await getAvailableTimeSlots(dateString, appointments);
    
    // Format date for display
    const [year, month, day] = dateString.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const formattedDate = dateObj.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Get all appointments for this date to show booked slots (from both online and walk-in)
    const dayAppointments = appointments.filter(apt => {
        if (!apt.selectedDate || apt.status === 'cancelled') return false;
        // Normalize date format for comparison
        const aptDate = apt.selectedDate instanceof Date 
            ? apt.selectedDate.toISOString().split('T')[0]
            : apt.selectedDate;
        return aptDate === dateString;
    });
    
    // Normalize time function (same as in getAvailableTimeSlots)
    const normalizeTime = (timeStr) => {
        return formatTimeTo12Hour(timeStr);
    };
    
    // Create a map of normalized time to appointment for easy lookup
    const timeToAppointment = {};
    dayAppointments.forEach(apt => {
        if (apt.selectedTime) {
            const normalizedTime = normalizeTime(apt.selectedTime);
            timeToAppointment[normalizedTime] = apt;
            // Also map the original time format
            timeToAppointment[apt.selectedTime] = apt;
        }
    });
    
    let timeSlotsHtml = timeSlots.map(slot => {
        if (slot.passed) {
            return `
                <div class="px-4 py-3 border-2 border-red-300 rounded-xl text-center font-bold bg-red-50 text-red-400 cursor-not-allowed">
                    <div class="text-base font-extrabold">${slot.time}</div>
                    <div class="text-xs text-red-600 font-semibold mt-1">Passed</div>
                </div>
            `;
        } else if (slot.booked && slot.appointment) {
            const bookingTime = slot.appointment.selectedTime || slot.time;
            const status = slot.appointment.status || 'booked';
            const isConfirmed = status === 'confirmed';
            const isPending = status === 'pending';
            const bgClass = isConfirmed ? 'bg-emerald-50' : isPending ? 'bg-amber-50' : 'bg-gray-50';
            const textClass = isConfirmed ? 'text-emerald-700' : isPending ? 'text-amber-700' : 'text-gray-700';
            const borderClass = isConfirmed ? 'border-emerald-300' : isPending ? 'border-amber-300' : 'border-gray-300';
            const textSecondaryClass = isConfirmed ? 'text-emerald-600' : isPending ? 'text-amber-600' : 'text-gray-600';
            
            return `
                <div class="px-4 py-3 border-2 ${borderClass} rounded-xl text-center font-bold ${bgClass} ${textClass} cursor-not-allowed">
                    <div class="text-base font-extrabold">${bookingTime}</div>
                    <div class="text-xs ${textSecondaryClass} font-semibold mt-1">Unavailable</div>
                </div>
            `;
        } else {
            return `
                <div class="px-4 py-3 border-2 border-green-500 rounded-xl text-center font-bold bg-green-50 text-green-600 cursor-default">
                    <div class="text-base font-extrabold">${slot.time}</div>
                    <div class="text-xs text-green-700 font-semibold mt-1">Available</div>
                </div>
            `;
        }
    }).join('');
    
    // Also show a list of all bookings for this day at the top
    let bookingsListHtml = '';
    if (dayAppointments.length > 0) {
        const sortedBookings = [...dayAppointments].sort((a, b) => {
            const timeA = a.selectedTime || '';
            const timeB = b.selectedTime || '';
            return timeA.localeCompare(timeB);
        });
        
        bookingsListHtml = `
            <div class="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 class="text-sm font-bold text-blue-800 mb-3">Booked Appointments for ${formattedDate}:</h4>
                <div class="space-y-2">
                    ${sortedBookings.map(apt => {
                        const clientName = apt.clientName || 'Unknown';
                        const time = apt.selectedTime || 'N/A';
                        const bookingType = apt.source === 'walk-in' ? 'Walk-in' : 'Online';
                        const status = apt.status || 'booked';
                        const statusBadge = status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 
                                           status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                                           'bg-gray-100 text-gray-700';
                        return `
                            <div class="flex items-center justify-between bg-white rounded-lg p-3 border border-blue-200">
                                <div class="flex items-center gap-3">
                                    <div class="text-lg font-bold text-blue-600">${time}</div>
                                    <div>
                                        <div class="font-semibold text-gray-800">${clientName}</div>
                                        <div class="text-xs text-gray-500">${bookingType}</div>
                                    </div>
                                </div>
                                <span class="text-xs px-2 py-1 rounded ${statusBadge} font-semibold">${status}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    const modalHtml = `
        <div id="timeSlotsModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div class="sticky top-0 bg-gradient-to-r from-pink-500 to-pink-600 text-white p-6 rounded-t-2xl">
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="text-2xl font-bold">Available Time Slots</h3>
                            <p class="text-pink-100 mt-1">${formattedDate}</p>
                        </div>
                        <button onclick="closeTimeSlotsModal()" class="text-white hover:text-pink-200 transition">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="p-6">
                    ${bookingsListHtml}
                    <div class="mb-4">
                        <h4 class="text-sm font-bold text-gray-700 mb-2">All Time Slots for ${formattedDate}:</h4>
                        <p class="text-xs text-gray-500 mb-3">View all time slots and their booking status. Booked slots show the client name and time.</p>
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                        ${timeSlotsHtml}
                    </div>
                    <div class="bg-gray-50 rounded-lg p-4 mb-4">
                        <p class="text-xs text-gray-600 text-center">
                            <strong>Note:</strong> To book a walk-in appointment, please use the "Walk-in" tab in the Appointments section.
                        </p>
                    </div>
                    <div class="flex items-center gap-4 text-sm text-gray-600 pt-4 border-t">
                        <div class="flex items-center gap-2">
                            <div class="w-4 h-4 bg-green-50 border-2 border-green-500 rounded"></div>
                            <span>Available</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <div class="w-4 h-4 bg-emerald-50 border-2 border-emerald-300 rounded"></div>
                            <span>Booked (Confirmed)</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <div class="w-4 h-4 bg-amber-50 border-2 border-amber-300 rounded"></div>
                            <span>Booked (Pending)</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <div class="w-4 h-4 bg-red-50 border-2 border-red-300 rounded"></div>
                            <span>Passed</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('timeSlotsModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Set up global functions
    window.closeTimeSlotsModal = function() {
        const modal = document.getElementById('timeSlotsModal');
        if (modal) modal.remove();
    };
    
    // Note: Available slots are no longer clickable - users must use Walk-in tab to book
    // This function is kept for backward compatibility but won't be called
    window.bookWalkInSlot = function(date, time) {
        // Show message that walk-ins should be booked through the Walk-in tab
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'info',
                title: 'Book Walk-in Appointment',
                text: 'Please use the "Walk-in" tab in the Appointments section to book a walk-in appointment.',
                confirmButtonText: 'Go to Walk-in Tab',
                confirmButtonColor: '#ec4899'
            }).then((result) => {
                if (result.isConfirmed) {
                    // Trigger navigation to walk-in tab if available
                    const walkInTab = document.querySelector('[data-appointments-tab="walk-in"]');
                    if (walkInTab) {
                        walkInTab.click();
                    }
                }
            });
        } else {
            alert('Please use the "Walk-in" tab in the Appointments section to book a walk-in appointment.');
        }
        window.closeTimeSlotsModal();
    };
}

// Export showTimeSlots function globally
window.showTimeSlots = async function(dateString) {
    // Get appointments from global state or fetch them
    let appointments = [];
    if (window.currentAppointments) {
        appointments = window.currentAppointments;
    } else {
        // Try to get from Firestore
        try {
            const { getCurrentAppointments } = await import('./realtime-appointments.js');
            appointments = await getCurrentAppointments();
        } catch (error) {
            console.error('Error fetching appointments:', error);
        }
    }
    
    // Import and show modal
    const { showTimeSlotsModal } = await import('./appointment-calendar-view.js');
    showTimeSlotsModal(dateString, appointments, window.onBookWalkIn);
};