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
import { PageHeader } from '@/components/brand/page-header';

export default function AdminUsersPage() {
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
    <>
      <PageHeader
        eyebrow={`§ ${t('description')}`}
        title={<>{t('title').replace(/\s+\S+$/, '')} <em>{t('title').split(/\s+/).slice(-1)[0]}</em></>}
      />

      {/* Stats Cards — brand stat-card layout */}
      <section className="stat-row">
        <div className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">{t('stats.totalUsers')}</span>
            <Users size={18} style={{ color: 'var(--muted)' }} />
          </div>
          <div className="stat-card__value">{stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">{t('stats.verified')}</span>
            <UserCheck size={18} style={{ color: 'var(--success)' }} />
          </div>
          <div className="stat-card__value">{stats.verified}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">{t('stats.disabled')}</span>
            <UserX size={18} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="stat-card__value">{stats.disabled}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">{t('stats.admins')}</span>
            <Shield size={18} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="stat-card__value">{stats.admins}</div>
        </div>
      </section>

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
    </>
  );
}
