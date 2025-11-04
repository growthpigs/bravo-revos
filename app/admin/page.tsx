export default function AdminPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-4xl w-full">
        <h1 className="text-4xl font-bold mb-4">Admin Portal</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Agency management, client oversight, and system analytics
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold mb-2">Client Management</h3>
            <p className="text-sm text-muted-foreground">
              Add, edit, and manage client accounts
            </p>
          </div>

          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold mb-2">System Analytics</h3>
            <p className="text-sm text-muted-foreground">
              Monitor performance across all clients
            </p>
          </div>

          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold mb-2">Pod Monitoring</h3>
            <p className="text-sm text-muted-foreground">
              Track engagement pod activities
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
