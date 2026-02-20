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
import type { AdminUser, UserFilters } from '@/lib/admin/user-filter';

type CardType = 'users' | 'groups' | 'journeys' | 'enrollments';

interface Column {
  key: string;
  label: string;
  render?: (row: any) => React.ReactNode;
}

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

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
  userFilters?: UserFilters;
  onUserFiltersChange?: (filters: UserFilters) => void;
  onUsersDataChange?: (data: AdminUser[]) => void;
  // Increment to trigger data re-fetch (e.g. after an action modifies user data)
  refreshTrigger?: number;
}

// Build a Supabase query for a given card type, search, and filters.
// Returns the query builder (before .range()) so callers can add .range() or { count }.
function buildQuery(
  supabase: ReturnType<typeof createClient>,
  cardType: CardType,
  trimmedSearch: string,
  userFilters?: UserFilters,
) {
  switch (cardType) {
    case 'users': {
      let q = supabase
        .from('users')
        .select('id, full_name, email, is_active, is_decommissioned, created_at', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (userFilters) {
        const { showActive, showInactive, showDecommissioned } = userFilters;
        if (!(showActive && showInactive && showDecommissioned)) {
          const conditions: string[] = [];
          if (showActive) conditions.push('and(is_active.eq.true,is_decommissioned.eq.false)');
          if (showInactive) conditions.push('and(is_active.eq.false,is_decommissioned.eq.false)');
          if (showDecommissioned) conditions.push('is_decommissioned.eq.true');
          if (conditions.length > 0) {
            q = q.or(conditions.join(','));
          }
        }
      }

      if (trimmedSearch) {
        q = q.or(`full_name.ilike.%${trimmedSearch}%,email.ilike.%${trimmedSearch}%`);
      }
      return q;
    }
    case 'groups': {
      let q = supabase
        .from('groups')
        .select('id, name, group_type, is_public, created_at', { count: 'exact' })
        .eq('group_type', 'engagement')
        .order('created_at', { ascending: false });
      if (trimmedSearch) {
        q = q.ilike('name', `%${trimmedSearch}%`);
      }
      return q;
    }
    case 'journeys': {
      let q = supabase
        .from('journeys')
        .select('id, title, difficulty_level, is_published, estimated_duration_minutes, created_at', { count: 'exact' })
        .order('created_at', { ascending: false });
      if (trimmedSearch) {
        q = q.ilike('title', `%${trimmedSearch}%`);
      }
      return q;
    }
    case 'enrollments': {
      return supabase
        .from('journey_enrollments')
        .select('id, status, enrolled_at, journeys(title), users!journey_enrollments_user_id_fkey(full_name), groups(name)', { count: 'exact' })
        .order('enrolled_at', { ascending: false });
    }
  }
}

// Fetch users via server-side API route (uses service_role, bypasses RLS)
async function fetchUsersViaAPI(
  page: number,
  pageSize: number,
  search: string,
  filters?: UserFilters,
): Promise<{ rows: any[]; count: number } | null> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    showActive: String(filters?.showActive ?? true),
    showInactive: String(filters?.showInactive ?? true),
    showDecommissioned: String(filters?.showDecommissioned ?? false),
  });
  if (search) params.set('search', search);

  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const res = await fetch(`/api/admin/users?${params.toString()}`, { headers });
    if (!res.ok) return null;
    const json = await res.json();
    return { rows: json.data || [], count: json.count ?? 0 };
  } catch {
    return null;
  }
}

// Fetch all matching user IDs via API (for "Select All" across pages)
async function fetchAllUserIdsViaAPI(
  search: string,
  filters?: UserFilters,
): Promise<string[] | null> {
  const params = new URLSearchParams({
    idsOnly: 'true',
    showActive: String(filters?.showActive ?? true),
    showInactive: String(filters?.showInactive ?? true),
    showDecommissioned: String(filters?.showDecommissioned ?? false),
  });
  if (search) params.set('search', search);

  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const res = await fetch(`/api/admin/users?${params.toString()}`, { headers });
    if (!res.ok) return null;
    const json = await res.json();
    return json.ids || [];
  } catch {
    return null;
  }
}

interface CacheEntry {
  rows: any[];
  count: number;
}

// ─── Filter Toggle Pill ──────────────────────────────────────────────────────

function FilterPill({
  label,
  active,
  colorClass,
  onClick,
}: {
  label: string;
  active: boolean;
  colorClass: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
        active
          ? `${colorClass} border-current`
          : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-150'
      }`}
    >
      <span className={`inline-block w-2 h-2 rounded-full ${active ? 'bg-current' : 'bg-gray-300'}`} />
      {label}
    </button>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AdminDataPanel({
  cardType,
  totalCount,
  selectedIds,
  onSelectionChange,
  userFilters,
  onUserFiltersChange,
  onUsersDataChange,
  refreshTrigger,
}: AdminDataPanelProps) {
  const [data, setData] = useState<any[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [filteredCount, setFilteredCount] = useState(totalCount ?? 0);
  const [selectingAll, setSelectingAll] = useState(false);
  const lastClickedIndexRef = useRef<number | null>(null);
  const prefetchCacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const supabase = createClient();

  const isUsersPanel = cardType === 'users' && selectedIds !== undefined;
  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const columns = COLUMNS[cardType];
  const visibleIds = data.map((row: any) => row.id as string);

  // Build a cache key for a given page
  const cacheKey = useCallback(
    (p: number) => `${cardType}|${p}|${debouncedSearch}|${JSON.stringify(userFilters)}|${refreshTrigger}`,
    [cardType, debouncedSearch, userFilters, refreshTrigger],
  );

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Clear prefetch cache when filters/search/card change
  useEffect(() => {
    prefetchCacheRef.current.clear();
  }, [cardType, debouncedSearch, userFilters, refreshTrigger]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [userFilters]);

  // Prefetch a page in the background (fire-and-forget)
  const prefetchPage = useCallback(
    (targetPage: number) => {
      const key = cacheKey(targetPage);
      if (prefetchCacheRef.current.has(key)) return;

      const trimmedSearch = debouncedSearch.trim().toLowerCase();

      if (cardType === 'users') {
        fetchUsersViaAPI(targetPage, PAGE_SIZE, trimmedSearch, userFilters).then((result) => {
          if (result) {
            prefetchCacheRef.current.set(key, result);
          }
        });
      } else {
        const from = targetPage * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        const query = buildQuery(supabase, cardType, trimmedSearch, userFilters);
        query.range(from, to).then(({ data: rows, count, error }: any) => {
          if (!error && rows) {
            prefetchCacheRef.current.set(key, { rows, count: count ?? 0 });
          }
        });
      }
    },
    [supabase, cardType, debouncedSearch, userFilters, cacheKey],
  );

  const fetchData = useCallback(async () => {
    // Check prefetch cache first
    const key = cacheKey(page);
    const cached = prefetchCacheRef.current.get(key);
    if (cached) {
      setData(cached.rows);
      setFilteredCount(cached.count);
      if (cardType === 'users' && onUsersDataChange) {
        onUsersDataChange(cached.rows as AdminUser[]);
      }
      setInitialLoading(false);
      if (page < Math.ceil(cached.count / PAGE_SIZE) - 1) prefetchPage(page + 1);
      if (page > 0) prefetchPage(page - 1);
      return;
    }

    setFetching(true);
    try {
      const trimmedSearch = debouncedSearch.trim().toLowerCase();

      if (cardType === 'users') {
        const result = await fetchUsersViaAPI(page, PAGE_SIZE, trimmedSearch, userFilters);
        if (result) {
          setData(result.rows);
          setFilteredCount(result.count);
          if (onUsersDataChange) {
            onUsersDataChange(result.rows as AdminUser[]);
          }
          const totalPgs = Math.ceil(result.count / PAGE_SIZE);
          if (page < totalPgs - 1) prefetchPage(page + 1);
          if (page > 0) prefetchPage(page - 1);
        } else {
          console.error('Failed to fetch users via API');
          setData([]);
        }
      } else {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        const query = buildQuery(supabase, cardType, trimmedSearch, userFilters);
        const { data: rows, count, error } = await query.range(from, to);

        setFilteredCount(count ?? 0);

        if (error) {
          console.error(`Failed to fetch ${cardType}:`, error);
          setData([]);
        } else {
          setData(rows || []);
          const totalPgs = Math.ceil((count ?? 0) / PAGE_SIZE);
          if (page < totalPgs - 1) prefetchPage(page + 1);
          if (page > 0) prefetchPage(page - 1);
        }
      }
    } catch (err) {
      console.error(`Error fetching ${cardType}:`, err);
      setData([]);
    }
    setFetching(false);
    setInitialLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardType, page, debouncedSearch, supabase, userFilters, onUsersDataChange, refreshTrigger, cacheKey, prefetchPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page when search changes
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  // Reset search and page when card type changes
  useEffect(() => {
    setSearchInput('');
    setDebouncedSearch('');
    setPage(0);
    setInitialLoading(true);
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

  const handleSelectAll = async () => {
    if (!isUsersPanel || !onSelectionChange) return;
    setSelectingAll(true);
    try {
      const trimmedSearch = debouncedSearch.trim().toLowerCase();
      const ids = await fetchAllUserIdsViaAPI(trimmedSearch, userFilters);
      if (ids) {
        onSelectionChange(new Set(ids));
      }
    } catch (err) {
      console.error('Failed to select all users:', err);
    }
    setSelectingAll(false);
  };

  const handleSelectPage = () => {
    if (!isUsersPanel || !onSelectionChange || !selectedIds) return;
    onSelectionChange(selectAllVisible(selectedIds, visibleIds));
  };

  const handleDeselectAll = () => {
    if (!isUsersPanel || !onSelectionChange) return;
    onSelectionChange(new Set());
  };

  // --- Filter toggle handler ---
  const toggleFilter = (key: keyof UserFilters) => {
    if (!userFilters || !onUserFiltersChange) return;
    onUserFiltersChange({ ...userFilters, [key]: !userFilters[key] });
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
      {/* Search */}
      <div className="mb-3">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={searchPlaceholder}
          disabled={cardType === 'enrollments'}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
        />
      </div>

      {/* Filter Toggles + Selection Buttons (users only) */}
      {isUsersPanel && userFilters && onUserFiltersChange && (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          {/* Status filter pills */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-500 mr-1">Show:</span>
            <FilterPill
              label="Active"
              active={userFilters.showActive}
              colorClass="bg-green-50 text-green-700"
              onClick={() => toggleFilter('showActive')}
            />
            <FilterPill
              label="Inactive"
              active={userFilters.showInactive}
              colorClass="bg-yellow-50 text-yellow-700"
              onClick={() => toggleFilter('showInactive')}
            />
            <FilterPill
              label="Decommissioned"
              active={userFilters.showDecommissioned}
              colorClass="bg-red-50 text-red-700"
              onClick={() => toggleFilter('showDecommissioned')}
            />
          </div>

          {/* Separator */}
          <div className="h-5 w-px bg-gray-200" />

          {/* Selection buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSelectAll}
              disabled={selectingAll || filteredCount === 0}
              className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {selectingAll ? 'Selecting...' : `Select All (${filteredCount})`}
            </button>
            <button
              onClick={handleSelectPage}
              disabled={visibleIds.length === 0}
              className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Select Page
            </button>
            {selectedCount > 0 && (
              <button
                onClick={handleDeselectAll}
                className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
              >
                Deselect All
              </button>
            )}
          </div>
        </div>
      )}

      {/* Selection Counter */}
      {isUsersPanel && selectedCount > 0 && (
        <div className="mb-3 px-1 text-sm font-medium text-blue-700">
          {selectedCount} user{selectedCount !== 1 ? 's' : ''} selected
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto relative">
        {/* Subtle loading overlay — shown when fetching subsequent pages (not initial load) */}
        {fetching && !initialLoading && (
          <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center pointer-events-none">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
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
            {initialLoading ? (
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
                  {debouncedSearch ? 'No results match your search.' : 'No data found.'}
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
