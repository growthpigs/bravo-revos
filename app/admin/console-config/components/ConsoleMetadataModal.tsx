'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Save, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export interface ConsoleMetadataInput {
  name?: string;
  displayName: string;
  systemInstructions?: string;
  isActive: boolean;
}

interface ConsoleMetadataModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialData?: {
    name?: string;
    displayName?: string;
    systemInstructions?: string;
    isActive?: boolean;
  };
  onClose: () => void;
  onSave: (data: ConsoleMetadataInput) => Promise<void>;
}

export function ConsoleMetadataModal({
  open,
  mode,
  initialData,
  onClose,
  onSave,
}: ConsoleMetadataModalProps) {
  const [formData, setFormData] = useState<ConsoleMetadataInput>({
    name: initialData?.name || '',
    displayName: initialData?.displayName || '',
    systemInstructions: initialData?.systemInstructions || '',
    isActive: initialData?.isActive ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setFormData({
        name: initialData?.name || '',
        displayName: initialData?.displayName || '',
        systemInstructions: initialData?.systemInstructions || '',
        isActive: initialData?.isActive ?? true,
      });
      setErrors({});
    }
  }, [open, initialData]);

  // Check if console name already exists
  async function checkNameUniqueness(name: string): Promise<boolean> {
    const supabase = createClient();
    const { data } = await supabase
      .from('console_prompts')
      .select('id')
      .eq('name', name)
      .maybeSingle();

    return !data; // Returns true if name is available
  }

  // Validate form fields
  async function validate(): Promise<boolean> {
    const newErrors: Record<string, string> = {};

    // Validate name (create mode only)
    if (mode === 'create') {
      if (!formData.name) {
        newErrors.name = 'Console name is required';
      } else if (!/^[a-z0-9-]+$/.test(formData.name)) {
        newErrors.name = 'Name must be lowercase letters, numbers, and hyphens only';
      } else if (formData.name.length < 3 || formData.name.length > 50) {
        newErrors.name = 'Name must be 3-50 characters';
      } else {
        // Check uniqueness
        const isUnique = await checkNameUniqueness(formData.name);
        if (!isUnique) {
          newErrors.name = 'Console name already exists';
        }
      }
    }

    // Validate display name
    if (!formData.displayName) {
      newErrors.displayName = 'Display name is required';
    } else if (formData.displayName.length < 3 || formData.displayName.length > 100) {
      newErrors.displayName = 'Display name must be 3-100 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // Handle save
  async function handleSave() {
    const isValid = await validate();
    if (!isValid) return;

    setSaving(true);
    try {
      await onSave(formData);
      // onClose called by parent after successful save
    } catch (err) {
      // Error handled by parent
      console.error('[ConsoleMetadataModal] Save error:', err);
    } finally {
      setSaving(false);
    }
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSave();
      }
    }

    if (open) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, formData]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create New Console' : 'Edit Console Metadata'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a new console configuration. You can edit cartridges after creation.'
              : 'Update console display name and status. Name cannot be changed.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Console Name (create only) */}
          {mode === 'create' && (
            <div>
              <Label htmlFor="name">
                Console Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="marketing-console-v2"
                className={errors.name ? 'border-red-500' : ''}
                disabled={saving}
              />
              <p className="text-xs text-gray-500 mt-1">
                Used in code (e.g., loadConsolePrompt(&apos;marketing-console-v2&apos;))
              </p>
              {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
            </div>
          )}

          {/* Display Name */}
          <div>
            <Label htmlFor="displayName">
              Display Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="displayName"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="Marketing Console V2"
              className={errors.displayName ? 'border-red-500' : ''}
              disabled={saving}
            />
            <p className="text-xs text-gray-500 mt-1">User-friendly label shown in the UI</p>
            {errors.displayName && (
              <p className="text-xs text-red-600 mt-1">{errors.displayName}</p>
            )}
          </div>

          {/* System Instructions (create only) */}
          {mode === 'create' && (
            <div>
              <Label htmlFor="systemInstructions">System Instructions (Optional)</Label>
              <Textarea
                id="systemInstructions"
                value={formData.systemInstructions}
                onChange={(e) =>
                  setFormData({ ...formData, systemInstructions: e.target.value })
                }
                placeholder="Default instructions for backward compatibility..."
                rows={4}
                className="font-mono text-sm"
                disabled={saving}
              />
              <p className="text-xs text-gray-500 mt-1">
                Legacy field for backward compatibility (optional)
              </p>
            </div>
          )}

          {/* Is Active Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="isActive">Active Status</Label>
              <p className="text-xs text-gray-500 mt-1">
                {formData.isActive
                  ? 'Console is active and visible'
                  : 'Console is hidden from dropdown'}
              </p>
            </div>
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              disabled={saving}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {mode === 'create' ? 'Create Console' : 'Save Changes'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
