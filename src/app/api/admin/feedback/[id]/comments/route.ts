import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/firebase/admin-utils';
import { getAdminDb } from '@/lib/firebase/admin';

const GITHUB_REPO = 'groeimetai/CVeetje';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Fetch GitHub issue comments for a feedback item
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const token = request.cookies.get('firebase-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await verifyAdminRequest(token);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getAdminDb();
    const feedbackDoc = await db.collection('feedback').doc(id).get();

    if (!feedbackDoc.exists) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    const data = feedbackDoc.data()!;
    const issueNumber = data.githubIssueNumber;

    if (!issueNumber) {
      return NextResponse.json({ success: true, comments: [] });
    }

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      return NextResponse.json({ success: true, comments: [] });
    }

    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/issues/${issueNumber}/comments`,
      {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github+json',
        },
        next: { revalidate: 0 },
      }
    );

    if (!res.ok) {
      console.error('GitHub comments fetch failed:', res.status);
      return NextResponse.json({ success: true, comments: [] });
    }

    const ghComments = await res.json();

    const comments = ghComments.map((c: { id: number; body: string; user: { login: string; avatar_url: string }; created_at: string }) => ({
      id: c.id,
      body: c.body,
      author: c.user.login,
      avatarUrl: c.user.avatar_url,
      createdAt: c.created_at,
    }));

    return NextResponse.json({ success: true, comments });
  } catch (error) {
    console.error('Error fetching GitHub comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

// POST - Add a comment to the GitHub issue
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const token = request.cookies.get('firebase-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await verifyAdminRequest(token);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { comment } = body as { comment: string };

    if (!comment?.trim()) {
      return NextResponse.json({ error: 'Comment is required' }, { status: 400 });
    }

    const db = getAdminDb();
    const feedbackDoc = await db.collection('feedback').doc(id).get();

    if (!feedbackDoc.exists) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    const data = feedbackDoc.data()!;
    const issueNumber = data.githubIssueNumber;

    if (!issueNumber) {
      return NextResponse.json({ error: 'No linked GitHub issue' }, { status: 400 });
    }

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 });
    }

    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/issues/${issueNumber}/comments`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body: comment.trim() }),
      }
    );

    if (!res.ok) {
      console.error('GitHub comment creation failed:', res.status);
      return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error posting GitHub comment:', error);
    return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
  }
}
