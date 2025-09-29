// API route for username validation
// GET /api/validation/username?username=example - Check if username is available

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

// Username validation rules
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{2,30}$/;
const RESERVED_USERNAMES = [
  'admin', 'administrator', 'api', 'app', 'assets', 'auth', 'blog', 'cdn', 'config',
  'dashboard', 'dev', 'docs', 'download', 'ftp', 'help', 'home', 'info', 'login',
  'logout', 'mail', 'main', 'profile', 'profiles', 'root', 'settings', 'static',
  'support', 'test', 'user', 'users', 'www', 'null', 'undefined', 'system',
  'workspace', 'workspaces', 'invite', 'join', 'create', 'badges', 'rewards',
  'transactions', 'leaderboard', 'onboarding', 'me', 'self'
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    
    if (!username) {
      return NextResponse.json({
        valid: false,
        available: false,
        message: 'Username is required'
      }, { status: 400 });
    }

    const trimmedUsername = username.trim().toLowerCase();

    // Check format rules
    if (!USERNAME_REGEX.test(trimmedUsername)) {
      return NextResponse.json({
        valid: false,
        available: false,
        message: 'Username must be 2-30 characters long and contain only letters, numbers, hyphens, and underscores'
      });
    }

    // Check reserved usernames
    if (RESERVED_USERNAMES.includes(trimmedUsername)) {
      return NextResponse.json({
        valid: false,
        available: false,
        message: 'This username is reserved and cannot be used'
      });
    }

    // Check if username exists globally
    // During workspace creation, users don't have profiles yet, so we check globally
    const { data: existingProfile, error } = await supabaseServer
      .from('profiles')
      .select('id')
      .eq('username', trimmedUsername)
      .maybeSingle();

    if (error) {
      console.error('Database error checking username:', error);
      return NextResponse.json({
        valid: false,
        available: false,
        message: 'Unable to check username availability'
      }, { status: 500 });
    }

    const isAvailable = !existingProfile;

    return NextResponse.json({
      valid: true,
      available: isAvailable,
      message: isAvailable 
        ? `${trimmedUsername} is available` 
        : 'This username is already taken'
    });

  } catch (error) {
    console.error('Username validation error:', error);
    return NextResponse.json({
      valid: false,
      available: false,
      message: 'Server error during validation'
    }, { status: 500 });
  }
}