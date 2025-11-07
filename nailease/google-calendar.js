// google-calendar.js - Google Calendar Integration for NailEase Booking System

/**
 * Creates a Google Calendar event URL that opens Google Calendar with pre-filled event details
 * This is a client-side approach that doesn't require OAuth setup
 */
function createGoogleCalendarEvent(bookingData) {
    const { selectedDate, selectedTime, design, personalInfo, bookingId } = bookingData;
    
    // Parse date and time
    const date = new Date(selectedDate);
    const [time, period] = selectedTime.split(' ');
    const [hours, minutes] = time.split(':');
    
    // Convert to 24-hour format
    let hour24 = parseInt(hours);
    if (period === 'PM' && hour24 !== 12) {
        hour24 += 12;
    } else if (period === 'AM' && hour24 === 12) {
        hour24 = 0;
    }
    
    // Set start time
    const startDateTime = new Date(date);
    startDateTime.setHours(hour24, parseInt(minutes), 0, 0);
    
    // End time is 1 hour after start (adjustable)
    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(endDateTime.getHours() + 1);
    
    // Format dates for Google Calendar URL (YYYYMMDDTHHMMSS)
    const formatGoogleDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}${month}${day}T${hours}${minutes}${seconds}`;
    };
    
    const startDateStr = formatGoogleDate(startDateTime);
    const endDateStr = formatGoogleDate(endDateTime);
    
    // Create event details
    const eventTitle = encodeURIComponent(`Nail Appointment - ${design.name}`);
    const eventDetails = encodeURIComponent(
        `Booking ID: ${bookingId}\n\n` +
        `Design: ${design.name}\n` +
        `Client: ${personalInfo.fullName}\n` +
        `Phone: ${personalInfo.phone}\n` +
        `Email: ${personalInfo.email || 'Not provided'}\n\n` +
        `Total Amount: ₱${design.price.toFixed(2)}\n` +
        `Reservation Fee: ₱${(design.price / 2).toFixed(2)}\n\n` +
        `Please arrive on time for your appointment.`
    );
    const eventLocation = encodeURIComponent('DCAC NailEase Studio');
    
    // Create Google Calendar URL
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${startDateStr}/${endDateStr}&details=${eventDetails}&location=${eventLocation}`;
    
    return googleCalendarUrl;
}

/**
 * Opens Google Calendar in a new window/tab with the event pre-filled
 */
function addToGoogleCalendar(bookingData) {
    try {
        const calendarUrl = createGoogleCalendarEvent(bookingData);
        window.open(calendarUrl, '_blank');
        return true;
    } catch (error) {
        console.error('Error creating Google Calendar event:', error);
        return false;
    }
}

/**
 * Creates an .ics file for download (works with all calendar apps)
 */
function downloadICSFile(bookingData) {
    const { selectedDate, selectedTime, design, personalInfo, bookingId } = bookingData;
    
    // Parse date and time
    const date = new Date(selectedDate);
    const [time, period] = selectedTime.split(' ');
    const [hours, minutes] = time.split(':');
    
    // Convert to 24-hour format
    let hour24 = parseInt(hours);
    if (period === 'PM' && hour24 !== 12) {
        hour24 += 12;
    } else if (period === 'AM' && hour24 === 12) {
        hour24 = 0;
    }
    
    // Set start time
    const startDateTime = new Date(date);
    startDateTime.setHours(hour24, parseInt(minutes), 0, 0);
    
    // End time is 1 hour after start
    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(endDateTime.getHours() + 1);
    
    // Format dates for ICS (YYYYMMDDTHHMMSS)
    const formatICSDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}${month}${day}T${hours}${minutes}${seconds}`;
    };
    
    const startDateStr = formatICSDate(startDateTime);
    const endDateStr = formatICSDate(endDateTime);
    
    // Create unique ID for the event
    const uid = `${bookingId}@nailease.com`;
    
    // Create ICS content
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//DCAC NailEase//Booking System//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${startDateStr}
DTEND:${endDateStr}
SUMMARY:Nail Appointment - ${design.name}
DESCRIPTION:Booking ID: ${bookingId}\\n\\nDesign: ${design.name}\\nClient: ${personalInfo.fullName}\\nPhone: ${personalInfo.phone}\\nEmail: ${personalInfo.email || 'Not provided'}\\n\\nTotal Amount: ₱${design.price.toFixed(2)}\\nReservation Fee: ₱${(design.price / 2).toFixed(2)}\\n\\nPlease arrive on time for your appointment.
LOCATION:DCAC NailEase Studio
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;
    
    // Create and download the file
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `NailEase_Appointment_${bookingId}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    return true;
}

/**
 * Creates a calendar event in the admin's Google Calendar via Firebase Cloud Function
 * This automatically adds bookings to the admin's calendar
 */
async function createAdminCalendarEvent(bookingData) {
    try {
        // Get Firebase auth instance
        const auth = window.auth;
        if (!auth || !auth.currentUser) {
            return { success: false, message: 'User not authenticated' };
        }

        // Get user's ID token for authentication
        const user = auth.currentUser;
        const idToken = await user.getIdToken();

        // Firebase Cloud Function URL - Update this with your deployed function URL
        // After deploying, get the URL from Firebase Console > Functions
        const CALENDAR_FUNCTION_URL = 'https://us-central1-nailease25.cloudfunctions.net/createCalendarEvent';

        const response = await fetch(CALENDAR_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
                bookingData: bookingData,
                calendarId: 'primary' // Use 'primary' for the admin's primary calendar
            })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            console.log('Calendar event created successfully:', result.eventLink);
            return { 
                success: true, 
                message: 'Event added to admin calendar',
                eventId: result.eventId,
                eventLink: result.eventLink
            };
        } else {
            console.warn('Calendar function returned error:', result.message);
            return { 
                success: false, 
                message: result.message || 'Failed to create calendar event'
            };
        }
    } catch (error) {
        console.error('Error calling calendar function:', error);
        return { 
            success: false, 
            message: 'Calendar service not available. Please check setup.'
        };
    }
}

// Export functions globally
window.createGoogleCalendarEvent = createGoogleCalendarEvent;
window.addToGoogleCalendar = addToGoogleCalendar;
window.downloadICSFile = downloadICSFile;
window.createAdminCalendarEvent = createAdminCalendarEvent;

