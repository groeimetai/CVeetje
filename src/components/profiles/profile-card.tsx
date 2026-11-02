'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  Star,
  Trash2,
  Briefcase,
  FileText,
  User,
  FolderOpen,
  CheckCircle,
} from 'lucide-react';
import type { SavedProfileSummary } from '@/types';

export type ProfileCardVariant = 'card' | 'list';

interface ProfileCardProps {
  profile: SavedProfileSummary;
  variant?: ProfileCardVariant;
  isSelected?: boolean;
  onSelect?: (profileId: string) => void;
  onSetDefault?: (profileId: string) => void;
  onDelete?: (profileId: string) => void;
  onCreateCV?: (profileId: string) => void;
  onView?: (profileId: string) => void;
  showActions?: boolean;
}

export function ProfileCard({
  profile,
  variant = 'card',
  isSelected = false,
  onSelect,
  onSetDefault,
  onDelete,
  onCreateCV,
  onView,
  showActions = true,
}: ProfileCardProps) {
  const t = useTranslations('profiles');
  const tCommon = useTranslations('common');
  const format = useFormatter();
  // List variant - compact for sidebar/wizard
  if (variant === 'list') {
    return (
      <div
        className={`flex items-center justify-between border rounded-lg p-3 cursor-pointer hover:bg-accent/50 transition-colors ${
          isSelected ? 'border-primary bg-primary/5' : ''
        }`}
        onClick={() => onSelect?.(profile.id)}
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <User className="h-5 w-5 text-primary" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{profile.name}</span>
              {profile.isDefault && (
                <Star className="h-3 w-3 text-amber-500 fill-amber-500" aria-label={t('isDefault')} />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {profile.headline || t('card.experienceCount', { count: profile.experienceCount })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isSelected && (
            <CheckCircle className="h-5 w-5 text-primary mr-1" />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t('card.moreActions', { name: profile.name })}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelect?.(profile.id); }}>
                <FolderOpen className="h-4 w-4 mr-2" />
                {t('card.load')}
              </DropdownMenuItem>
              {!profile.isDefault && onSetDefault && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSetDefault(profile.id); }}>
                  <Star className="h-4 w-4 mr-2" />
                  {t('setDefault')}
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => { e.stopPropagation(); onDelete(profile.id); }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {tCommon('delete')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  // Card variant - full card for profiles page
  return (
    <Card
      className={`${profile.isDefault ? 'border-primary' : ''} ${onView ? 'cursor-pointer hover:bg-accent/50 transition-colors' : ''}`}
      onClick={() => onView?.(profile.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <User className="h-6 w-6 text-primary" />
              )}
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {profile.name}
                {profile.isDefault && (
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" aria-label={t('isDefault')} />
                )}
              </CardTitle>
              <CardDescription className="text-sm">
                {profile.headline || t('card.noHeadline')}
              </CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t('card.moreActions', { name: profile.name })}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!profile.isDefault && onSetDefault && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSetDefault(profile.id); }}>
                  <Star className="h-4 w-4 mr-2" />
                  {t('setDefault')}
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  {!profile.isDefault && onSetDefault && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => { e.stopPropagation(); onDelete(profile.id); }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {tCommon('delete')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Briefcase className="h-4 w-4" />
            <span>{t('card.experienceCount', { count: profile.experienceCount })}</span>
          </div>
        </div>

        {/* Description */}
        {profile.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {profile.description}
          </p>
        )}

        {/* Actions — only CV Maken. Clicking the card itself opens the
            detail/edit page via onView. Enrich and LinkedIn export live
            on the detail page. */}
        {showActions && onCreateCV && (
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              size="sm"
              onClick={(e) => { e.stopPropagation(); onCreateCV(profile.id); }}
            >
              <FileText className="h-4 w-4 mr-1" />
              {t('createCV')}
            </Button>
          </div>
        )}

        {/* Last updated */}
        <p className="text-xs text-muted-foreground">
          {t('card.lastUpdated', {
            date: format.dateTime(new Date(profile.updatedAt), { dateStyle: 'short' }),
          })}
        </p>
      </CardContent>
    </Card>
  );
}
