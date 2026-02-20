'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  toggleSelection,
  rangeSelect,
  selectAllVisible,
  deselectAllVisible,
  isAllVisibleSelected,
  getSelectedCount,
} from '@/lib/admin/selection-model';
import type { AdminUser } from '@/lib/admin/user-filter';

type CardType = 'users' | 'groups' | 'journeys' | 'enrollments';

interface Column {
  key: string;
  label: string;
  render?: (row: any) => React.ReactNode;
}

const PAGE_SIZE = 10;

const STATUS_BADGE = (row: any) => {
  if (row.is_decommissioned) {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        Decommissioned
      </span>
    );
  }
  if (!row.is_active) {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
        Inactive
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      Active
    </span>
  );
};

const COLUMNS: Record<CardType, Column[]> = {
  users: [
    { key: 'full_name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Status', render: STATUS_BADGE },
    {
      key: 'created_at',
      label: 'Joined',
      render: (row) => new Date(row.created_at).toLocaleDateString(),
    },
  ],
  groups: [
    { key: 'name', label: 'Name' },
    {
      key: 'group_type',
      label: 'Type',
      render: (row) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          row.group_type === 'system' ? 'bg-purple-100 text-purple-700'
            : row.group_type === 'personal' ? 'bg-gray-100 text-gray-600'
            : 'bg-blue-100 text-blue-700'
        }`}>
          {row.group_type}
        </span>
      ),
    },
    {
      key: 'is_public',
      label: 'Visibility',
      render: (row) => row.is_public ? 'Public' : 'Private',
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (row) => new Date(row.created_at).toLocaleDateString(),
    },
  ],
  journeys: [
    { key: 'title', label: 'Title' },
    {
      key: 'difficulty_level',
      label: 'Difficulty',
      render: (row) => row.difficulty_level ? (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          row.difficulty_level === 'beginner' ? 'bg-green-100 text-green-700'
            : row.difficulty_level === 'intermediate' ? 'bg-yellow-100 text-yellow-700'
            : 'bg-red-100 text-red-700'
        }`}>
          {row.difficulty_level}
        </span>
      ) : '-',
    },
    {
      key: 'is_published',
      label: 'Status',
      render: (row) => row.is_published ? 'Published' : 'Draft',
    },
    {
      key: 'estimated_duration_minutes',
      label: 'Duration',
      render: (row) => row.estimated_duration_minutes ? `${row.estimated_duration_minutes} min` : '-',
    },
  ],
  enrollments: [
    {
      key: 'journey_title',
      label: 'Journey',
      render: (row) => row.journeys?.title || 'Unknown',
    },
    {
      key: 'enrollee',
      label: 'Enrolled By',
      render: (row) => row.users?.full_name || row.groups?.name || '-',
    },
    { key: 'status', label: 'Status' },
    {
      key: 'enrolled_at',
      label: 'Enrolled',
      render: (row) => new Date(row.enrolled_at).toLocaleDateString(),
    },
  ],
};

interface AdminDataPanelProps {
  cardType: CardType;
  totalCount: number | null;
  // Users panel selection (only used when cardType === 'users')
  selectedIds?: Set<string>;
  onSelectionChange?: (newSelection: Set<string>) => void;
  showDecommissioned?: boolean;
  onShowDecommissionedChange?: (show: boolean) => void;
  onUsersDataChange?: (data: AdminUser[]) => void;
  // Increment to trigger data re-fetch (e.g. after an action modifies user data)
  refreshTrigger?: number;
}

export default function AdminDataPanel({
  cardType,
  totalCount,
  selectedIds,
  onSelectionChange,
  showDecommissioned,
  onShowDecommissionedChange,
  onUsersDataChange,
  refreshTrigger,
}: AdminDataPanelProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [filteredCount, setFilteredCount] = useState(totalCount ?? 0);
  const lastClickedIndexRef = useRef<number | null>(null);
  const supabase = createClient();

  const isUsersPanel = cardType === 'users' && selectedIds !== undefined;
  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const columns = COLUMNS[cardType];
  const visibleIds = data.map((row: any) => row.id as string);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const trimmedSearch = search.trim().toLowerCase();

      let query;
      let countQuery;

      switch (cardType) {
        case 'users':
          query = supabase
            .from('users')
            .select('id, full_name, email, is_active, is_decommissioned, created_at')
            .order('created_at', { ascending: false });
          countQuery = supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

          // Apply decommissioned filter
          if (!showDecommissioned) {
            query = query.eq('is_decommissioned', false);
            countQuery = countQuery.eq('is_decommissioned', false);
          }

          if (trimmedSearch) {
            query = query.or(`full_name.ilike.%${trimmedSearch}%,email.ilike.%${trimmedSearch}%`);
            countQuery = countQuery.or(`full_name.ilike.%${trimmedSearch}%,email.ilike.%${trimmedSearch}%`);
          }
          break;

        case 'groups':
          query = supabase
            .from('groups')
            .select('id, name, group_type, is_public, created_at')
            .eq('group_type', 'engagement')
            .order('created_at', { ascending: false });
          countQuery = supabase
            .from('groups')
            .select('*', { count: 'exact', head: true })
            .eq('group_type', 'engagement');
          if (trimmedSearch) {
            query = query.ilike('name', `%${trimmedSearch}%`);
            countQuery = countQuery.ilike('name', `%${trimmedSearch}%`);
          }
          break;

        case 'journeys':
          query = supabase
            .from('journeys')
            .select('id, title, difficulty_level, is_published, estimated_duration_minutes, created_at')
            .order('created_at', { ascending: false });
          countQuery = supabase
            .from('journeys')
            .select('*', { count: 'exact', head: true });
          if (trimmedSearch) {
            query = query.ilike('title', `%${trimmedSearch}%`);
            countQuery = countQuery.ilike('title', `%${trimmedSearch}%`);
          }
          break;

        case 'enrollments':
          query = supabase
            .from('journey_enrollments')
            .select('id, status, enrolled_at, journeys(title), users!journey_enrollments_user_id_fkey(full_name), groups(name)')
            .order('enrolled_at', { ascending: false });
          countQuery = supabase
            .from('journey_enrollments')
            .select('*', { count: 'exact', head: true });
          break;
      }

      const { count } = await countQuery;
      setFilteredCount(count ?? 0);

      const { data: rows, error } = await query.range(from, to);
      if (error) {
        console.error(`Failed to fetch ${cardType}:`, error);
        setData([]);
      } else {
        setData(rows || []);
        // Report users data to parent for action bar
        if (cardType === 'users' && onUsersDataChange && rows) {
          onUsersDataChange(rows as AdminUser[]);
        }
      }
    } catch (err) {
      console.error(`Error fetching ${cardType}:`, err);
      setData([]);
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardType, page, search, supabase, showDecommissioned, onUsersDataChange, refreshTrigger]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page when search changes
  useEffect(() => {
    setPage(0);
  }, [search]);

  // Reset search and page when card type changes
  useEffect(() => {
    setSearch('');
    setPage(0);
  }, [cardType]);

  // --- Selection handlers (users panel only) ---
  const handleRowClick = (rowId: string, rowIndex: number, event: React.MouseEvent) => {
    if (!isUsersPanel || !onSelectionChange || !selectedIds) return;

    if (event.shiftKey && lastClickedIndexRef.current !== null) {
      const newSelection = rangeSelect(visibleIds, selectedIds, lastClickedIndexRef.current, rowIndex);
      onSelectionChange(newSelection);
    } else {
      const newSelection = toggleSelection(selectedIds, rowId);
      onSelectionChange(newSelection);
    }
    lastClickedIndexRef.current = rowIndex;
  };

  const handleHeaderCheckbox = () => {
    if (!isUsersPanel || !onSelectionChange || !selectedIds) return;

    if (isAllVisibleSelected(selectedIds, visibleIds)) {
      onSelectionChange(deselectAllVisible(selectedIds, visibleIds));
    } else {
      onSelectionChange(selectAllVisible(selectedIds, visibleIds));
    }
  };

  const searchPlaceholder = {
    users: 'Search by name or email...',
    groups: 'Search by group name...',
    journeys: 'Search by journey title...',
    enrollments: 'Search not available for enrollments',
  }[cardType];

  const selectedCount = selectedIds ? getSelectedCount(selectedIds) : 0;
  const allVisibleSelected = selectedIds ? isAllVisibleSelected(selectedIds, visibleIds) : false;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-in fade-in duration-200">
      {/* Search + Decommissioned Toggle */}
      <div className="mb-4 flex items-center gap-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          disabled={cardType === 'enrollments'}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
        />
        {isUsersPanel && onShowDecommissionedChange && (
          <label className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap cursor-pointer">
            <input
              type="checkbox"
              checked={showDecommissioned ?? false}
              onChange={(e) => onShowDecommissionedChange(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Show decommissioned
          </label>
        )}
      </div>

      {/* Selection Counter */}
      {isUsersPanel && selectedCount > 0 && (
        <div className="mb-3 px-1 text-sm font-medium text-blue-700">
          {selectedCount} user{selectedCount !== 1 ? 's' : ''} selected
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              {isUsersPanel && (
                <th className="w-10 py-3 px-2">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected && visibleIds.length > 0}
                    onChange={handleHeaderCheckbox}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th key={col.key} className="text-left py-3 px-4 font-semibold text-gray-600">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100">
                  {isUsersPanel && (
                    <td className="py-3 px-2">
                      <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className="py-3 px-4">
                      <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (isUsersPanel ? 1 : 0)} className="py-8 text-center text-gray-500">
                  {search ? 'No results match your search.' : 'No data found.'}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => {
                const isSelected = isUsersPanel && selectedIds?.has(row.id);
                const isDecom = row.is_decommissioned;
                return (
                  <tr
                    key={row.id || idx}
                    onClick={(e) => handleRowClick(row.id, idx, e)}
                    className={`border-b border-gray-100 transition-colors ${
                      isUsersPanel ? 'cursor-pointer' : ''
                    } ${
                      isSelected
                        ? 'bg-blue-50 hover:bg-blue-100'
                        : isDecom
                          ? 'bg-gray-50 hover:bg-gray-100 opacity-60'
                          : 'hover:bg-gray-50'
                    }`}
                  >
                    {isUsersPanel && (
                      <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected ?? false}
                          onChange={() => {
                            if (onSelectionChange && selectedIds) {
                              onSelectionChange(toggleSelection(selectedIds, row.id));
                              lastClickedIndexRef.current = idx;
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className="py-3 px-4 text-gray-700">
                        {col.render ? col.render(row) : row[col.key] ?? '-'}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <p className="text-sm text-gray-500">
          {filteredCount === 0
            ? 'No results'
            : `Showing ${page * PAGE_SIZE + 1}-${Math.min((page + 1) * PAGE_SIZE, filteredCount)} of ${filteredCount}`}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 px-2">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
