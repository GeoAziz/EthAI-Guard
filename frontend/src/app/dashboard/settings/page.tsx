import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { Copy, RefreshCw } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account settings, preferences, and API access.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>This is how others will see you on the site.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" defaultValue="John Doe" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" defaultValue="user@example.com" disabled />
          </div>
          <Button>Update Profile</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>Customize the appearance of the app.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
            <p className="text-sm font-medium">Toggle light/dark mode</p>
            <ThemeToggle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Key</CardTitle>
          <CardDescription>Use this key to integrate EthixAI with your applications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center gap-2 p-2 border rounded-md bg-muted">
                <Input readOnly value="****************************************" className="border-0 bg-transparent font-code focus-visible:ring-0" />
                <Button variant="ghost" size="icon"><Copy className="h-4 w-4" /></Button>
            </div>
            <Button variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate Key
            </Button>
        </CardContent>
      </Card>
      
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Delete Account</CardTitle>
          <CardDescription>Permanently delete your account and all associated data. This action cannot be undone.</CardDescription>
        </CardHeader>
        <CardContent>
            <Button variant="destructive">Delete My Account</Button>
        </CardContent>
      </Card>

    </div>
  );
}
