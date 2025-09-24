import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Welcome to Karma
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            A lightweight recognition platform where employees can share appreciation
            and foster a culture of gratitude in the workplace.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold mb-4 text-blue-600">
              For New Users
            </h2>
            <p className="text-gray-600 mb-6">
              Join your organization's recognition program and start giving and receiving karma points.
            </p>
            <Link
              href="/login"
              className="inline-block bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Sign In
            </Link>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold mb-4 text-green-600">
              For Existing Users
            </h2>
            <p className="text-gray-600 mb-6">
              Access your dashboard to view balances, give recognition, and track your progress.
            </p>
            <Link
              href="/home"
              className="inline-block bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>

        <div className="text-center">
          <p className="text-gray-500">
            This is a development preview. Full authentication and features coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}
