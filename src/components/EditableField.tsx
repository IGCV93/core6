'use client';

interface EditableFieldProps {
  label: string;
  value: string | number;
  isEditing: boolean;
  onEdit: (value: string) => void;
  type?: 'text' | 'number';
  step?: string;
  min?: number;
  max?: number;
}

export default function EditableField({
  label,
  value,
  isEditing,
  onEdit,
  type = 'text',
  step,
  min,
  max
}: EditableFieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
      </label>
      {isEditing ? (
        <input
          type={type}
          value={value}
          onChange={(e) => onEdit(e.target.value)}
          step={step}
          min={min}
          max={max}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      ) : (
        <p className="font-semibold text-gray-900">{value}</p>
      )}
    </div>
  );
}

