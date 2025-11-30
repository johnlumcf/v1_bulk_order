import React from 'react';
import { History, CheckCircle, RefreshCcw, Check, Loader2, WifiOff, Cloud } from 'lucide-react';
import { OrderDetails } from '../types';

interface Props {
  orders: OrderDetails[];
  isLoading: boolean;
  isOnline: boolean;
  onRefresh: () => void;
  onToggleStatus: (id: string) => void;
}

export const OrderHistory: React.FC<Props> = ({ orders, isLoading, isOnline, onRefresh, onToggleStatus }) => {
  return (
    <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fadeIn">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <History size={18} className="text-blue-600" />
          Live Tracker
        </h3>
        <button 
          onClick={onRefresh}
          disabled={isLoading}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition flex items-center gap-1 disabled:opacity-50"
        >
          {isLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
          {isOnline ? 'Refresh' : 'Cached'}
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
            <tr>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Outlet</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.length === 0 ? (
                <tr>
                    <td colSpan={5} className="text-center py-6 text-gray-400 text-xs">
                        {isLoading ? 'Checking for orders...' : isOnline ? 'No pending orders found in Sheet.' : 'No cached orders found.'}
                    </td>
                </tr>
            ) : (
                orders.map((order, idx) => (
                <tr key={order.id || idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                    {order.status === 'Offline-Pending' ? (
                        <span className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200 whitespace-nowrap cursor-help" title="Waiting for internet to sync">
                            <WifiOff size={10} /> Pending Sync
                        </span>
                    ) : (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                if (order.id) onToggleStatus(order.id);
                            }}
                            className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-gray-300 text-gray-600 hover:bg-green-600 hover:text-white hover:border-green-600 transition-all shadow-sm"
                            title="Click to Mark as Complete"
                        >
                            <span className="w-4 h-4 rounded-full border border-gray-400 group-hover:border-white flex items-center justify-center">
                                <Check size={10} className="opacity-0 group-hover:opacity-100" />
                            </span>
                            Mark Done
                        </button>
                    )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                        {order.timestamp ? order.timestamp : '-'}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                        {order.clientName}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                        ${order.orderId === 'URGENT' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}
                    `}>
                        {order.orderId}
                    </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{order.location}</td>
                </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};