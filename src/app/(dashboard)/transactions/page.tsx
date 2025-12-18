'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserAvatar, getUserDisplayName } from '@/components/ui/user-avatar';
import { 
  History,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Users,
  User,
  ArrowRight,
} from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { TransactionWithProfiles } from '@/lib/supabase-types';
import { getTransactionsByProfileClient, getTransactionsByWorkspaceClient } from '@/lib/database-client';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatCurrencyAmount } from '@/lib/currency';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';

type TransactionType = 'all' | 'sent' | 'received';
type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom';
type ViewType = 'you' | 'everyone';

interface FilterState {
  search: string;
  type: TransactionType;
  dateFilter: DateFilter;
  customDateFrom?: string;
  customDateTo?: string;
}

export default function TransactionsPage() {
  const { currencyName } = useCurrency();
  const { profile: currentProfile } = useUser();
  
  // Separate state for each view
  const [transactionsYou, setTransactionsYou] = useState<TransactionWithProfiles[]>([]);
  const [transactionsEveryone, setTransactionsEveryone] = useState<TransactionWithProfiles[]>([]);
  const [totalCountYou, setTotalCountYou] = useState(0);
  const [totalCountEveryone, setTotalCountEveryone] = useState(0);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevFilterRef = useRef<FilterState | null>(null);
  
  // Separate pagination for each view
  const [pageYou, setPageYou] = useState(1);
  const [pageEveryone, setPageEveryone] = useState(1);
  const [totalPagesYou, setTotalPagesYou] = useState(1);
  const [totalPagesEveryone, setTotalPagesEveryone] = useState(1);
  const [hasNextYou, setHasNextYou] = useState(false);
  const [hasNextEveryone, setHasNextEveryone] = useState(false);
  const [hasPrevYou, setHasPrevYou] = useState(false);
  const [hasPrevEveryone, setHasPrevEveryone] = useState(false);
  
  const [view, setView] = useState<ViewType>('you');
  
  // Separate state for search input and actual search filter
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    type: 'all',
    dateFilter: 'all',
  });

  const limit = 10;
  const observerTarget = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Helper to get current view data
  const transactions = view === 'you' ? transactionsYou : transactionsEveryone;
  const totalCount = view === 'you' ? totalCountYou : totalCountEveryone;
  const page = view === 'you' ? pageYou : pageEveryone;
  const totalPages = view === 'you' ? totalPagesYou : totalPagesEveryone;
  const hasNext = view === 'you' ? hasNextYou : hasNextEveryone;
  const hasPrev = view === 'you' ? hasPrevYou : hasPrevEveryone;

  // Update URL when view changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    if (viewParam === 'everyone') {
      setView('everyone');
    } else {
      setView('you');
    }
  }, []);

  const updateView = (newView: ViewType) => {
    setView(newView);
    const url = new URL(window.location.href);
    if (newView === 'everyone') {
      url.searchParams.set('view', 'everyone');
    } else {
      url.searchParams.delete('view');
    }
    window.history.pushState({}, '', url);
  };

  const loadTransactions = useCallback(async (pageNum: number, filterState: FilterState, currentView: ViewType, isLoadMore: boolean = false) => {
    if (!currentProfile) return;

    try {
      if (isLoadMore) {
        setIsLoadingMore(true);
      } else {
        setIsFiltering(true);
      }

      // Build query params for API
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: limit.toString(),
        view: currentView,
        type: filterState.type,
        dateFilter: filterState.dateFilter,
        search: filterState.search,
      });

      // Add custom date params if present
      if (filterState.customDateFrom) {
        params.append('customDateFrom', filterState.customDateFrom);
      }
      if (filterState.customDateTo) {
        params.append('customDateTo', filterState.customDateTo);
      }

      // Get auth token from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No auth session');
      }

      // Call API endpoint
      const response = await fetch(`/api/transactions?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const result = await response.json();

      // Update the correct state based on view
      if (currentView === 'you') {
        if (isLoadMore) {
          setTransactionsYou(prev => [...prev, ...(result.data || [])]);
        } else {
          setTransactionsYou(result.data || []);
        }
        setTotalCountYou(result.pagination?.total || 0);
        setTotalPagesYou(result.pagination?.total_pages || 1);
        setHasNextYou(result.pagination?.has_next || false);
        setHasPrevYou(result.pagination?.has_prev || false);
      } else {
        if (isLoadMore) {
          setTransactionsEveryone(prev => [...prev, ...(result.data || [])]);
        } else {
          setTransactionsEveryone(result.data || []);
        }
        setTotalCountEveryone(result.pagination?.total || 0);
        setTotalPagesEveryone(result.pagination?.total_pages || 1);
        setHasNextEveryone(result.pagination?.has_next || false);
        setHasPrevEveryone(result.pagination?.has_prev || false);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
      setIsFiltering(false);
      setIsLoadingMore(false);
    }
  }, [currentProfile, limit]);

  // Load when filters change or view changes
  useEffect(() => {
    if (currentProfile) {
      // Check if filters actually changed to avoid unnecessary reloads
      if (prevFilterRef.current && JSON.stringify(prevFilterRef.current) === JSON.stringify(filters)) {
        // Filters haven't changed, don't reload
        return;
      }
      
      prevFilterRef.current = filters;
      setLoading(true);
      loadTransactions(1, filters, view, false);
    }
  }, [filters, view, currentProfile, loadTransactions, limit]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasNext && !isLoadingMore && !isFiltering && transactions.length > 0) {
          const newPage = page + 1;
          if (view === 'you') {
            setPageYou(newPage);
          } else {
            setPageEveryone(newPage);
          }
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasNext, isLoadingMore, isFiltering, transactions.length, page, view]);

  // Load more when page changes (for infinite scroll)
  useEffect(() => {
    if (page > 1 && currentProfile) {
      loadTransactions(page, filters, view, true);
    }
  }, [page, currentProfile, loadTransactions, filters, view]);


  const handleRefresh = () => {
    if (view === 'you') {
      setPageYou(1);
      setTransactionsYou([]);
    } else {
      setPageEveryone(1);
      setTransactionsEveryone([]);
    }
    loadTransactions(1, filters, view, false);
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    if (key === 'search') {
      // Update the search input state immediately for UI responsiveness
      setSearchInput(value);
      
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      // Debounce the actual filter update
      debounceTimerRef.current = setTimeout(() => {
        setFilters(prev => ({ ...prev, search: value }));
        // Reset to page 1 when search changes for accurate results
        if (view === 'you') {
          setPageYou(1);
        } else {
          setPageEveryone(1);
        }
      }, 500);
    } else {
      // Other filters apply immediately
      setFilters(prev => ({ ...prev, [key]: value }));
      if (view === 'you') {
        setPageYou(1);
      } else {
        setPageEveryone(1);
      }
    }
  };


  const getTransactionIcon = (transaction: TransactionWithProfiles) => {
    if (view === 'everyone') {
        // Check if user is involved
        if (transaction.sender_profile_id === currentProfile?.id) {
            return <ArrowUpRight className="h-4 w-4 text-red-500" />;
        } else if (transaction.receiver_profile_id === currentProfile?.id) {
            return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
        }
        return <ArrowRight className="h-4 w-4 text-gray-500" />;
    }

    const isSent = transaction.sender_profile_id === currentProfile?.id;
    return isSent ? (
      <ArrowUpRight className="h-4 w-4 text-red-500" />
    ) : (
      <ArrowDownLeft className="h-4 w-4 text-green-500" />
    );
  };

  const getTransactionBadge = (transaction: TransactionWithProfiles) => {
    if (view === 'everyone') {
        // If current user is involved, show Sent/Received badges
        if (transaction.sender_profile_id === currentProfile?.id) {
            return (
                <Badge variant="destructive" className="text-xs bg-red-100 text-red-800 hover:bg-red-100">
                    Sent
                </Badge>
            );
        } else if (transaction.receiver_profile_id === currentProfile?.id) {
            return (
                <Badge variant="default" className="text-xs">
                    Received
                </Badge>
            );
        }
        // For third party transactions, we don't need a badge or maybe a "Public" badge?
        // Leaving empty for now as requested
        return null;
    }

    const isSent = transaction.sender_profile_id === currentProfile?.id;
    return (
      <Badge 
        variant={isSent ? "destructive" : "default"} 
        className={`text-xs ${isSent ? 'bg-red-100 text-red-800 hover:bg-red-100' : ''}`}
      >
        {isSent ? 'Sent' : 'Received'}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading && transactions.length === 0) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={() => loadTransactions(1, filters, view, false)} variant="outline">
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <History className="h-8 w-8 text-blue-600" />
                Transaction History
              </h1>
              <p className="text-gray-600 mt-2">
                View all your {currencyName.toLowerCase()} transactions and activity
              </p>
            </div>
            <Button onClick={handleRefresh} variant="outline" disabled={refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

           {/* View Toggle */}
           <Tabs value={view} onValueChange={(v) => updateView(v as ViewType)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
              <TabsTrigger value="you" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                You
              </TabsTrigger>
              <TabsTrigger value="everyone" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Everyone
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search */}
                <div>
                  <Label htmlFor="search">Search</Label>
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Search messages or names..."
                      value={searchInput}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="pl-10 h-10"
                    />
                  </div>
                </div>

                {/* Transaction Type - Only show for "You" view */}
                {view === 'you' && (
                  <div>
                    <Label>Transaction Type</Label>
                    <Select 
                      value={filters.type} 
                      onValueChange={(value: TransactionType) => handleFilterChange('type', value)}
                    >
                      <SelectTrigger className="mt-2 h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Transactions</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="received">Received</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Date Filter */}
                <div>
                  <Label>Date Range</Label>
                  <Select 
                    value={filters.dateFilter} 
                    onValueChange={(value: DateFilter) => handleFilterChange('dateFilter', value)}
                  >
                    <SelectTrigger className="mt-2 h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">Last 7 Days</SelectItem>
                      <SelectItem value="month">Last 30 Days</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Date Range */}
                {filters.dateFilter === 'custom' && (
                  <div className="md:col-span-2 lg:col-span-1">
                    <Label>Date Range</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        type="date"
                        value={filters.customDateFrom || ''}
                        onChange={(e) => handleFilterChange('customDateFrom', e.target.value)}
                      />
                      <Input
                        type="date"
                        value={filters.customDateTo || ''}
                        onChange={(e) => handleFilterChange('customDateTo', e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Transactions</CardTitle>
                  <CardDescription>
                    {totalCount} transaction{totalCount !== 1 ? 's' : ''} found
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No transactions found</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Try adjusting your filters or send some {currencyName.toLowerCase()} to get started!
                  </p>
                </div>
              ) : (
                <div className="space-y-4 relative">
                  {/* Filtering overlay */}
                  {isFiltering && (
                    <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg z-10">
                      <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                        <p className="text-sm text-gray-600">Filtering transactions...</p>
                      </div>
                    </div>
                  )}
                  {transactions.map((transaction) => {
                    const isSent = transaction.sender_profile_id === currentProfile?.id;
                    const isReceived = transaction.receiver_profile_id === currentProfile?.id;
                    const isThirdParty = !isSent && !isReceived;
                    
                    const displayUser = view === 'everyone' && isThirdParty 
                        ? transaction.sender_profile 
                        : (isSent ? transaction.receiver_profile : transaction.sender_profile);

                    const amountClass = isThirdParty 
                        ? 'text-gray-900' 
                        : (isSent ? 'text-red-600' : 'text-green-600');
                    
                    const amountPrefix = isThirdParty ? '' : (isSent ? '-' : '+');

                    return (
                      <div key={transaction.id} className="flex items-center space-x-4 p-4 border border-[#ebebeb] rounded-lg">
                        {/* Icon */}
                        <div className="flex-shrink-0">
                          {getTransactionIcon(transaction)}
                        </div>

                        {/* Avatar */}
                        <UserAvatar user={displayUser} size="lg" />

                        {/* Transaction Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {isThirdParty ? (
                                    <>
                                        <span className="font-semibold">{getUserDisplayName(transaction.sender_profile)}</span>
                                        {' '}sent to{' '}
                                        <span className="font-semibold">{getUserDisplayName(transaction.receiver_profile)}</span>
                                    </>
                                ) : (
                                    <>
                                        {isSent ? 'Sent to' : 'Received from'} {' '}
                                        <span className="font-semibold">
                                            {getUserDisplayName(displayUser)}
                                        </span>
                                    </>
                                )}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(transaction.created_at)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`text-lg font-bold ${amountClass}`}>
                                {amountPrefix}{formatCurrencyAmount(transaction.amount, currencyName)}
                              </p>
                              {getTransactionBadge(transaction)}
                            </div>
                          </div>
                          
                          {transaction.message && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                              <MessageSquare className="h-3 w-3 inline mr-1 text-gray-400" />
                              {transaction.message}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Infinite scroll observer target */}
                  <div ref={observerTarget} className="py-4 text-center">
                    {isLoadingMore && (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                        <p className="text-sm text-gray-600">Loading more transactions...</p>
                      </div>
                    )}
                    {!hasNext && transactions.length > 0 && (
                      <p className="text-sm text-gray-500">No more transactions to load</p>
                    )}
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        </div>
        </div>
    </ProtectedRoute>
  );
}
