"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Wrench, CreditCard, FileText, MessageSquare } from "lucide-react";
import Link from "next/link";

export function QuickActionsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks at your fingertips</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="flex h-auto flex-col gap-2 py-4"
            asChild
          >
            <Link href="/dashboard?tab=maintenance&action=new">
              <Wrench className="h-5 w-5" />
              <span className="text-xs">New Request</span>
            </Link>
          </Button>

          <Button
            variant="outline"
            className="flex h-auto flex-col gap-2 py-4"
            disabled
          >
            <CreditCard className="h-5 w-5" />
            <span className="text-xs">Pay Rent</span>
          </Button>

          <Button
            variant="outline"
            className="flex h-auto flex-col gap-2 py-4"
            asChild
          >
            <Link href="/dashboard?tab=documents">
              <FileText className="h-5 w-5" />
              <span className="text-xs">View Lease</span>
            </Link>
          </Button>

          <Button
            variant="outline"
            className="flex h-auto flex-col gap-2 py-4"
            asChild
          >
            <Link href="/messages">
              <MessageSquare className="h-5 w-5" />
              <span className="text-xs">Messages</span>
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
