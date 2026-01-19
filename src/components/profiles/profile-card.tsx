'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Sparkles,
  Linkedin,
  Coins,
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
  onEnrich?: (profileId: string) => void;
  onLinkedInExport?: (profileId: string) => void;
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
  onEnrich,
  onLinkedInExport,
  showActions = true,
}: ProfileCardProps) {
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
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <User className="h-5 w-5 text-primary" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{profile.name}</span>
              {profile.isDefault && (
                <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {profile.headline || `${profile.experienceCount} ervaringen`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isSelected && (
            <CheckCircle className="h-5 w-5 text-primary mr-1" />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelect?.(profile.id); }}>
                <FolderOpen className="h-4 w-4 mr-2" />
                Laden
              </DropdownMenuItem>
              {!profile.isDefault && onSetDefault && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSetDefault(profile.id); }}>
                  <Star className="h-4 w-4 mr-2" />
                  Als standaard instellen
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
                    Verwijderen
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
    <Card className={profile.isDefault ? 'border-primary' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <User className="h-6 w-6 text-primary" />
              )}
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {profile.name}
                {profile.isDefault && (
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                )}
              </CardTitle>
              <CardDescription className="text-sm">
                {profile.headline || 'Geen headline'}
              </CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!profile.isDefault && onSetDefault && (
                <DropdownMenuItem onClick={() => onSetDefault(profile.id)}>
                  <Star className="h-4 w-4 mr-2" />
                  Als standaard instellen
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDelete(profile.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Verwijderen
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
            <span>{profile.experienceCount} ervaringen</span>
          </div>
        </div>

        {/* Description */}
        {profile.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {profile.description}
          </p>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex flex-wrap gap-2 pt-2">
            {onCreateCV && (
              <Button
                size="sm"
                onClick={() => onCreateCV(profile.id)}
              >
                <FileText className="h-4 w-4 mr-1" />
                CV Maken
              </Button>
            )}
            {onEnrich && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEnrich(profile.id)}
                className="border-primary/50 text-primary"
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Verrijken
              </Button>
            )}
            {onLinkedInExport && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onLinkedInExport(profile.id)}
                className="border-blue-500/50 text-blue-600"
              >
                <Linkedin className="h-4 w-4 mr-1" />
                <Badge variant="secondary" className="ml-1 text-xs px-1">
                  <Coins className="h-3 w-3" />
                </Badge>
              </Button>
            )}
          </div>
        )}

        {/* Last updated */}
        <p className="text-xs text-muted-foreground">
          Laatst bijgewerkt: {new Date(profile.updatedAt).toLocaleDateString('nl-NL')}
        </p>
      </CardContent>
    </Card>
  );
}
