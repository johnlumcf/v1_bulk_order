import { OrderDetails } from "../types";

// Helper to format date for ICS
const formatICSDate = (date: Date) => {
  return date.toISOString().replace(/-|:|\.\d\d\d/g, "");
};

// Generates the ICS content string
const generateICSContent = (order: OrderDetails): string => {
  const { clientName, deadlineDate, deadlineTime, items, orderId, location } = order;
  
  const startDateTime = new Date(`${deadlineDate}T${deadlineTime}`);
  const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour duration
  
  // Clean description for the calendar event
  const description = `Type: ${orderId}\\nClient: ${clientName}\\nOutlet: ${location || 'N/A'}\\n\\nItems:\\n${items
    .map((i) => `- ${i.quantity} ${i.unit} ${i.name}`)
    .join("\\n")}`;

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//BulkOrderPro//EN
BEGIN:VEVENT
UID:${orderId.replace(/\s+/g, '')}-${Date.now()}@bulkorderpro.com
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startDateTime)}
DTEND:${formatICSDate(endDateTime)}
SUMMARY:${orderId}: ${clientName}
DESCRIPTION:${description}
LOCATION:${location || 'Logistics Center'}
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Reminder
END:VALARM
END:VEVENT
END:VCALENDAR`;
};

// Primary function to handle "Attaching" the invite
export const shareOrDownloadICS = async (order: OrderDetails) => {
  const icsContent = generateICSContent(order);
  const fileName = `${order.orderId.replace(/\s+/g, '_')}_${order.clientName.replace(/\s+/g, '_') || 'Order'}.ics`;
  const file = new File([icsContent], fileName, { type: 'text/calendar' });

  // Check if the browser supports native sharing (Mobile + Secure Context)
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'Calendar Invite',
        text: `Here is the calendar invite for ${order.clientName}`,
      });
      return true; // Shared successfully
    } catch (error) {
      console.warn('Share failed or cancelled', error);
      // Fallback to download if share fails (rare)
      downloadFile(file);
      return false;
    }
  } else {
    // Desktop or non-supported browser: Download the file
    downloadFile(file);
    return false; // Indicates it was a download, not a share
  }
};

const downloadFile = (file: File) => {
  const url = window.URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', file.name);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};