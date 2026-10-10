import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/config/env';
import { getCurrentUser } from '@/lib/services/workspace';
import { upsertGithubIntegration } from '@/lib/services/integrations';
import { logger } from '@/lib/logger';
import { db } from '@/lib/db';

const log = logger.child({ module: 'github-callback' });

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    const state = request.nextUrl.searchParams.get('state');

    if (!code || !state) {
      return NextResponse.redirect(new URL('/settings?error=github_missing_params', request.url));
    }

    // Verify user is authenticated
    const user = await getCurrentUser();
    
    let decodedState;
    try {
      decodedState = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
    } catch {
      return NextResponse.redirect(new URL('/settings?error=github_invalid_state', request.url));
    }

    const nonceCookie = request.cookies.get('github_oauth_nonce')?.value;
    if (!nonceCookie || nonceCookie !== decodedState.nonce) {
      log.error('GitHub callback nonce mismatch or missing cookie');
      return NextResponse.redirect(new URL('/settings?error=github_invalid_nonce', request.url));
    }

    const workspaceId = decodedState.workspaceId;

    // Verify user belongs to this workspace
    const membership = await db.workspaceMember.findUnique({
      where: { userId_workspaceId: { workspaceId, userId: user.id } }
    });

    if (!membership) {
      return NextResponse.redirect(new URL('/settings?error=github_unauthorized', request.url));
    }

    // Exchange code for token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: env.GITHUB_APP_CLIENT_ID,
        client_secret: env.GITHUB_APP_CLIENT_SECRET,
        code,
        redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/integrations/github/callback`,
      })
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      log.error('GitHub token exchange failed', { error: tokenData.error });
      return NextResponse.redirect(new URL('/settings?error=github_token_failed', request.url));
    }

    const accessToken = tokenData.access_token;

    // Fetch GitHub user profile to store in metadata
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      }
    });

    let githubUser = { login: 'unknown' };
    if (userResponse.ok) {
      githubUser = await userResponse.json();
    }

    // Upsert integration with encrypted token
    await upsertGithubIntegration(workspaceId, accessToken, {
      username: githubUser.login,
      scopes: tokenData.scope,
    });

    // Record activity
    await db.activityEvent.create({
      data: {
        action: 'integration.github_connected',
        description: `GitHub account @${githubUser.login} connected`,
        workspaceId,
        userId: user.id,
      }
    });

    return NextResponse.redirect(new URL('/settings?success=github_connected', request.url));
  } catch (error) {
    log.error('GitHub callback failed', { error: String(error) });
    return NextResponse.redirect(new URL('/settings?error=github_callback_error', request.url));
  }
}
