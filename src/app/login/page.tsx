import { signIn } from '@/auth';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
            Sign in to TraceEnd
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Personal Attack Surface Management
          </p>
        </div>
        <div className="mt-8 space-y-4">
          <form
            action={async () => {
              'use server';
              await signIn('github', { redirectTo: '/dashboard' });
            }}
          >
            <button
              type="submit"
              className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Sign in with GitHub
            </button>
          </form>

          {process.env.NODE_ENV === 'development' && (
            <form
              action={async () => {
                'use server';
                await signIn('credentials', { email: 'dev@traceend.local', redirectTo: '/dashboard' });
              }}
            >
              <button
                type="submit"
                className="flex w-full justify-center rounded-md border border-gray-600 bg-gray-800 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Development Login (dev@traceend.local)
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
