export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
}

export interface OrderDetails {
  // Metadata for history
  id?: string; 
  row?: number; // The row number in Google Sheets (for updates)
  timestamp?: string;
  formattedTimestamp?: string; // For Google Sheets
  status?: 'Pending' | 'Saved' | 'Error' | 'Offline-Pending' | 'Synced'; // Sheet Sync Status
  fulfillmentStatus?: 'Pending' | 'Completed'; // Logistics Status

  // Form fields
  clientName: string;
  orderId: string;
  deadlineDate: string;
  deadlineTime: string;
  location: string;
  priority: 'Normal' | 'High' | 'Urgent';
  items: OrderItem[];
  notes: string;
}

export interface GeneratedContent {
  whatsappMessage: string;
  calendarUrl: string;
}