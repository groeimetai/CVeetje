'use client';

import { useTranslations } from 'next-intl';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Shield, ShieldCheck, UserX, CheckCircle, XCircle } from 'lucide-react';
import type { AdminUser } from '@/lib/firebase/admin-utils';

interface UsersTableProps {
  users: AdminUser[];
  onUserClick: (user: AdminUser) => void;
}

export function UsersTable({ users, onUserClick }: UsersTableProps) {
  const t = useTranslations('admin');

  const getInitials = (user: AdminUser) => {
    if (user.displayName) {
      return user.displayName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user.email?.[0]?.toUpperCase() || 'U';
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('users.noUsers')}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>{t('users.table.email')}</TableHead>
            <TableHead>{t('users.table.role')}</TableHead>
            <TableHead>{t('users.table.status')}</TableHead>
            <TableHead className="text-right">{t('users.table.credits')}</TableHead>
            <TableHead>{t('users.table.created')}</TableHead>
            <TableHead>{t('users.table.lastLogin')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow
              key={user.uid}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onUserClick(user)}
            >
              <TableCell>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.photoURL || undefined} />
                  <AvatarFallback className="text-xs">{getInitials(user)}</AvatarFallback>
                </Avatar>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{user.displayName || '-'}</span>
                  <span className="text-sm text-muted-foreground">{user.email}</span>
                </div>
              </TableCell>
              <TableCell>
                {user.role === 'admin' ? (
                  <Badge variant="default" className="gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    Admin
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <Shield className="h-3 w-3" />
                    User
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {user.disabled ? (
                    <Badge variant="destructive" className="gap-1">
                      <UserX className="h-3 w-3" />
                      {t('users.table.disabled')}
                    </Badge>
                  ) : user.emailVerified ? (
                    <Badge variant="outline" className="gap-1 text-green-600 border-green-200">
                      <CheckCircle className="h-3 w-3" />
                      {t('users.table.verified')}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-orange-600 border-orange-200">
                      <XCircle className="h-3 w-3" />
                      {t('users.table.unverified')}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <span className="font-mono">{user.credits.total}</span>
                <span className="text-xs text-muted-foreground ml-1">
                  ({user.credits.free}+{user.credits.purchased})
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(user.createdAt)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(user.lastSignIn)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
