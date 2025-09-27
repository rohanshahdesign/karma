'use client';

import Link from 'next/link';

export default function OnboardingChoicePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-xl rounded-2xl border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold mb-2">Welcome to Karma</h1>
        <p className="text-sm text-gray-600 mb-6">
          Lets set up your workspace.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/onboarding/create"
            className="rounded-lg border p-5 hover:shadow transition-shadow"
          >
            <div className="h-10 w-10 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600 mb-3" />
            <h2 className="font-medium mb-1">Create a workspace</h2>
            <p className="text-sm text-gray-600">
              Start fresh and invite your team.
            </p>
          </Link>
          <Link
            href="/onboarding/join"
            className="rounded-lg border p-5 hover:shadow transition-shadow"
          >
            <div className="h-10 w-10 rounded-md bg-gradient-to-br from-emerald-500 to-teal-500 mb-3" />
            <h2 className="font-medium mb-1">Join existing</h2>
            <p className="text-sm text-gray-600">
              Use a 6digit code or invite link.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
