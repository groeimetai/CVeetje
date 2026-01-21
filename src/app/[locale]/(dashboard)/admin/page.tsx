'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { UsersTable } from '@/components/admin/users-table';
import { UserDetailDialog } from '@/components/admin/user-detail-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, RefreshCw, Search, Users, UserCheck, UserX, Shield } from 'lucide-react';
import type { AdminUser } from '@/lib/firebase/admin-utils';

export default function AdminPage() {
  const t = useTranslations('admin');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchUsers = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/users?limit=100');

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users);
      setFilteredUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Filter users based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = users.filter(user =>
      user.email?.toLowerCase().includes(query) ||
      user.displayName?.toLowerCase().includes(query) ||
      user.uid.toLowerCase().includes(query)
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  const handleUserClick = (user: AdminUser) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleUserUpdated = async () => {
    // Refresh the user list after changes
    await fetchUsers(true);

    // If the selected user was updated, refresh their data
    if (selectedUser) {
      const updatedUser = users.find(u => u.uid === selectedUser.uid);
      if (updatedUser) {
        setSelectedUser(updatedUser);
      }
    }
  };

  // Calculate stats
  const stats = {
    total: users.length,
    verified: users.filter(u => u.emailVerified).length,
    disabled: users.filter(u => u.disabled).length,
    admins: users.filter(u => u.role === 'admin').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('stats.totalUsers')}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <span className="text-2xl font-bold">{stats.total}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('stats.verified')}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-green-500" />
            <span className="text-2xl font-bold">{stats.verified}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('stats.disabled')}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <UserX className="h-5 w-5 text-destructive" />
            <span className="text-2xl font-bold">{stats.disabled}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('stats.admins')}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            <span className="text-2xl font-bold">{stats.admins}</span>
          </CardContent>
        </Card>
      </div>

      {/* Users Table Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>{t('users.title')}</CardTitle>
              <CardDescription>{t('users.description')}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('users.search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-[200px] md:w-[250px]"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchUsers(true)}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              <p>{error}</p>
              <Button variant="outline" className="mt-4" onClick={() => fetchUsers()}>
                {t('users.retry')}
              </Button>
            </div>
          ) : (
            <UsersTable
              users={filteredUsers}
              onUserClick={handleUserClick}
            />
          )}
        </CardContent>
      </Card>

      {/* User Detail Dialog */}
      <UserDetailDialog
        user={selectedUser}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUserUpdated={handleUserUpdated}
      />
    </div>
  );
}
