import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/config/env';
import { getDefaultWorkspace } from '@/lib/services/workspace';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const workspace = await getDefaultWorkspace();
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    if (!env.GITHUB_APP_CLIENT_ID) {
      return NextResponse.json({ error: 'GitHub Integration not configured' }, { status: 500 });
    }

    const randomBytes = crypto.randomBytes(16).toString('hex');
    const statePayload = {
      workspaceId: workspace.id,
      nonce: randomBytes
    };
    const state = Buffer.from(JSON.stringify(statePayload)).toString('base64');
    
    // Store the nonce in a secure HttpOnly cookie for verification
    const response = NextResponse.redirect(new URL('https://github.com/login/oauth/authorize'));
    response.cookies.set('github_oauth_nonce', randomBytes, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60, // 10 minutes
      path: '/api/integrations/github/callback'
    });
    
    // GitHub OAuth App authorization URL
    const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
    githubAuthUrl.searchParams.set('client_id', env.GITHUB_APP_CLIENT_ID);
    githubAuthUrl.searchParams.set('redirect_uri', `${env.NEXT_PUBLIC_APP_URL}/api/integrations/github/callback`);
    githubAuthUrl.searchParams.set('scope', 'repo');
    githubAuthUrl.searchParams.set('state', state);

    const redirectResponse = NextResponse.redirect(githubAuthUrl.toString());
    
    redirectResponse.cookies.set('github_oauth_nonce', randomBytes, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60, // 10 minutes
      path: '/api/integrations/github/callback'
    });

    return redirectResponse;
  } catch (error) {
    return NextResponse.json({ error: 'Failed to authorize' }, { status: 500 });
  }
}
