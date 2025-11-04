'use client';

import { useState, useEffect } from 'react';
import { Cartridge } from '@/lib/cartridge-utils';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Copy, Trash2, Edit2, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';

interface CartridgeListProps {
  cartridges: Cartridge[];
  isLoading?: boolean;
  onEdit?: (cartridge: Cartridge) => void;
  onDelete?: (cartridgeId: string) => void;
  onDuplicate?: (cartridge: Cartridge) => void;
  onAutoGenerate?: (cartridge: Cartridge) => void;
}

const tierColors: Record<string, string> = {
  system: 'bg-purple-100 text-purple-900',
  agency: 'bg-blue-100 text-blue-900',
  client: 'bg-green-100 text-green-900',
  user: 'bg-amber-100 text-amber-900',
};

export function CartridgeList({
  cartridges,
  isLoading,
  onEdit,
  onDelete,
  onDuplicate,
  onAutoGenerate,
}: CartridgeListProps) {
  const [expandedHierarchy, setExpandedHierarchy] = useState<Set<string>>(new Set());

  if (!cartridges || cartridges.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <Zap className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">No Cartridges</h3>
            <p className="text-gray-600 mt-1">Create your first voice cartridge to get started</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group cartridges by tier for hierarchy visualization
  const groupedByTier = {
    system: cartridges.filter((c) => c.tier === 'system'),
    agency: cartridges.filter((c) => c.tier === 'agency'),
    client: cartridges.filter((c) => c.tier === 'client'),
    user: cartridges.filter((c) => c.tier === 'user'),
  };

  const renderCartridgeRow = (cartridge: Cartridge, level: number = 0) => {
    const childCartridges = cartridges.filter((c) => c.parent_id === cartridge.id);
    const isExpanded = expandedHierarchy.has(cartridge.id);

    return (
      <div key={cartridge.id}>
        <TableRow>
          <TableCell style={{ paddingLeft: `${level * 2}rem` }}>
            <div className="flex items-center gap-2">
              {childCartridges.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 h-6 w-6"
                  onClick={() => {
                    const newExpanded = new Set(expandedHierarchy);
                    if (isExpanded) {
                      newExpanded.delete(cartridge.id);
                    } else {
                      newExpanded.add(cartridge.id);
                    }
                    setExpandedHierarchy(newExpanded);
                  }}
                >
                  <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
                </Button>
              )}
              <span className="font-medium">{cartridge.name}</span>
            </div>
          </TableCell>

          <TableCell>
            <Badge className={tierColors[cartridge.tier]}>
              {cartridge.tier}
            </Badge>
          </TableCell>

          <TableCell className="text-sm text-gray-600">
            {cartridge.description || '—'}
          </TableCell>

          <TableCell>
            <Badge variant={cartridge.is_active ? 'default' : 'outline'}>
              {cartridge.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </TableCell>

          <TableCell className="text-sm text-gray-500">
            {formatDistanceToNow(new Date(cartridge.created_at), { addSuffix: true })}
          </TableCell>

          <TableCell align="right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.(cartridge)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Voice
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate?.(cartridge)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAutoGenerate?.(cartridge)}>
                  <Zap className="h-4 w-4 mr-2" />
                  Auto-Generate
                </DropdownMenuItem>
                {cartridge.tier !== 'system' && (
                  <DropdownMenuItem
                    onClick={() => onDelete?.(cartridge.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>

        {/* Render child cartridges if expanded */}
        {isExpanded &&
          childCartridges.map((child) => renderCartridgeRow(child, level + 1))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Voice Cartridges</CardTitle>
        <CardDescription>
          Manage your voice profiles with hierarchical inheritance. Child cartridges inherit from parents.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead align="right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* System tier */}
              {groupedByTier.system.map((cartridge) =>
                renderCartridgeRow(cartridge)
              )}

              {/* Agency tier */}
              {groupedByTier.agency.map((cartridge) =>
                renderCartridgeRow(cartridge)
              )}

              {/* Client tier */}
              {groupedByTier.client.map((cartridge) =>
                renderCartridgeRow(cartridge)
              )}

              {/* User tier */}
              {groupedByTier.user.map((cartridge) =>
                renderCartridgeRow(cartridge)
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
