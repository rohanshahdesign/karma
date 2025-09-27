import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/60 border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600" />
            <span className="font-semibold tracking-tight">Karma</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#features" className="hover:text-gray-900">
              Features
            </a>
            <a href="#roadmap" className="hover:text-gray-900">
              Roadmap
            </a>
            <a href="#about" className="hover:text-gray-900">
              About
            </a>
          </nav>
          <Link
            href="/login"
            className="inline-flex items-center rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-white shadow hover:shadow-md transition-shadow"
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-60"
          aria-hidden
        >
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-blue-200 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-indigo-200 blur-3xl" />
        </div>
        <div className="mx-auto max-w-7xl px-6 pt-20 pb-16 sm:pt-28 sm:pb-24">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight">
              Build a culture of recognition
            </h1>
            <p className="mt-6 text-lg text-gray-600 max-w-2xl">
              Karma is a lightweight platform where teams give kudos, celebrate
              wins, and track impact with simple, delightful workflows.
            </p>
            <div className="mt-10 flex items-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-white shadow hover:shadow-md transition-shadow"
              >
                Get started
              </Link>
              <a
                href="#features"
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Explore features →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="bg-gray-50 border-t border-b border-gray-200"
      >
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <div className="mb-10">
            <h2 className="text-2xl sm:text-3xl font-semibold">What you get</h2>
            <p className="mt-2 text-gray-600">
              Simple building blocks for a healthy recognition habit.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: 'Kudos & points',
                desc: 'Send appreciation with optional notes. Monthly allowances keep it fair.',
              },
              {
                title: 'Leaderboards',
                desc: 'See top contributors by team and time period with friendly competition.',
              },
              {
                title: 'Rewards',
                desc: 'Redeem points for perks your company provides. Approval flows included.',
              },
              {
                title: 'Badges',
                desc: 'Celebrate milestones with customizable badges and progress tracking.',
              },
              {
                title: 'Real-time feed',
                desc: 'A live activity stream that keeps momentum visible and contagious.',
              },
              {
                title: 'Admin controls',
                desc: 'Roles, quotas, and workspace settings designed for clarity.',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow transition-shadow"
              >
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 mb-4" />
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section id="roadmap">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-semibold">Roadmap</h2>
          <ol className="mt-8 relative border-l border-gray-200">
            {[
              {
                title: 'Slack & Teams integrations',
                desc: 'Send and receive recognition directly from chat with slash commands.',
              },
              {
                title: 'Advanced analytics',
                desc: 'Deeper insights into recognition trends and impact over time.',
              },
              {
                title: 'Custom reward catalogs',
                desc: 'Flexible rewards with categories, budgets, and approval rules.',
              },
            ].map((item, idx) => (
              <li key={item.title} className="ml-6 mb-8">
                <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600" />
                <h3 className="font-medium">
                  {idx + 1}. {item.title}
                </h3>
                <p className="text-sm text-gray-600 mt-1">{item.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600" />
            <span className="text-sm text-gray-600">
              © {new Date().getFullYear()} Karma
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <a href="#features" className="hover:text-gray-900">
              Features
            </a>
            <a href="#roadmap" className="hover:text-gray-900">
              Roadmap
            </a>
            <Link href="/login" className="hover:text-gray-900 font-medium">
              Get started
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
