'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, FileText, MoreVertical, Download, Trash2, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/components/auth/auth-context';
import { getUserCVs, deleteCV } from '@/lib/firebase/firestore';
import type { CV } from '@/types';

export default function CVListPage() {
  const { firebaseUser } = useAuth();
  const [cvs, setCvs] = useState<CV[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCVs() {
      if (firebaseUser) {
        const userCvs = await getUserCVs(firebaseUser.uid);
        setCvs(userCvs);
        setLoading(false);
      }
    }
    fetchCVs();
  }, [firebaseUser]);

  const handleDelete = async (cvId: string) => {
    if (!firebaseUser || !confirm('Are you sure you want to delete this CV?')) return;

    try {
      await deleteCV(firebaseUser.uid, cvId);
      setCvs(cvs.filter((cv) => cv.id !== cvId));
    } catch (error) {
      console.error('Failed to delete CV:', error);
    }
  };

  const getStatusBadge = (status: CV['status']) => {
    switch (status) {
      case 'pdf_ready':
        return <Badge className="bg-green-500">Ready</Badge>;
      case 'generated':
        return <Badge className="bg-blue-500">Generated</Badge>;
      case 'generating':
        return <Badge className="bg-yellow-500">Generating</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My CVs</h1>
          <p className="text-muted-foreground">Manage and download your CVs</p>
        </div>
        <Link href="/cv/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New CV
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All CVs</CardTitle>
          <CardDescription>
            {cvs.length} CV{cvs.length !== 1 ? 's' : ''} created
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : cvs.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No CVs created yet</p>
              <p className="text-sm text-muted-foreground">
                Create your first CV to get started
              </p>
              <Link href="/cv/new">
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Create CV
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {cvs.map((cv) => (
                <div
                  key={cv.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {cv.linkedInData?.fullName || 'Untitled CV'}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{cv.jobVacancy?.title || 'General CV'}</span>
                        <span>•</span>
                        <span className="capitalize">{cv.template}</span>
                        <span>•</span>
                        <span>
                          {cv.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusBadge(cv.status)}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/cv/${cv.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        {(cv.status === 'generated' || cv.status === 'pdf_ready') && (
                          <DropdownMenuItem asChild>
                            <Link href={`/cv/${cv.id}?download=true`}>
                              <Download className="mr-2 h-4 w-4" />
                              Download PDF
                            </Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => cv.id && handleDelete(cv.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
