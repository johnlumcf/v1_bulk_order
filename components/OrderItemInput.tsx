import React from 'react';
import { Trash2 } from 'lucide-react';
import { OrderItem } from '../types';

interface Props {
  item: OrderItem;
  onChange: (id: string, field: keyof OrderItem, value: string | number) => void;
  onRemove: (id: string) => void;
}

export const OrderItemInput: React.FC<Props> = ({ item, onChange, onRemove }) => {
  return (
    <div className="grid grid-cols-12 gap-2 mb-2 items-start bg-gray-50 p-3 rounded-lg border border-gray-100 animate-fadeIn">
      <div className="col-span-12 sm:col-span-5">
        <input
          type="text"
          placeholder="Description"
          className="w-full p-2 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
          value={item.name}
          onChange={(e) => onChange(item.id, 'name', e.target.value)}
        />
      </div>
      <div className="col-span-4 sm:col-span-2">
        <input
          type="number"
          placeholder="Qty"
          className="w-full p-2 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
          value={item.quantity}
          onChange={(e) => onChange(item.id, 'quantity', parseInt(e.target.value) || 0)}
        />
      </div>
      <div className="col-span-4 sm:col-span-2">
         <input
          type="text"
          placeholder="Unit"
          className="w-full p-2 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
          value={item.unit}
          onChange={(e) => onChange(item.id, 'unit', e.target.value)}
        />
      </div>
      <div className="col-span-3 sm:col-span-2">
         <input
          type="text"
          placeholder="Notes"
          className="w-full p-2 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
          value={item.notes || ''}
          onChange={(e) => onChange(item.id, 'notes', e.target.value)}
        />
      </div>
      <div className="col-span-1 flex justify-center pt-2">
        <button 
            onClick={() => onRemove(item.id)}
            className="text-red-400 hover:text-red-600 transition-colors"
            title="Remove item"
        >
            <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};