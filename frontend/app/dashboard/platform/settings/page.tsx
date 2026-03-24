"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  Settings,
  ShieldAlert,
  Save,
  Building2,
  Mail,
  AlertTriangle,
  Trash2,
  Download,
  Check,
} from "lucide-react";

// Plan limits mirroring the backend spec
const PLAN_LIMITS = [
  {
    tier: "FREE",
    maxUsers: 3,
    maxProjects: 2,
    maxLeads: 50,
    storage: "500 MB",
    features: ["Basic CRM", "Lead Management"],
  },
  {
    tier: "STARTER",
    maxUsers: 10,
    maxProjects: 10,
    maxLeads: 500,
    storage: "5 GB",
    features: ["CRM", "Quotations", "Project Tracking", "Email Support"],
  },
  {
    tier: "PRO",
    maxUsers: 50,
    maxProjects: "Unlimited",
    maxLeads: "Unlimited",
    storage: "50 GB",
    features: [
      "Everything in Starter",
      "Advanced Analytics",
      "Labour Management",
      "Priority Support",
    ],
  },
  {
    tier: "ENTERPRISE",
    maxUsers: "Unlimited",
    maxProjects: "Unlimited",
    maxLeads: "Unlimited",
    storage: "Unlimited",
    features: [
      "Everything in Pro",
      "Custom Integrations",
      "Dedicated Support",
      "SLA Guarantee",
      "White-label",
    ],
  },
];

const EMAIL_TEMPLATES = [
  {
    event: "Welcome Email",
    template: "welcome.html",
    status: "Active",
    description: "Sent when a new organization is created",
  },
  {
    event: "User Invitation",
    template: "invitation.html",
    status: "Active",
    description: "Sent when a user is invited to an organization",
  },
  {
    event: "Password Reset",
    template: "password_reset.html",
    status: "Active",
    description: "Sent when a user requests a password reset",
  },
  {
    event: "Quote Sent",
    template: "quote_sent.html",
    status: "Active",
    description: "Sent to client when a quotation is shared",
  },
  {
    event: "Trial Expiring",
    template: "trial_expiring.html",
    status: "Active",
    description: "Sent 3 days before trial expiration",
  },
];

const LS_KEY = "igolo_platform_settings";

interface PlatformSettings {
  platformName: string;
  supportEmail: string;
  trialDuration: number;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  platformName: "Igolo Interior",
  supportEmail: "support@igolohomes.com",
  trialDuration: 14,
};

export default function PlatformSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem(LS_KEY, JSON.stringify(settings));
    setSaved(true);
    toast({
      title: "Settings saved",
      description: "Platform settings have been saved to local storage.",
    });
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-indigo-600" />
          <h1 className="text-2xl font-bold tracking-tight">
            Platform Settings
          </h1>
        </div>
        <p className="mt-1 text-muted-foreground">
          Configure platform-wide settings and view system configuration.
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="platform-info" className="space-y-6">
        <TabsList>
          <TabsTrigger value="platform-info" className="gap-2">
            <Building2 className="h-4 w-4" />
            Platform Info
          </TabsTrigger>
          <TabsTrigger value="plan-config" className="gap-2">
            <Settings className="h-4 w-4" />
            Plan Configuration
          </TabsTrigger>
          <TabsTrigger value="email-templates" className="gap-2">
            <Mail className="h-4 w-4" />
            Email Templates
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Platform Info */}
        <TabsContent value="platform-info">
          <div className="rounded-xl border bg-white p-6">
            <h2 className="mb-6 text-lg font-semibold">Platform Information</h2>
            <div className="max-w-lg space-y-5">
              <div className="space-y-2">
                <Label htmlFor="platformName">Platform Name</Label>
                <Input
                  id="platformName"
                  value={settings.platformName}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      platformName: e.target.value,
                    }))
                  }
                  placeholder="Igolo Interior"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      supportEmail: e.target.value,
                    }))
                  }
                  placeholder="support@igolohomes.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trialDuration">
                  Default Trial Duration (days)
                </Label>
                <Input
                  id="trialDuration"
                  type="number"
                  min={1}
                  max={90}
                  value={settings.trialDuration}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      trialDuration: parseInt(e.target.value) || 14,
                    }))
                  }
                />
              </div>
              <Button onClick={handleSave} className="gap-2">
                {saved ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saved ? "Saved" : "Save Settings"}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Plan Configuration */}
        <TabsContent value="plan-config">
          <div className="rounded-xl border bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Plan Limits</h2>
              <Badge variant="outline" className="text-xs">
                Read-only
              </Badge>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Plan limits are configured in the backend. This table is a
              reference view.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan Tier</TableHead>
                  <TableHead>Max Users</TableHead>
                  <TableHead>Max Projects</TableHead>
                  <TableHead>Max Leads</TableHead>
                  <TableHead>Storage</TableHead>
                  <TableHead>Features</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PLAN_LIMITS.map((plan) => (
                  <TableRow key={plan.tier}>
                    <TableCell>
                      <Badge variant="outline" className="font-medium">
                        {plan.tier}
                      </Badge>
                    </TableCell>
                    <TableCell>{plan.maxUsers}</TableCell>
                    <TableCell>{plan.maxProjects}</TableCell>
                    <TableCell>{plan.maxLeads}</TableCell>
                    <TableCell>{plan.storage}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {plan.features.map((f) => (
                          <Badge
                            key={f}
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {f}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Tab 3: Email Templates */}
        <TabsContent value="email-templates">
          <div className="rounded-xl border bg-white p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Email Templates</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Email templates are managed in{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                  backend/app/templates/
                </code>
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Template File</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {EMAIL_TEMPLATES.map((tmpl) => (
                  <TableRow key={tmpl.event}>
                    <TableCell className="font-medium">{tmpl.event}</TableCell>
                    <TableCell>
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                        {tmpl.template}
                      </code>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {tmpl.description}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs">
                        {tmpl.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Danger Zone */}
      <div className="rounded-xl border border-red-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <h2 className="text-lg font-semibold text-red-700">Danger Zone</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Irreversible actions. Proceed with caution.
        </p>
        <div className="flex flex-wrap gap-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Purge Inactive Orgs
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Purge Inactive Organizations
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove all organizations that have been
                  inactive for more than 90 days. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    toast({
                      title: "Coming Soon",
                      description:
                        "This feature is not yet implemented. No data was affected.",
                    })
                  }
                >
                  Confirm Purge
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            variant="outline"
            className="gap-2"
            onClick={() =>
              toast({
                title: "Export All Data",
                description:
                  "Full platform data export will be available in a future update. Contact engineering for manual exports.",
              })
            }
          >
            <Download className="h-4 w-4" />
            Export All Data
          </Button>
        </div>
      </div>
    </div>
  );
}
