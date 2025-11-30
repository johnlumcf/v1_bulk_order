import React, { useState, useEffect } from 'react';
import { Package, Plus, Sparkles, Loader2, CalendarClock, Settings, Code, Copy, Check, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { OrderDetails, OrderItem } from './types';
import { OrderItemInput } from './components/OrderItemInput';
import { WhatsAppPreview } from './components/WhatsAppPreview';
import { OrderHistory } from './components/OrderHistory';
import { generateOrderSummary } from './services/geminiService';

const initialItem: OrderItem = {
  id: '1',
  name: '',
  quantity: 0,
  unit: 'boxes',
  notes: ''
};

const initialOrder: OrderDetails = {
  orderId: 'BULK ORDER',
  clientName: '',
  deadlineDate: new Date().toISOString().split('T')[0],
  deadlineTime: '17:00',
  location: '',
  priority: 'Normal',
  items: [initialItem],
  notes: ''
};

// Robust script template that handles GET (Fetch) and POST (Create/Update)
const GAS_SCRIPT_TEMPLATE = `function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Sheet1");
    if (!sheet) {
      sheet = ss.insertSheet("Sheet1");
      // Header Row - Uppercase Titles with explicit STATUS column
      sheet.appendRow(["TIMESTAMP", "STATUS", "ORDER TYPE", "CLIENT", "OUTLET", "PRIORITY", "ITEM COUNT", "ITEMS DETAIL", "NOTES"]);
    }

    // Handle GET: Fetch Pending Orders
    if (!e.postData) {
      // Use getDisplayValues() to get the text exactly as shown in Sheet (preserves AM/PM formatting)
      var rows = sheet.getDataRange().getDisplayValues(); 
      var headers = rows[0];
      var pendingOrders = [];
      
      // Start from row 1 (skip header)
      for (var i = 1; i < rows.length; i++) {
        // Column Index 1 is "STATUS" (B column)
        // We trim just in case there's whitespace
        var status = (rows[i][1] || "").toString().trim();
        
        if (status !== "Completed") {
          pendingOrders.push({
            row: i + 1, // 1-based index for updates
            formattedTimestamp: rows[i][0],
            fulfillmentStatus: status || 'Pending',
            orderId: rows[i][2],
            clientName: rows[i][3],
            location: rows[i][4],
            priority: rows[i][5],
            itemCount: rows[i][6],
            notes: rows[i][8],
            status: 'Synced' // Mark as synced since it came from the sheet
          });
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify(pendingOrders))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Handle POST: Create or Update
    var data = JSON.parse(e.postData.contents);
    var action = data.action || 'create';

    if (action === 'update') {
      // Update Status to Completed
      if (data.row) {
        // Column 2 is STATUS (B Column)
        // Ensure we are updating the correct row
        sheet.getRange(data.row, 2).setValue('Completed');
        return ContentService.createTextOutput(JSON.stringify({ result: "Updated" }))
          .setMimeType(ContentService.MimeType.JSON);
      } else {
        throw new Error("Missing row number for update");
      }
    } else {
      // Create New Order
      var itemsString = "";
      if (data.items && Array.isArray(data.items)) {
        itemsString = data.items.map(function(i) {
          return i.quantity + " " + i.unit + " " + i.name;
        }).join("\\n");
      }

      sheet.appendRow([
        data.formattedTimestamp || new Date(),
        "Pending", // Default STATUS (Column 2)
        data.orderId || "N/A",
        data.clientName || "N/A",
        data.location || "N/A",
        data.priority || "Normal",
        data.items ? data.items.length : 0,
        itemsString,
        data.notes || ""
      ]);

      return ContentService.createTextOutput(JSON.stringify({ result: "Created" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}`;

export default function App() {
  const [order, setOrder] = useState<OrderDetails>(initialOrder);
  const [generatedMessage, setGeneratedMessage] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Settings for Google Sheets
  const [sheetUrl, setSheetUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showScriptTemplate, setShowScriptTemplate] = useState(false);
  const [scriptCopied, setScriptCopied] = useState(false);

  // History / Live Tracker
  const [history, setHistory] = useState<OrderDetails[]>([]);

  // Initialize: Load settings and Offline Cache
  useEffect(() => {
    const savedUrl = localStorage.getItem('bulkOrderSheetUrl');
    if (savedUrl) setSheetUrl(savedUrl);

    // Load Cached History (for offline viewing)
    const cachedHistory = localStorage.getItem('cachedOrderHistory');
    const cachedOfflineQueue = localStorage.getItem('offlineOrderQueue');
    
    let combinedHistory: OrderDetails[] = [];
    
    if (cachedHistory) {
      combinedHistory = [...JSON.parse(cachedHistory)];
    }
    
    if (cachedOfflineQueue) {
      const offlineQueue = JSON.parse(cachedOfflineQueue);
      // Prepend offline items to history
      combinedHistory = [...offlineQueue, ...combinedHistory];
    }
    
    setHistory(combinedHistory);

    // Initial fetch if online and URL exists
    if (savedUrl && navigator.onLine) {
      fetchOrders(savedUrl);
    }

    // Network Listeners
    const handleOnline = () => {
        setIsOnline(true);
        if (savedUrl) {
            syncOfflineQueue(savedUrl);
            fetchOrders(savedUrl);
        }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync Offline Queue when back online
  const syncOfflineQueue = async (url: string) => {
      const cachedQueue = localStorage.getItem('offlineOrderQueue');
      if (!cachedQueue) return;

      const queue: OrderDetails[] = JSON.parse(cachedQueue);
      if (queue.length === 0) return;

      console.log(`Attempting to sync ${queue.length} offline orders...`);
      
      const remainingQueue: OrderDetails[] = [];

      for (const item of queue) {
          try {
             await fetch(url, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ ...item, action: 'create' })
             });
             // Give it a split second to ensure order of operations
             await new Promise(r => setTimeout(r, 500));
          } catch (e) {
              console.error("Sync failed for item", item.clientName);
              remainingQueue.push(item);
          }
      }

      // Update Local Storage
      if (remainingQueue.length === 0) {
          localStorage.removeItem('offlineOrderQueue');
          alert("All offline orders have been synced!");
      } else {
          localStorage.setItem('offlineOrderQueue', JSON.stringify(remainingQueue));
      }
      
      // Refresh Main List
      fetchOrders(url);
  };

  const fetchOrders = async (url: string) => {
    if (!url || !url.includes('/exec')) return;
    
    setIsFetching(true);
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        // Map raw data to OrderDetails structure
        const mappedOrders: OrderDetails[] = data.map((row: any) => ({
          id: `row-${row.row}`,
          row: row.row,
          timestamp: row.formattedTimestamp,
          fulfillmentStatus: row.fulfillmentStatus,
          orderId: row.orderId,
          clientName: row.clientName,
          location: row.location,
          priority: row.priority,
          deadlineDate: '', 
          deadlineTime: '',
          items: [], 
          notes: row.notes,
          status: 'Synced'
        }));
        
        const sortedSynced = mappedOrders.reverse();

        // Merge with Offline Queue so we don't lose pending items on refresh
        const cachedQueue = localStorage.getItem('offlineOrderQueue');
        let finalHistory = sortedSynced;

        if (cachedQueue) {
            const offlineItems = JSON.parse(cachedQueue);
            finalHistory = [...offlineItems, ...sortedSynced];
        }

        setHistory(finalHistory);
        // Cache the Synced part for offline use
        localStorage.setItem('cachedOrderHistory', JSON.stringify(sortedSynced));
      }
    } catch (error) {
      console.error("Failed to fetch orders (Offline or Error)", error);
      // Fallback is already handled by initial load from localStorage
    } finally {
      setIsFetching(false);
    }
  };

  const handleAddItem = () => {
    const newItem: OrderItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      quantity: 0,
      unit: '',
    };
    setOrder(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const handleRemoveItem = (id: string) => {
    setOrder(prev => ({
      ...prev,
      items: prev.items.filter(i => i.id !== id)
    }));
  };

  const handleItemChange = (id: string, field: keyof OrderItem, value: string | number) => {
    setOrder(prev => ({
      ...prev,
      items: prev.items.map(i => i.id === id ? { ...i, [field]: value } : i)
    }));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const summary = await generateOrderSummary(order);
      setGeneratedMessage(summary);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleOrderStatus = async (id: string) => {
    const targetOrder = history.find(o => o.id === id);
    if (!targetOrder) return;

    // Prevent action on offline items that aren't synced yet
    if (targetOrder.status === 'Offline-Pending') {
        alert("Please wait for this order to sync with Google Sheets before marking it as complete.");
        return;
    }

    if (!targetOrder.row || !sheetUrl) return;

    // Optimistic UI Update
    setHistory(prev => prev.filter(item => item.id !== id));

    try {
      await fetch(sheetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'update',
          row: targetOrder.row,
          status: 'Completed'
        })
      });
    } catch (error) {
      console.error("Failed to update status", error);
      alert("Failed to sync status. Please refresh.");
      fetchOrders(sheetUrl);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GAS_SCRIPT_TEMPLATE);
    setScriptCopied(true);
    setTimeout(() => setScriptCopied(false), 2000);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setSheetUrl(url);
    localStorage.setItem('bulkOrderSheetUrl', url);
  };

  const handleSaveToSheet = async () => {
    if (!sheetUrl) {
      alert("Please enter a Google Apps Script Web App URL in the configuration section.");
      setShowSettings(true);
      return;
    }

    if (!sheetUrl.includes('/exec')) {
      alert("Invalid URL. The URL must end in '/exec'.");
      return;
    }

    setIsSaving(true);
    const timestamp = new Date().toISOString();
    const formattedTimestamp = new Date().toLocaleString('en-US', {
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    });
    
    const payload = {
        action: 'create',
        timestamp,
        formattedTimestamp,
        ...order,
        itemCount: order.items.length
    };

    // OFFLINE HANDLING
    if (!navigator.onLine) {
        const offlineItem: OrderDetails = {
            ...order,
            id: `offline-${Date.now()}`,
            timestamp: formattedTimestamp,
            formattedTimestamp,
            fulfillmentStatus: 'Pending',
            status: 'Offline-Pending'
        };

        // Save to Offline Queue in LocalStorage
        const currentQueue = localStorage.getItem('offlineOrderQueue');
        const queue = currentQueue ? JSON.parse(currentQueue) : [];
        queue.push(offlineItem);
        localStorage.setItem('offlineOrderQueue', JSON.stringify(queue));

        // Update UI
        setHistory(prev => [offlineItem, ...prev]);
        setIsSaving(false);
        alert("You are offline. Order saved locally and will sync when connection is restored.");
        return;
    }
    
    try {
        await fetch(sheetUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(payload)
        });

        alert("Order sent to Google Sheet!");
        setTimeout(() => fetchOrders(sheetUrl), 1000);

    } catch (error) {
        console.error("Failed to save", error);
        alert("Network Error. Please check your connection.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleRefresh = () => {
    if (sheetUrl && navigator.onLine) {
        fetchOrders(sheetUrl);
    } else {
        alert("You are offline. Showing cached data.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <Package size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">BulkOrder Pro</h1>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium">
             {isOnline ? (
                 <span className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                     <Wifi size={14} /> Online
                 </span>
             ) : (
                 <span className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                     <WifiOff size={14} /> Offline Mode
                 </span>
             )}
            <span className="hidden sm:inline text-gray-500">Smart Logistics Manager</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Form */}
          <div className="lg:col-span-7 space-y-6">
            
            <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-700">
                <CalendarClock size={20} className="text-blue-500" />
                Order Basics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order Type</label>
                  <select
                    value={order.orderId}
                    onChange={(e) => setOrder({...order, orderId: e.target.value})}
                    className="w-full p-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="BULK ORDER">BULK ORDER</option>
                    <option value="REMINDER">REMINDER</option>
                    <option value="URGENT">URGENT</option>
                    <option value="TAKE NOTE">TAKE NOTE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                  <input
                    type="text"
                    value={order.clientName}
                    onChange={(e) => setOrder({...order, clientName: e.target.value})}
                    placeholder="e.g. Acme Corp"
                    className="w-full p-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">DATE</label>
                  <input
                    type="date"
                    value={order.deadlineDate}
                    onChange={(e) => setOrder({...order, deadlineDate: e.target.value})}
                    className="w-full p-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deadline Time</label>
                  <input
                    type="time"
                    value={order.deadlineTime}
                    onChange={(e) => setOrder({...order, deadlineTime: e.target.value})}
                    className="w-full p-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                 <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">OUTLET</label>
                  <input
                    type="text"
                    value={order.location}
                    onChange={(e) => setOrder({...order, location: e.target.value})}
                    placeholder="e.g. Orchard Branch"
                    className="w-full p-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                   <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                   <div className="flex gap-4">
                      {['Normal', 'High', 'Urgent'].map((p) => (
                        <label key={p} className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name="priority" 
                            checked={order.priority === p} 
                            onChange={() => setOrder({...order, priority: p as any})}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                            p === 'Urgent' ? 'bg-red-100 text-red-700' : 
                            p === 'High' ? 'bg-orange-100 text-orange-700' : 
                            'bg-green-100 text-green-700'
                          }`}>{p}</span>
                        </label>
                      ))}
                   </div>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-700">
                  <Package size={20} className="text-blue-500" />
                  Order Items
                </h2>
                <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-1 rounded-full">{order.items.length} Items</span>
              </div>
              
              <div className="space-y-3">
                {order.items.map((item) => (
                  <OrderItemInput
                    key={item.id}
                    item={item}
                    onChange={handleItemChange}
                    onRemove={handleRemoveItem}
                  />
                ))}
              </div>

              <button
                onClick={handleAddItem}
                className="mt-4 w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all font-medium"
              >
                <Plus size={18} />
                Add Another Item
              </button>
            </section>

             <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                 <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                 <textarea
                    value={order.notes}
                    onChange={(e) => setOrder({...order, notes: e.target.value})}
                    placeholder="Delivery instructions, access codes, etc."
                    className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                 />
             </section>

            {/* Integrations / Settings Section */}
            <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                   <span className="font-semibold text-gray-700 flex items-center gap-2 text-sm">
                     <Settings size={16} /> Configuration & Integration
                   </span>
                   <span className="text-xs text-gray-400">{showSettings ? 'Hide' : 'Show'}</span>
                </button>
                
                {showSettings && (
                  <div className="p-6 border-t border-gray-200 animate-fadeIn space-y-4">
                     <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-2">Google Sheets Connection</h3>
                        <p className="text-xs text-gray-500 mb-3">
                            Paste your <strong>Web App Executable URL</strong> below. 
                        </p>
                        <div className="relative">
                            <input
                                type="text"
                                value={sheetUrl}
                                onChange={handleUrlChange}
                                placeholder="https://script.google.com/macros/s/.../exec"
                                className={`w-full p-2.5 pl-3 pr-10 border rounded-lg text-sm outline-none transition
                                    ${sheetUrl && !sheetUrl.includes('/exec') ? 'border-red-300 bg-red-50 focus:ring-red-200' : 'border-gray-300 bg-white focus:ring-blue-500'}
                                `}
                            />
                            {sheetUrl && !sheetUrl.includes('/exec') && (
                                <div className="absolute right-3 top-2.5 text-red-500" title="URL must end in /exec">
                                    <AlertTriangle size={16} />
                                </div>
                            )}
                        </div>
                        {sheetUrl && !sheetUrl.includes('/exec') && (
                            <p className="text-xs text-red-500 mt-1">Error: Use the 'exec' URL, not 'edit' or 'dev'.</p>
                        )}
                     </div>

                     <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <button 
                          onClick={() => setShowScriptTemplate(!showScriptTemplate)}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                            <Code size={12} />
                            {showScriptTemplate ? 'Hide Script Template' : 'Show Script Template'}
                        </button>
                        
                        {showScriptTemplate && (
                            <div className="mt-3 relative">
                                <pre className="text-[10px] bg-gray-800 text-gray-100 p-3 rounded overflow-x-auto whitespace-pre-wrap">
                                    {GAS_SCRIPT_TEMPLATE}
                                </pre>
                                <button 
                                  onClick={handleCopyScript}
                                  className="absolute top-2 right-2 p-1.5 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                                  title="Copy Code"
                                >
                                    {scriptCopied ? <Check size={14} className="text-green-400"/> : <Copy size={14} />}
                                </button>
                                <div className="text-[10px] text-gray-500 mt-2 space-y-1">
                                    <p className="font-semibold text-gray-700">Setup Instructions:</p>
                                    <ol className="list-decimal pl-4 space-y-1">
                                        <li>In Google Sheet: Extensions &gt; Apps Script.</li>
                                        <li><strong>Delete all existing code</strong> and Paste the code above.</li>
                                        <li>Click Save (Disk Icon).</li>
                                        <li><strong>Deploy &gt; New Deployment</strong></li>
                                        <li>Select Type: <strong>Web App</strong></li>
                                        <li>Description: "v3"</li>
                                        <li>Execute as: <strong>Me</strong> (your email)</li>
                                        <li>Who has access: <strong>Anyone</strong> (CRITICAL!)</li>
                                        <li>Click Deploy, Copy the URL ending in <strong>/exec</strong>.</li>
                                        <li className="text-red-600">Note: This script requires uppercase headers. Best to start with a blank sheet.</li>
                                    </ol>
                                </div>
                            </div>
                        )}
                     </div>
                  </div>
                )}
            </section>

             <div className="flex justify-end">
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                    {isGenerating ? 'AI Generating...' : 'Generate Details'}
                </button>
             </div>

          </div>

          {/* Right Column: Preview & History */}
          <div className="lg:col-span-5 space-y-8">
            {generatedMessage ? (
              <WhatsAppPreview 
                message={generatedMessage}
                order={order}
                onSaveToSheet={handleSaveToSheet}
                isSaving={isSaving}
              />
            ) : (
                <div className="h-64 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 p-6 text-center">
                    <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                        <Sparkles size={32} className="text-gray-300" />
                    </div>
                    <p className="font-medium text-gray-500">Ready to Generate</p>
                    <p className="text-sm mt-1 max-w-xs">Fill in the order details and click generate to create a professional WhatsApp summary.</p>
                </div>
            )}

            {/* Live Tracker History */}
            <OrderHistory 
              orders={history} 
              isLoading={isFetching}
              isOnline={isOnline}
              onRefresh={handleRefresh} 
              onToggleStatus={toggleOrderStatus}
            />
          </div>
        </div>
      </main>
    </div>
  );
}