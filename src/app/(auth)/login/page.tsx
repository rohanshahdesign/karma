export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to Karma</h1>
        <p className="text-lg text-gray-600 mb-8">This is the authentication page</p>
        <div className="space-y-4">
          <button className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600">
            Sign In with Google
          </button>
          <p className="text-sm text-gray-500">More auth options coming soon...</p>
        </div>
      </div>
    </div>
  );
}
