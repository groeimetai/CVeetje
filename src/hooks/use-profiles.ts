'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SavedProfileSummary } from '@/types';

interface UseProfilesResult {
  profiles: SavedProfileSummary[];
  isLoading: boolean;
  error: string | null;
  refreshProfiles: () => Promise<void>;
  deleteProfile: (profileId: string) => Promise<boolean>;
  setDefaultProfile: (profileId: string) => Promise<boolean>;
}

export function useProfiles(): UseProfilesResult {
  const [profiles, setProfiles] = useState<SavedProfileSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/profiles');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.profiles) {
          setProfiles(data.profiles);
        }
      } else {
        throw new Error('Failed to fetch profiles');
      }
    } catch (err) {
      console.error('Failed to fetch profiles:', err);
      setError('Kon profielen niet laden');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch profiles on mount
  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Delete profile
  const deleteProfile = useCallback(async (profileId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/profiles/${profileId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setProfiles(prev => prev.filter(p => p.id !== profileId));
        return true;
      } else {
        throw new Error('Verwijderen mislukt');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verwijderen mislukt');
      return false;
    }
  }, []);

  // Set as default
  const setDefaultProfile = useCallback(async (profileId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/profiles/${profileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      });
      if (response.ok) {
        setProfiles(prev => prev.map(p => ({
          ...p,
          isDefault: p.id === profileId,
        })));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to set default:', err);
      return false;
    }
  }, []);

  return {
    profiles,
    isLoading,
    error,
    refreshProfiles: fetchProfiles,
    deleteProfile,
    setDefaultProfile,
  };
}
