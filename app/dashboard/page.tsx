export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-4xl w-full">
        <h1 className="text-4xl font-bold mb-4">Client Dashboard</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Campaign management, lead tracking, and performance analytics
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold mb-2">Create Campaign</h3>
            <p className="text-sm text-muted-foreground">
              Launch a new lead generation campaign
            </p>
          </div>

          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold mb-2">Manage Leads</h3>
            <p className="text-sm text-muted-foreground">
              View and export captured leads
            </p>
          </div>

          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold mb-2">Webhook Settings</h3>
            <p className="text-sm text-muted-foreground">
              Configure ESP integrations
            </p>
          </div>

          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold mb-2">Campaign Analytics</h3>
            <p className="text-sm text-muted-foreground">
              Track performance metrics
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
