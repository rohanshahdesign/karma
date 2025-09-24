export default function DashboardHomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Karma Dashboard
          </h1>
          <p className="text-xl text-gray-600">
            This is the main dashboard page
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Giving Balance</h3>
            <p className="text-3xl font-bold text-blue-600">100</p>
            <p className="text-sm text-gray-500">Karma points to give</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Earned Balance</h3>
            <p className="text-3xl font-bold text-green-600">250</p>
            <p className="text-sm text-gray-500">Karma points earned</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Leaderboard Rank</h3>
            <p className="text-3xl font-bold text-purple-600">#5</p>
            <p className="text-sm text-gray-500">Out of 50 members</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <p className="text-sm text-gray-600">You gave 10 Karma to John for great teamwork</p>
              <p className="text-xs text-gray-400">2 hours ago</p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <p className="text-sm text-gray-600">Sarah gave you 15 Karma for code review</p>
              <p className="text-xs text-gray-400">1 day ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
