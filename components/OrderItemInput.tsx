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
    <div className="grid grid-cols-12 gap-2 mb-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-100 animate-fadeIn">
      
      {/* Description */}
      <div className="col-span-4">
        <input
          type="text"
          placeholder="Description"
          className="w-full p-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
          value={item.name}
          onChange={(e) => onChange(item.id, 'name', e.target.value)}
        />
      </div>

      {/* Quantity */}
      <div className="col-span-2">
        <input
          type="number"
          placeholder="Qty"
          className="w-full p-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
          value={item.quantity}
          onChange={(e) => onChange(item.id, 'quantity', parseInt(e.target.value) || 0)}
        />
      </div>

      {/* Unit */}
      <div className="col-span-2">
         <input
          type="text"
          placeholder="Unit"
          className="w-full p-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
          value={item.unit}
          onChange={(e) => onChange(item.id, 'unit', e.target.value)}
        />
      </div>

      {/* Notes */}
      <div className="col-span-3">
         <input
          type="text"
          placeholder="Notes"
          className="w-full p-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
          value={item.notes || ''}
          onChange={(e) => onChange(item.id, 'notes', e.target.value)}
        />
      </div>

      {/* Delete Button */}
      <div className="col-span-1 flex justify-center">
        <button 
            onClick={() => onRemove(item.id)}
            className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-all"
            title="Remove item"
        >
            <Trash2 size={16} />
        </button>
      </div>

    </div>
  );
};