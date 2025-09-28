'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
} from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Profile, TransactionWithProfiles } from '@/lib/supabase-types';
import { getCurrentProfile } from '@/lib/permissions';
import { getTransactionsByProfile } from '@/lib/database';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatCurrencyAmount } from '@/lib/currency';

type TransactionType = 'all' | 'sent' | 'received';
type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

interface FilterState {
  search: string;
  type: TransactionType;
  dateFilter: DateFilter;
  customDateFrom?: string;
  customDateTo?: string;
}

export default function TransactionsPage() {
  const { currencyName } = useCurrency();
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<TransactionWithProfiles[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    type: 'all',
    dateFilter: 'all',
  });

  const limit = 20;

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadTransactions = useCallback(async () => {
    if (!currentProfile) return;

    try {
      setRefreshing(true);
      
      // Build query config based on filters
      const queryConfig = {
        page,
        limit,
        sort: [{ field: 'created_at', order: 'desc' as const }],
      };

      const result = await getTransactionsByProfile(currentProfile.id, queryConfig);
      
      let filteredData = result.data || [];
      
      // Apply client-side filters
      if (filters.type !== 'all') {
        filteredData = filteredData.filter(transaction => 
          filters.type === 'sent' 
            ? transaction.sender_profile_id === currentProfile.id
            : transaction.receiver_profile_id === currentProfile.id
        );
      }

      if (filters.search.trim()) {
        const searchLower = filters.search.toLowerCase();
        filteredData = filteredData.filter(transaction =>
          transaction.message?.toLowerCase().includes(searchLower) ||
          transaction.sender_profile.email.toLowerCase().includes(searchLower) ||
          transaction.receiver_profile.email.toLowerCase().includes(searchLower) ||
          transaction.sender_profile.full_name?.toLowerCase().includes(searchLower) ||
          transaction.receiver_profile.full_name?.toLowerCase().includes(searchLower)
        );
      }

      // Apply date filters
      if (filters.dateFilter !== 'all') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        filteredData = filteredData.filter(transaction => {
          const transactionDate = new Date(transaction.created_at);
          
          switch (filters.dateFilter) {
            case 'today':
              return transactionDate >= today;
            case 'week':
              const weekAgo = new Date(today);
              weekAgo.setDate(weekAgo.getDate() - 7);
              return transactionDate >= weekAgo;
            case 'month':
              const monthAgo = new Date(today);
              monthAgo.setMonth(monthAgo.getMonth() - 1);
              return transactionDate >= monthAgo;
            case 'custom':
              if (filters.customDateFrom) {
                const fromDate = new Date(filters.customDateFrom);
                if (transactionDate < fromDate) return false;
              }
              if (filters.customDateTo) {
                const toDate = new Date(filters.customDateTo);
                toDate.setHours(23, 59, 59, 999);
                if (transactionDate > toDate) return false;
              }
              return true;
            default:
              return true;
          }
        });
      }

      setTransactions(filteredData);
      setTotalPages(result.pagination.total_pages);
      setHasNext(result.pagination.has_next);
      setHasPrev(result.pagination.has_prev);
    } catch (err) {
      console.error('Failed to load transactions:', err);
      setError('Failed to load transactions');
    } finally {
      setRefreshing(false);
    }
  }, [currentProfile, page, filters, limit]);

  useEffect(() => {
    if (currentProfile) {
      loadTransactions();
    }
  }, [currentProfile, loadTransactions]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      const profile = await getCurrentProfile();
      if (!profile) {
        throw new Error('User profile not found');
      }
      setCurrentProfile(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };


  const handleRefresh = () => {
    loadTransactions();
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filtering
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  const getTransactionIcon = (transaction: TransactionWithProfiles) => {
    const isSent = transaction.sender_profile_id === currentProfile?.id;
    return isSent ? (
      <ArrowUpRight className="h-4 w-4 text-red-500" />
    ) : (
      <ArrowDownLeft className="h-4 w-4 text-green-500" />
    );
  };

  const getTransactionBadge = (transaction: TransactionWithProfiles) => {
    const isSent = transaction.sender_profile_id === currentProfile?.id;
    return (
      <Badge variant={isSent ? "destructive" : "default"} className="text-xs">
        {isSent ? 'Sent' : 'Received'}
      </Badge>
    );
  };

  const getOtherUser = (transaction: TransactionWithProfiles) => {
    const isSent = transaction.sender_profile_id === currentProfile?.id;
    return isSent ? transaction.receiver_profile : transaction.sender_profile;
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

  if (loading) {
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
              <Button onClick={loadInitialData} variant="outline">
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
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Transaction Type */}
                <div>
                  <Label>Transaction Type</Label>
                  <Select 
                    value={filters.type} 
                    onValueChange={(value: TransactionType) => handleFilterChange('type', value)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Transactions</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="received">Received</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Filter */}
                <div>
                  <Label>Date Range</Label>
                  <Select 
                    value={filters.dateFilter} 
                    onValueChange={(value: DateFilter) => handleFilterChange('dateFilter', value)}
                  >
                    <SelectTrigger className="mt-2">
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
                    {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} found
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
                <div className="space-y-4">
                  {transactions.map((transaction) => {
                    const otherUser = getOtherUser(transaction);
                    const isSent = transaction.sender_profile_id === currentProfile?.id;
                    
                    return (
                      <div key={transaction.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                        {/* Icon */}
                        <div className="flex-shrink-0">
                          {getTransactionIcon(transaction)}
                        </div>

                        {/* Avatar */}
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {getInitials(otherUser.full_name || null, otherUser.email)}
                          </AvatarFallback>
                        </Avatar>

                        {/* Transaction Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {isSent ? 'Sent to' : 'Received from'} {' '}
                                <span className="font-semibold">
                                  {otherUser.full_name || otherUser.email}
                                </span>
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(transaction.created_at)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`text-lg font-bold ${isSent ? 'text-red-600' : 'text-green-600'}`}>
                                {isSent ? '-' : '+'}{formatCurrencyAmount(transaction.amount, currencyName)}
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
                </div>
              )}

              {/* Pagination */}
              {transactions.length > 0 && (totalPages > 1) && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <p className="text-sm text-gray-700">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => p - 1)}
                      disabled={!hasPrev}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => p + 1)}
                      disabled={!hasNext}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
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