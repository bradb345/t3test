"use client";

import Link from "next/link";
import { Plus, Users, FileText, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";

interface QuickActionsCardProps {
  onInviteTenant: () => void;
}

export function QuickActionsCard({ onInviteTenant }: QuickActionsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        <Button
          variant="outline"
          className="justify-start"
          asChild
        >
          <Link href="/list-property/create">
            <Plus className="mr-2 h-4 w-4" />
            Add New Property
          </Link>
        </Button>

        <Button
          variant="outline"
          className="justify-start"
          onClick={onInviteTenant}
        >
          <Users className="mr-2 h-4 w-4" />
          Invite Tenant
        </Button>

        <Button
          variant="outline"
          className="justify-start"
          asChild
        >
          <Link href="/my-properties?tab=documents">
            <FileText className="mr-2 h-4 w-4" />
            View Documents
          </Link>
        </Button>

        <Button
          variant="outline"
          className="justify-start"
          asChild
        >
          <Link href="/my-properties?tab=properties">
            <Building2 className="mr-2 h-4 w-4" />
            Manage Properties
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
