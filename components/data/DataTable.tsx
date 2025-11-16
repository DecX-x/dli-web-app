'use client';

import { DetectionSession } from '@/types/session';
import { ColumnDef } from '@tanstack/react-table';
import { useState, useMemo, memo, useEffect } from 'react';
import {
  TableProvider,
  TableHeader,
  TableHeaderGroup,
  TableHead,
  TableBody,
  TableCell,
  TableColumnHeader,
} from '@/components/ui/shadcn-io/table';
import { TableRow as TableRowRaw } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

/**
 * DataTable component for displaying historical detection sessions
 * Requirements: 4.1, 4.2, 4.3, 4.4
 * Optimized with React.memo and debounced search
 */

interface DataTableProps {
  sessions: DetectionSession[];
  onSessionSelect: (session: DetectionSession) => void;
}

const ITEMS_PER_PAGE = 10;

export const DataTable = memo(function DataTable({ sessions, onSessionSelect }: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Filter sessions based on search query
  const filteredSessions = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return sessions;
    }
    
    const query = debouncedSearchQuery.toLowerCase();
    return sessions.filter((session) => {
      const dateStr = session.timestamp.toLocaleDateString().toLowerCase();
      const timeStr = session.timestamp.toLocaleTimeString().toLowerCase();
      const totalStr = session.totalVehicles.toString();
      
      return (
        dateStr.includes(query) ||
        timeStr.includes(query) ||
        totalStr.includes(query)
      );
    });
  }, [sessions, debouncedSearchQuery]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredSessions.length / ITEMS_PER_PAGE);
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedSessions = filteredSessions.slice(startIndex, endIndex);
  
  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(0);
  }, [debouncedSearchQuery]);

  // Define table columns with sorting
  const columns: ColumnDef<DetectionSession>[] = [
    {
      accessorKey: 'timestamp',
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Timestamp" />
      ),
      cell: ({ row }) => {
        const date = row.original.timestamp;
        return (
          <div className="font-medium">
            {date.toLocaleDateString()} {date.toLocaleTimeString()}
          </div>
        );
      },
      sortingFn: (rowA, rowB) => {
        return rowA.original.timestamp.getTime() - rowB.original.timestamp.getTime();
      },
    },
    {
      accessorKey: 'duration',
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Duration" />
      ),
      cell: ({ row }) => {
        const duration = row.original.duration;
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        return (
          <div>
            {minutes}m {seconds}s
          </div>
        );
      },
    },
    {
      accessorKey: 'totalVehicles',
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Total Vehicles" />
      ),
      cell: ({ row }) => {
        return <div className="font-medium">{row.original.totalVehicles}</div>;
      },
    },
    {
      accessorKey: 'counts',
      header: () => <div>Breakdown</div>,
      cell: ({ row }) => {
        const { cars, truckBus, motorcycle } = row.original.counts;
        return (
          <div className="flex space-grid-3 text-sm">
            <span className="text-vehicle-cars">Cars: {cars}</span>
            <span className="text-vehicle-truck-bus">Trucks: {truckBus}</span>
            <span className="text-vehicle-motorcycle">Motorcycles: {motorcycle}</span>
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: 'averageFps',
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Avg FPS" />
      ),
      cell: ({ row }) => {
        return <div>{row.original.averageFps.toFixed(1)}</div>;
      },
    },
  ];

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
  };

  return (
    <div className="space-grid-4">
      {/* Search Input */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label="Search detection sessions"
          />
        </div>
        {searchQuery && (
          <span className="text-sm text-muted-foreground" role="status">
            {filteredSessions.length} result{filteredSessions.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card">
        <TableProvider columns={columns} data={paginatedSessions}>
          <TableHeader>
            {({ headerGroup }) => (
              <TableHeaderGroup key={headerGroup.id} headerGroup={headerGroup}>
                {({ header }) => <TableHead key={header.id} header={header} />}
              </TableHeaderGroup>
            )}
          </TableHeader>
          <TableBody className="[&_tr]:cursor-pointer">
            {({ row }) => (
              <TableRowRaw
                key={row.id}
                className="hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onSessionSelect(row.original as DetectionSession)}
                onKeyDown={(e: React.KeyboardEvent<HTMLTableRowElement>) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSessionSelect(row.original as DetectionSession);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`View session from ${(row.original as DetectionSession).timestamp.toLocaleString()}`}
                data-state={row.getIsSelected() && 'selected'}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} cell={cell} />
                ))}
              </TableRowRaw>
            )}
          </TableBody>
        </TableProvider>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <nav className="flex items-center justify-between px-2" aria-label="Table pagination">
          <div className="text-sm text-muted-foreground" role="status">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredSessions.length)} of{' '}
            {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center space-grid-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPage === 0}
              aria-label="Go to previous page"
            >
              <ChevronLeft className="h-4 w-4 mr-1" aria-hidden="true" />
              Previous
            </Button>
            <div className="text-sm text-muted-foreground" aria-current="page">
              Page {currentPage + 1} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages - 1}
              aria-label="Go to next page"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" aria-hidden="true" />
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
});
