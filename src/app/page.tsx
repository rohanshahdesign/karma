import Link from 'next/link';

const NAV_LINKS = [
  { label: 'Product', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Impact', href: '#metrics' },
  { label: 'FAQ', href: '#faq' },
];

const TRUSTED_LOGOS = [
  'Linear',
  'Intercom',
  'Superhuman',
  'Segment',
  'Dropbox',
  'Miro',
  'Notion',
  'Canva',
  'Airbnb',
];

const HERO_CALLOUTS = [
  {
    title: 'Launch in minutes',
    description:
      'Spin up a workspace, import members, and set monthly giving allowances with guided onboarding.',
  },
  {
    title: 'Recognition anywhere',
    description:
      'Send shout-outs from the dashboard or through Slack and Microsoft Teams without breaking flow.',
  },
  {
    title: 'Rewards that resonate',
    description:
      'Blend company perks with platform rewards and automate approval workflows in one catalog.',
  },
];

const FEATURE_TABS = [
  {
    title: 'Dual-balance economy',
    description:
      'Giving balances reset each month to encourage continuous recognition, while earned balances stay ready for rewards.',
    cta: 'Learn more',
  },
  {
    title: 'Transparent recognition feed',
    description:
      'Showcase who gave what and why in an open feed that keeps momentum high across every department.',
  },
  {
    title: 'Custom rewards catalog',
    description:
      'Offer platform defaults or bespoke rewards, set approval thresholds, and manage inventory with ease.',
  },
];

const ADDITIONAL_FEATURES = [
  {
    title: 'Role-based controls',
    description:
      'Super admins and admins manage members, reward approvals, and allowances with fine-grained permissions.',
  },
  {
    title: 'Dynamic currency branding',
    description:
      'Name the currency that fits your culture and surface it automatically across the entire experience.',
  },
  {
    title: 'Actionable analytics',
    description:
      'Leaderboards, badge tracking, and trends highlight top givers and engagement hot spots.',
  },
];

const SECONDARY_FEATURES = [
  {
    title: 'Everything you need to launch a recognition culture',
    description:
      'Guide teams through onboarding, invitations, and balance setup without leaving the app.',
    bullets: [
      'Guided workspace onboarding',
      'Invite and approve members',
      'Configurable giving allowances',
      'Automated balance resets',
    ],
  },
  {
    title: 'Empower teams to celebrate and redeem instantly',
    description:
      'Provide frictionless ways to recognise peers and convert appreciation into meaningful rewards.',
    bullets: [
      'Slack & Teams slash commands',
      'Public recognition feed',
      'Reward approvals and inventory',
      'Real-time balance updates',
    ],
  },
];

const HOW_IT_WORKS = [
  {
    title: 'Create your workspace',
    description:
      'Brand your space, choose your currency name, and define allowance rules that fit your culture.',
  },
  {
    title: 'Invite your team',
    description:
      'Share secure invites, assign roles, and welcome employees with guided onboarding flows.',
  },
  {
    title: 'Recognise and reward',
    description:
      'Send currency with context-rich messages, celebrate wins publicly, and manage reward redemptions.',
  },
  {
    title: 'Track the impact',
    description:
      'Monitor leaderboards, balances, and engagement trends to keep appreciation thriving.',
  },
];

const METRICS = [
  { value: '92%', label: 'teams report higher peer recognition' },
  { value: '30k+', label: 'recognitions shared each month' },
  { value: '2.5x', label: 'increase in reward redemptions' },
  { value: '4.8/5', label: 'average workspace satisfaction' },
];

const FAQS = [
  {
    question: 'What makes Karma different from other recognition tools?',
    answer:
      'Karma combines a dual-balance economy, customizable currency branding, and transparent feeds so recognition stays continuous and meaningful.',
  },
  {
    question: 'Can we customise rewards and currency?',
    answer:
      'Yes. Super admins can name your currency, upload icons, and manage both platform and custom rewards with approval workflows.',
  },
  {
    question: 'How do monthly allowances work?',
    answer:
      'Every member receives a giving balance that resets on the first of each month, encouraging ongoing appreciation while preventing hoarding.',
  },
  {
    question: 'Does Karma integrate with Slack or Microsoft Teams?',
    answer:
      'Karma ships with slash commands and notifications for Slack and Teams so recognition happens wherever work already lives.',
  },
  {
    question: 'Is the platform secure for distributed teams?',
    answer:
      'Karma is built on Supabase with strict Row Level Security, role-based permissions, and clear client/server separation to protect every workspace.',
  },
];

export default function Home() {
  return (
    <main className="bg-[#fdfcff] text-slate-900">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-12 h-[420px] w-[420px] rounded-full bg-[#f3e6ff] opacity-70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 right-0 h-[460px] w-[460px] rounded-full bg-[#dee9ff] opacity-70 blur-3xl" />
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 py-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#8b5dff] via-[#735dff] to-[#4e73ff]" />
            <span className="text-xl font-semibold tracking-tight">Karma</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                className="transition hover:text-slate-900"
                href={link.href}
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#6b4aff] via-[#815aff] to-[#a07aff] px-5 py-2 text-sm font-semibold text-white shadow-[0_12px_35px_rgba(123,92,255,0.35)] transition hover:shadow-[0_16px_45px_rgba(123,92,255,0.45)]"
            >
              Launch workspace
            </Link>
          </div>
        </header>
        <section className="mx-auto grid w-full max-w-6xl overflow-hidden items-center gap-14 px-6 pb-24 pt-10 lg:grid-cols-[minmax(0,5.5fr)_minmax(0,6.5fr)]">
          <div className="space-y-10">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#e2dcff] bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-[#6d5aff] shadow-[0_8px_20px_rgba(118,93,255,0.15)]">
                Peer recognition for modern teams
              </span>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-[58px] lg:leading-[1.05]">
                Effortless recognition for every team ritual.
              </h1>
              <p className="text-lg text-slate-600 sm:max-w-xl">
                Karma keeps culture thriving with guided allowances,
                multi-channel shout-outs, and rewards employees actually
                love—all wrapped into one intuitive dashboard.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#6b4aff] via-[#815aff] to-[#a07aff] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_35px_rgba(123,92,255,0.35)] transition hover:shadow-[0_16px_45px_rgba(123,92,255,0.45)]"
              >
                Get started for free
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
              >
                Explore the product
              </a>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {METRICS.slice(0, 2).map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-[0_12px_35px_rgba(122,99,255,0.12)] backdrop-blur"
                >
                  <p className="text-2xl font-semibold text-[#6d5aff]">
                    {metric.value}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">{metric.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-[#eedffd] blur-3xl" />
            <div className="pointer-events-none absolute -right-10 bottom-10 h-72 w-72 rounded-full bg-[#ddebff] blur-3xl" />
            <div className="relative overflow-hidden rounded-[44px] border border-white/60 bg-white/80 p-8 shadow-[0_40px_140px_rgba(120,97,255,0.22)] backdrop-blur">
              <div className="flex items-start justify-between border-b border-white/60 pb-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#6d5aff]">
                    Recognition feed
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Live snapshots from your workspace
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full bg-[#efeaff] px-4 py-1 text-xs font-semibold text-[#6d5aff]">
                  Live sync
                </span>
              </div>
              <div className="mt-6 space-y-4">
                {HERO_CALLOUTS.map((item, index) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-[#ece7ff] bg-[#f9f7ff] p-5 shadow-[0_12px_28px_rgba(122,99,255,0.1)]"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">
                        {item.title}
                      </p>
                      <span className="text-xs font-medium text-[#6d5aff]">
                        +{(index + 1) * 40} Karma
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-8 rounded-3xl bg-[#1b1638] p-6 text-white">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/70">
                  Balances
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {['Giving balance', 'Earned balance'].map((label, index) => (
                    <div key={label} className="rounded-2xl bg-white/10 p-4">
                      <p className="text-xs text-white/60">{label}</p>
                      <p className="mt-2 text-2xl font-semibold">
                        {(index + 3) * 125}
                        <span className="ml-1 text-sm font-medium text-white/70">
                          Karma
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="mx-auto w-full max-w-6xl px-6 pb-24">
        <div className="rounded-[36px] border border-white/60 bg-white/70 p-10 text-center shadow-[0_32px_90px_rgba(129,106,255,0.12)] backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.36em] text-slate-500">
            Trusted by teams who celebrate wins
          </p>
          <div className="mt-10 grid gap-8 text-xs font-semibold uppercase tracking-[0.48em] text-slate-400 sm:grid-cols-3 lg:grid-cols-5">
            {TRUSTED_LOGOS.map((logo) => (
              <span
                key={logo}
                className="flex items-center justify-center text-center"
              >
                {logo}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section
        id="features"
        className="relative overflow-hidden bg-white py-24"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#f5ebff] to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#f0f5ff] to-transparent" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-16 px-6">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center justify-center rounded-full bg-[#f4edff] px-4 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-[#6d5aff]">
              Features
            </span>
            <h2 className="mt-6 text-3xl font-semibold sm:text-4xl">
              The most unique recognition features
            </h2>
            <p className="mt-4 text-base text-slate-600">
              Keep momentum high with always-on balances, transparent feeds, and
              rewards that reflect your culture.
            </p>
          </div>
          <div className="overflow-hidden rounded-[40px] border border-[#e8e3ff] bg-white/80 shadow-[0_45px_140px_rgba(126,100,255,0.14)] backdrop-blur">
            <div className="grid divide-y divide-[#eee9ff] lg:grid-cols-2 lg:divide-x lg:divide-y-0">
              <div className="divide-y divide-[#eee9ff]">
                {FEATURE_TABS.map((feature, index) => (
                  <div
                    key={feature.title}
                    className={
                      index === 0
                        ? 'bg-white px-10 py-8'
                        : 'px-10 py-8 transition hover:bg-[#f9f7ff]'
                    }
                  >
                    <div className="flex items-start gap-4">
                      <span className="inline-flex items-center justify-center rounded-full leading-2 p-3 bg-gradient-to-br from-[#f2e8ff] to-[#e6f0ff] text-sm font-semibold text-[#6d5aff]">
                        {index + 1}
                      </span>
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {feature.title}
                        </h3>
                        <p className="text-sm text-slate-600">
                          {feature.description}
                        </p>
                        {index === 0 && feature.cta ? (
                          <a
                            className="inline-flex items-center gap-2 text-sm font-semibold text-[#6d5aff]"
                            href="#how-it-works"
                          >
                            {feature.cta}
                            <span aria-hidden className="text-base">
                              →
                            </span>
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="relative flex items-center justify-center overflow-hidden bg-[#f7f5ff] p-10">
                <div className="absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#efe9ff] blur-3xl" />
                <div className="absolute -bottom-28 right-12 h-72 w-72 rounded-full bg-[#dfe9ff] blur-3xl" />
                <div className="relative w-full max-w-lg overflow-hidden rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-[0_40px_120px_rgba(122,99,255,0.18)] backdrop-blur">
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6d5aff]">
                          Weekly spotlight
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          Top givers and recent wins
                        </p>
                      </div>
                      <span className="rounded-full bg-[#efeaff] px-3 py-1 text-xs font-semibold text-[#6d5aff]">
                        Dashboard
                      </span>
                    </div>
                    <div className="grid gap-4">
                      {HERO_CALLOUTS.slice(0, 2).map((item) => (
                        <div
                          key={item.title}
                          className="rounded-2xl border border-[#ece7ff] bg-[#f8f6ff] p-4"
                        >
                          <p className="text-sm font-semibold text-slate-900">
                            {item.title}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {item.description}
                          </p>
                        </div>
                      ))}
                      <div className="rounded-2xl bg-[#1b1638] p-4 text-white">
                        <div className="flex items-center justify-between text-sm text-white/70">
                          <span>Monthly sentiment</span>
                          <span>+18%</span>
                        </div>
                        <div className="mt-4 h-24 w-full rounded-xl bg-gradient-to-r from-[#7c5dff] via-[#a07aff] to-[#c998ff]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid gap-6 border-t border-[#eee9ff] bg-white/60 px-10 py-10 lg:grid-cols-3">
              {ADDITIONAL_FEATURES.map((feature) => (
                <div key={feature.title} className="space-y-3">
                  <h3 className="text-base font-semibold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f7f5ff] py-24">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6">
          {SECONDARY_FEATURES.map((feature, index) => (
            <div
              key={feature.title}
              className={`grid gap-14 lg:grid-cols-2 lg:items-center ${index % 2 === 1 ? 'lg:[&>div:first-child]:order-2' : ''}`}
            >
              <div className="relative">
                <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-[#efe8ff] blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 right-0 h-64 w-64 rounded-full bg-[#dce9ff] blur-3xl" />
                <div className="relative h-full rounded-[32px] border border-white/60 bg-white/80 p-6 shadow-[0_40px_120px_rgba(122,99,255,0.15)] backdrop-blur">
                  <div className="h-12 rounded-2xl bg-[#f4edff]" />
                  <div className="mt-5 grid gap-3">
                    {[56, 72, 64].map((width, itemIndex) => (
                      <div key={width} className="flex items-center gap-4">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#efeaff] text-[10px] font-semibold text-[#6d5aff]">
                          {itemIndex + 1}
                        </span>
                        <div
                          className="h-3 rounded-full bg-[#ece8ff]"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 rounded-2xl border border-[#ece7ff] bg-[#f9f7ff] p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      Recognition summary
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Every Friday at 3:00 PM
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <span className="inline-flex items-center rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6d5aff]">
                  Designed for teams
                </span>
                <h3 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
                  {feature.title}
                </h3>
                <p className="text-base text-slate-600">
                  {feature.description}
                </p>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {feature.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex items-center gap-2 text-sm font-medium text-slate-700"
                    >
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#efeaff] text-[#6d5aff]">
                        •
                      </span>
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="bg-white py-24">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6">
          <div className="text-center">
            <span className="inline-flex items-center justify-center rounded-full bg-[#f4edff] px-4 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-[#6d5aff]">
              How it works
            </span>
            <h2 className="mt-6 text-3xl font-semibold sm:text-4xl">
              Launch, celebrate, and measure in one rhythm
            </h2>
            <p className="mt-4 text-base text-slate-600">
              Follow the guided setup to bring Karma into your team’s rituals
              without disrupting what already works.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {HOW_IT_WORKS.map((step, index) => (
              <div
                key={step.title}
                className="rounded-[28px] border border-[#e8e3ff] bg-[#f9f7ff] p-8 shadow-[0_20px_70px_rgba(129,106,255,0.1)]"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#6d5aff] shadow-[0_10px_25px_rgba(122,99,255,0.12)]">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="metrics" className="bg-[#f7f5ff] py-24">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,5fr)] lg:items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6d5aff]">
              Impact
            </span>
            <h2 className="text-3xl font-semibold sm:text-4xl">
              Recognition that turns into measurable outcomes
            </h2>
            <p className="text-base text-slate-600">
              From stronger engagement to faster reward cycles, teams rely on
              Karma to make appreciation visible and actionable for everyone.
            </p>
          </div>
          <div className="grid gap-6 rounded-[32px] border border-white/60 bg-white/80 p-8 shadow-[0_35px_110px_rgba(126,100,255,0.16)] sm:grid-cols-2">
            {METRICS.map((metric) => (
              <div
                key={metric.label}
                className="rounded-[28px] bg-[#f9f7ff] px-6 py-8 text-center shadow-[0_20px_60px_rgba(126,100,255,0.12)]"
              >
                <p className="text-3xl font-semibold text-[#6d5aff]">
                  {metric.value}
                </p>
                <p className="mt-2 text-sm font-medium text-slate-600">
                  {metric.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="bg-white py-24">
        <div className="mx-auto w-full max-w-4xl space-y-12 px-6">
          <div className="text-center">
            <span className="inline-flex items-center justify-center rounded-full bg-[#f4edff] px-4 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-[#6d5aff]">
              FAQ
            </span>
            <h2 className="mt-6 text-3xl font-semibold sm:text-4xl">
              Answers for rolling out Karma with confidence
            </h2>
            <p className="mt-4 text-base text-slate-600">
              Still curious about launching Karma? Explore the essentials below
              or connect with our team for a deeper dive.
            </p>
          </div>
          <div className="space-y-4">
            {FAQS.map((item) => (
              <details
                key={item.question}
                className="group rounded-[28px] border border-[#e8e3ff] bg-[#f9f7ff] p-6 shadow-[0_20px_70px_rgba(129,106,255,0.12)]"
              >
                <summary className="flex cursor-pointer items-center justify-between text-left text-base font-semibold text-slate-900">
                  {item.question}
                  <span className="ml-4 text-xl text-[#6d5aff] transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-slate-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden py-24">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-[#6b4aff] via-[#825aff] to-[#a57cff]" />
        <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center gap-8 px-6 text-center text-white">
          <span className="rounded-full border border-white/25 px-4 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-white/80">
            Try it yourself
          </span>
          <h2 className="text-3xl text-black font-semibold sm:text-4xl">
            Ready to build a culture of appreciation?
          </h2>
          <p className="max-w-2xl text-base text-gray-700">
            Launch your Karma workspace and empower every teammate to recognise,
            reward, and celebrate what matters most.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#6b4aff] via-[#815aff] to-[#a07aff] px-5 py-2 text-sm font-semibold text-white shadow-[0_12px_35px_rgba(123,92,255,0.35)] transition hover:shadow-[0_16px_45px_rgba(123,92,255,0.45)]"
            >
              Launch workspace
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full border border-white px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-[#0f0d1f] py-12 text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-white/10" />
            <div>
              <p className="text-base font-semibold">Karma</p>
              <p className="text-xs text-white/60">
                © {new Date().getFullYear()} Karma. All rights reserved.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                className="transition hover:text-white"
                href={link.href}
              >
                {link.label}
              </a>
            ))}
            <Link className="transition hover:text-white" href="/login">
              Sign in
            </Link>
            <Link className="transition hover:text-white" href="/signup">
              Launch workspace
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
