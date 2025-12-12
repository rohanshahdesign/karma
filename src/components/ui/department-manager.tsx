'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Check } from 'lucide-react';
import { toast } from 'sonner';

interface DepartmentManagerProps {
  departments: string[];
  onChange: (departments: string[]) => void;
  disabled?: boolean;
  maxDepartments?: number;
}

export function DepartmentManager({
  departments,
  onChange,
  disabled = false,
  maxDepartments = 15,
}: DepartmentManagerProps) {
  const [newDepartment, setNewDepartment] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const validateDepartmentName = (name: string): string | null => {
    if (!name || name.trim().length < 2) {
      return 'Department name must be at least 2 characters';
    }
    if (name.trim().length > 50) {
      return 'Department name must be less than 50 characters';
    }
    if (!/^[a-zA-Z0-9\s\-]+$/.test(name.trim())) {
      return 'Department name can only contain letters, numbers, spaces, and hyphens';
    }
    return null;
  };

  const handleAddDepartment = () => {
    const trimmed = newDepartment.trim();
    
    // Validate
    const validationError = validateDepartmentName(trimmed);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    // Check for duplicates (case-insensitive)
    if (departments.some(dept => dept.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('This department already exists');
      return;
    }

    // Check max limit
    if (departments.length >= maxDepartments) {
      toast.error(`Maximum ${maxDepartments} departments allowed`);
      return;
    }

    onChange([...departments, trimmed]);
    setNewDepartment('');
    toast.success(`Added "${trimmed}" department`);
  };

  const handleRemoveDepartment = (index: number) => {
    if (departments.length <= 1) {
      toast.error('At least one department is required');
      return;
    }

    const removed = departments[index];
    const updated = departments.filter((_, i) => i !== index);
    onChange(updated);
    toast.success(`Removed "${removed}" department`);
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(departments[index]);
  };

  const handleSaveEdit = (index: number) => {
    const trimmed = editValue.trim();
    
    // Validate
    const validationError = validateDepartmentName(trimmed);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    // Check for duplicates (excluding the current one)
    if (departments.some((dept, i) => 
      i !== index && dept.toLowerCase() === trimmed.toLowerCase()
    )) {
      toast.error('This department already exists');
      return;
    }

    const updated = [...departments];
    updated[index] = trimmed;
    onChange(updated);
    setEditingIndex(null);
    setEditValue('');
    toast.success('Department updated');
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, action: 'add' | 'edit', index?: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (action === 'add') {
        handleAddDepartment();
      } else if (action === 'edit' && index !== undefined) {
        handleSaveEdit(index);
      }
    } else if (e.key === 'Escape' && action === 'edit') {
      handleCancelEdit();
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Departments */}
      <div>
        <div className="flex flex-wrap gap-2 min-h-[60px] p-3 border border-gray-200 rounded-lg bg-gray-50">
          {departments.length === 0 ? (
            <div className="text-sm text-gray-500 italic">No departments added yet</div>
          ) : (
            departments.map((dept, index) => (
              <div key={index} className="group relative">
                {editingIndex === index ? (
                  // Edit mode
                  <div className="flex items-center gap-1 bg-white border-2 border-blue-500 rounded-md px-2 py-1">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => handleKeyPress(e, 'edit', index)}
                      className="h-6 w-32 text-sm px-1 py-0 border-none focus-visible:ring-0"
                      autoFocus
                      disabled={disabled}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSaveEdit(index)}
                      disabled={disabled}
                      className="h-6 w-6 p-0 hover:bg-green-100"
                    >
                      <Check className="h-3 w-3 text-green-600" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelEdit}
                      disabled={disabled}
                      className="h-6 w-6 p-0 hover:bg-red-100"
                    >
                      <X className="h-3 w-3 text-red-600" />
                    </Button>
                  </div>
                ) : (
                  // Display mode
                  <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-amber-100 transition-colors pr-1 text-sm"
                    onClick={() => !disabled && handleStartEdit(index)}
                  >
                    <span className="mr-2">{dept}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!disabled) handleRemoveDepartment(index);
                      }}
                      disabled={disabled}
                      className="h-4 w-4 p-0 hover:bg-red-200 rounded-full ml-1"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
              </div>
            ))
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Click on a department to edit • Click ✕ to remove • {departments.length}/{maxDepartments} departments
        </p>
      </div>

      {/* Add New Department */}
      <div className="flex gap-2">
        <Input
          value={newDepartment}
          onChange={(e) => setNewDepartment(e.target.value)}
          onKeyDown={(e) => handleKeyPress(e, 'add')}
          placeholder="Enter new department name..."
          disabled={disabled || departments.length >= maxDepartments}
          className="flex-1"
        />
        <Button
          type="button"
          onClick={handleAddDepartment}
          disabled={disabled || !newDepartment.trim() || departments.length >= maxDepartments}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Help text */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Department names: 2-50 characters, letters, numbers, spaces, and hyphens only</p>
        <p>• At least 1 department required, maximum {maxDepartments}</p>
        <p>• Team members will select from these when joining or updating their profile</p>
      </div>
    </div>
  );
}
