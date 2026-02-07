'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Shield,
  ShieldCheck,
  UserX,
  UserCheck,
  Trash2,
  Save,
  Loader2,
  Mail,
  Calendar,
  CreditCard,
  FileText,
} from 'lucide-react';
import type { AdminUser } from '@/lib/firebase/admin-utils';
import type { GlobalTemplate } from '@/types';

interface UserDetailDialogProps {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
}

export function UserDetailDialog({
  user,
  open,
  onOpenChange,
  onUserUpdated,
}: UserDetailDialogProps) {
  const t = useTranslations('admin');
  const [loading, setLoading] = useState(false);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [disableReason, setDisableReason] = useState('');
  const [addCredits, setAddCredits] = useState('');
  const [globalTemplates, setGlobalTemplates] = useState<GlobalTemplate[]>([]);
  const [assignedTemplateIds, setAssignedTemplateIds] = useState<string[]>([]);
  const [templatesSaving, setTemplatesSaving] = useState(false);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);

  // Fetch global templates and user assignments when dialog opens
  useEffect(() => {
    if (!user || !open) return;
    setTemplatesLoaded(false);

    const fetchTemplateData = async () => {
      try {
        const [globalRes, assignedRes] = await Promise.all([
          fetch('/api/admin/templates'),
          fetch(`/api/admin/users/${user.uid}/templates`),
        ]);

        if (globalRes.ok) {
          const globalData = await globalRes.json();
          setGlobalTemplates(globalData.templates || []);
        }

        if (assignedRes.ok) {
          const assignedData = await assignedRes.json();
          setAssignedTemplateIds(assignedData.assignedTemplates || []);
        }
      } catch (error) {
        console.error('Failed to fetch template data:', error);
      } finally {
        setTemplatesLoaded(true);
      }
    };

    fetchTemplateData();
  }, [user, open]);

  if (!user) return null;

  const getInitials = () => {
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

  const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  };

  const handleToggleRole = async () => {
    setLoading(true);
    try {
      const newRole = user.role === 'admin' ? 'user' : 'admin';
      const response = await fetch(`/api/admin/users/${user.uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) throw new Error('Failed to update role');

      onUserUpdated();
    } catch (error) {
      console.error('Failed to update role:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDisabled = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${user.uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disabled: !user.disabled,
          disabledReason: !user.disabled ? disableReason || 'Disabled by admin' : undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      setDisableReason('');
      onUserUpdated();
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCredits = async () => {
    const amount = parseInt(addCredits, 10);
    if (isNaN(amount) || amount === 0) return;

    setCreditsLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${user.uid}/credits`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addPurchased: amount }),
      });

      if (!response.ok) throw new Error('Failed to update credits');

      setAddCredits('');
      onUserUpdated();
    } catch (error) {
      console.error('Failed to update credits:', error);
    } finally {
      setCreditsLoading(false);
    }
  };

  const handleToggleTemplate = (templateId: string) => {
    setAssignedTemplateIds(prev =>
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handleSaveTemplates = async () => {
    setTemplatesSaving(true);
    try {
      const response = await fetch(`/api/admin/users/${user.uid}/templates`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTemplates: assignedTemplateIds }),
      });

      if (!response.ok) throw new Error('Failed to save templates');
      onUserUpdated();
    } catch (error) {
      console.error('Failed to save templates:', error);
    } finally {
      setTemplatesSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${user.uid}`, {
        method: 'DELETE',
        headers: { 'x-confirm-delete': 'true' },
      });

      if (!response.ok) throw new Error('Failed to delete user');

      onOpenChange(false);
      onUserUpdated();
    } catch (error) {
      console.error('Failed to delete user:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.photoURL || undefined} />
              <AvatarFallback>{getInitials()}</AvatarFallback>
            </Avatar>
            <div>
              <span>{user.displayName || user.email}</span>
              {user.role === 'admin' && (
                <Badge variant="default" className="ml-2">Admin</Badge>
              )}
            </div>
          </DialogTitle>
          <DialogDescription>
            {t('userDialog.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t('userDialog.email')}:</span>
              <span className="font-medium">{user.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">UID:</span>
              <span className="font-mono text-xs">{user.uid}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t('userDialog.created')}:</span>
              <span>{formatDate(user.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t('userDialog.lastLogin')}:</span>
              <span>{formatDate(user.lastSignIn)}</span>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            {user.emailVerified ? (
              <Badge variant="outline" className="text-green-600 border-green-200">
                {t('userDialog.emailVerified')}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                {t('userDialog.emailNotVerified')}
              </Badge>
            )}
            {user.disabled && (
              <Badge variant="destructive">
                {t('userDialog.accountDisabled')}
              </Badge>
            )}
          </div>

          {user.disabledReason && (
            <div className="bg-destructive/10 p-3 rounded-md text-sm">
              <span className="font-medium">{t('userDialog.disableReason')}:</span>{' '}
              {user.disabledReason}
            </div>
          )}

          <Separator />

          {/* Credits Section */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              {t('userDialog.credits')}
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted p-3 rounded-md text-center">
                <div className="text-2xl font-bold">{user.credits.total}</div>
                <div className="text-xs text-muted-foreground">{t('userDialog.totalCredits')}</div>
              </div>
              <div className="bg-muted p-3 rounded-md text-center">
                <div className="text-2xl font-bold">{user.credits.free}</div>
                <div className="text-xs text-muted-foreground">{t('userDialog.freeCredits')}</div>
              </div>
              <div className="bg-muted p-3 rounded-md text-center">
                <div className="text-2xl font-bold">{user.credits.purchased}</div>
                <div className="text-xs text-muted-foreground">{t('userDialog.purchasedCredits')}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder={t('userDialog.addCreditsPlaceholder')}
                value={addCredits}
                onChange={(e) => setAddCredits(e.target.value)}
                className="max-w-[150px]"
              />
              <Button
                onClick={handleAddCredits}
                disabled={creditsLoading || !addCredits}
                size="sm"
              >
                {creditsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1" />
                    {t('userDialog.addCredits')}
                  </>
                )}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Templates Section */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t('userDialog.templates')}
            </h3>
            {!templatesLoaded ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : globalTemplates.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('userDialog.noGlobalTemplates')}</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{t('userDialog.assignTemplates')}</p>
                <div className="space-y-2">
                  {globalTemplates.map((template) => (
                    <label
                      key={template.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={assignedTemplateIds.includes(template.id)}
                        onChange={() => handleToggleTemplate(template.id)}
                        className="h-4 w-4 rounded border-input"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{template.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{template.fileName}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <Button
                  onClick={handleSaveTemplates}
                  disabled={templatesSaving}
                  size="sm"
                >
                  {templatesSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  {templatesSaving ? t('userDialog.templatesSaving') : t('userDialog.templatesSave')}
                </Button>
              </>
            )}
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-4">
            <h3 className="font-semibold">{t('userDialog.actions')}</h3>

            {/* Toggle Role */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">
                  {user.role === 'admin' ? t('userDialog.removeAdmin') : t('userDialog.makeAdmin')}
                </div>
                <div className="text-sm text-muted-foreground">
                  {user.role === 'admin'
                    ? t('userDialog.removeAdminDesc')
                    : t('userDialog.makeAdminDesc')}
                </div>
              </div>
              <Button
                onClick={handleToggleRole}
                variant={user.role === 'admin' ? 'outline' : 'default'}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : user.role === 'admin' ? (
                  <>
                    <Shield className="h-4 w-4 mr-1" />
                    {t('userDialog.removeAdmin')}
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 mr-1" />
                    {t('userDialog.makeAdmin')}
                  </>
                )}
              </Button>
            </div>

            {/* Toggle Disabled */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">
                  {user.disabled ? t('userDialog.enableAccount') : t('userDialog.disableAccount')}
                </div>
                <div className="text-sm text-muted-foreground">
                  {user.disabled
                    ? t('userDialog.enableAccountDesc')
                    : t('userDialog.disableAccountDesc')}
                </div>
              </div>
              {!user.disabled ? (
                <div className="flex gap-2 items-center">
                  <Input
                    placeholder={t('userDialog.reasonPlaceholder')}
                    value={disableReason}
                    onChange={(e) => setDisableReason(e.target.value)}
                    className="max-w-[200px]"
                  />
                  <Button
                    onClick={handleToggleDisabled}
                    variant="destructive"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <UserX className="h-4 w-4 mr-1" />
                        {t('userDialog.disable')}
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleToggleDisabled}
                  variant="outline"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4 mr-1" />
                      {t('userDialog.enable')}
                    </>
                  )}
                </Button>
              )}
            </div>

            <Separator />

            {/* Danger Zone */}
            <div className="bg-destructive/5 border border-destructive/20 p-4 rounded-md space-y-3">
              <h4 className="font-semibold text-destructive">{t('userDialog.dangerZone')}</h4>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{t('userDialog.deleteUser')}</div>
                  <div className="text-sm text-muted-foreground">
                    {t('userDialog.deleteUserDesc')}
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={deleteLoading}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      {t('userDialog.delete')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('userDialog.deleteConfirmTitle')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('userDialog.deleteConfirmDesc', { email: user.email || 'Unknown' })}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('userDialog.cancel')}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteUser}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleteLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          t('userDialog.confirmDelete')
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
