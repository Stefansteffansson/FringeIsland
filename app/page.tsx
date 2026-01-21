import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  
  // Test database connection by fetching permissions
  const { data: permissions, error } = await supabase
    .from('permissions')
    .select('name, description')
    .limit(5)

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-8">FringeIsland</h1>
      
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Database Connection Test</h2>
        {error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong>Error:</strong> {error.message}
          </div>
        ) : (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            <strong>Success!</strong> Connected to Supabase
          </div>
        )}
      </div>

      {permissions && permissions.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Sample Permissions (First 5):</h3>
          <ul className="space-y-2">
            {permissions.map((permission, index) => (
              <li key={index} className="bg-gray-100 p-3 rounded">
                <strong>{permission.name}</strong>: {permission.description}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
