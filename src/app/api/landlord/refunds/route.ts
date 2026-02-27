import { NextResponse, type NextRequest } from "next/server";
import { db } from "~/server/db";
import { refunds, leases, units, properties, user } from "~/server/db/schema";
import { eq, inArray, desc } from "drizzle-orm";
import { getAuthenticatedLandlord } from "~/server/auth";
import { createAndEmitNotification } from "~/server/notification-emitter";
import { sendAppEmail } from "~/lib/emails/server";

// POST: Create a new refund or deposit return
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedLandlord();
    if (authResult.error) return authResult.error;
    const landlord = authResult.user;

    const body = (await request.json()) as {
      leaseId: number;
      type: "refund" | "deposit_return";
      amount: number;
      reason?: string;
      deductions?: { description: string; amount: number }[];
    };

    const { leaseId, type, amount, reason, deductions } = body;

    // Validate required fields
    if (!leaseId || !type || !amount) {
      return NextResponse.json(
        { error: "leaseId, type, and amount are required" },
        { status: 400 }
      );
    }

    if (!["refund", "deposit_return"].includes(type)) {
      return NextResponse.json(
        { error: "type must be 'refund' or 'deposit_return'" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    // Fetch the lease with unit and property to verify ownership
    const [leaseData] = await db
      .select({
        lease: leases,
        unit: units,
        property: properties,
        tenant: user,
      })
      .from(leases)
      .innerJoin(units, eq(units.id, leases.unitId))
      .innerJoin(properties, eq(properties.id, units.propertyId))
      .innerJoin(user, eq(user.id, leases.tenantId))
      .where(eq(leases.id, leaseId))
      .limit(1);

    if (!leaseData) {
      return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    }

    // Verify landlord owns the property
    if (leaseData.property.userId !== landlord.auth_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // For deposit returns, validate amount against security deposit
    if (type === "deposit_return" && leaseData.lease.securityDeposit) {
      const depositAmount = parseFloat(leaseData.lease.securityDeposit);
      if (amount > depositAmount) {
        return NextResponse.json(
          { error: "Refund amount cannot exceed security deposit" },
          { status: 400 }
        );
      }
    }

    // Validate deductions if provided
    if (deductions && deductions.length > 0) {
      const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
      if (type === "deposit_return" && leaseData.lease.securityDeposit) {
        const depositAmount = parseFloat(leaseData.lease.securityDeposit);
        if (totalDeductions > depositAmount) {
          return NextResponse.json(
            { error: "Total deductions cannot exceed security deposit" },
            { status: 400 }
          );
        }
      }
    }

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 30);

    const [refund] = await db
      .insert(refunds)
      .values({
        leaseId,
        tenantId: leaseData.lease.tenantId,
        landlordId: landlord.id,
        type,
        amount: amount.toFixed(2),
        currency: leaseData.lease.currency,
        reason: reason ?? null,
        status: "pending_tenant_action",
        deductions: deductions ? JSON.stringify(deductions) : null,
        tenantActionDeadline: deadline,
      })
      .returning();

    // Notify tenant
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const formattedAmount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: leaseData.lease.currency,
    }).format(amount);

    const isDepositReturn = type === "deposit_return";

    await createAndEmitNotification({
      userId: leaseData.lease.tenantId,
      type: isDepositReturn ? "deposit_return_initiated" : "refund_initiated",
      title: isDepositReturn ? "Security Deposit Return" : "Refund Initiated",
      message: isDepositReturn
        ? `Your landlord is returning your security deposit (${formattedAmount}). Please confirm to receive funds.`
        : `Your landlord has initiated a refund of ${formattedAmount}. Please confirm to receive funds.`,
      data: JSON.stringify({ refundId: refund!.id, amount, type }),
      actionUrl: "/dashboard?tab=payments",
    });

    // Send email
    try {
      if (isDepositReturn) {
        const depositAmount = leaseData.lease.securityDeposit ?? amount.toFixed(2);
        const totalDeductions = deductions
          ? deductions.reduce((sum, d) => sum + d.amount, 0)
          : 0;
        const disposition =
          totalDeductions === 0
            ? "returned"
            : amount === 0
              ? "withheld"
              : "partial";

        await sendAppEmail(leaseData.tenant.email, "deposit_disposition", {
          tenantName: `${leaseData.tenant.first_name} ${leaseData.tenant.last_name}`,
          depositAmount: String(depositAmount),
          returnAmount: amount.toFixed(2),
          currency: leaseData.lease.currency,
          disposition,
          deductions: deductions ? JSON.stringify(deductions) : undefined,
          dashboardUrl: `${baseUrl}/dashboard?tab=payments`,
        });
      } else {
        await sendAppEmail(leaseData.tenant.email, "refund_initiated", {
          tenantName: `${leaseData.tenant.first_name} ${leaseData.tenant.last_name}`,
          amount: amount.toFixed(2),
          currency: leaseData.lease.currency,
          reason,
          deadline,
          dashboardUrl: `${baseUrl}/dashboard?tab=payments`,
        });
      }
    } catch (error) {
      console.error("Failed to send refund email:", error);
    }

    return NextResponse.json(refund, { status: 201 });
  } catch (error) {
    console.error("Error creating refund:", error);
    return NextResponse.json(
      { error: "Failed to create refund" },
      { status: 500 }
    );
  }
}

// GET: List all refunds for the landlord
export async function GET() {
  try {
    const authResult = await getAuthenticatedLandlord();
    if (authResult.error) return authResult.error;
    const landlord = authResult.user;

    // Get landlord's properties
    const landlordProperties = await db
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.userId, landlord.auth_id));

    if (landlordProperties.length === 0) {
      return NextResponse.json([]);
    }

    const propertyIds = landlordProperties.map((p) => p.id);

    // Get units for those properties
    const landlordUnits = await db
      .select({ id: units.id })
      .from(units)
      .where(inArray(units.propertyId, propertyIds));

    if (landlordUnits.length === 0) {
      return NextResponse.json([]);
    }

    const unitIds = landlordUnits.map((u) => u.id);

    // Get leases for those units
    const landlordLeases = await db
      .select({ id: leases.id })
      .from(leases)
      .where(inArray(leases.unitId, unitIds));

    if (landlordLeases.length === 0) {
      return NextResponse.json([]);
    }

    const leaseIds = landlordLeases.map((l) => l.id);

    // Fetch refunds with details
    const refundsData = await db
      .select({
        refund: refunds,
        tenant: user,
        lease: leases,
        unit: units,
        property: properties,
      })
      .from(refunds)
      .innerJoin(leases, eq(leases.id, refunds.leaseId))
      .innerJoin(user, eq(user.id, refunds.tenantId))
      .innerJoin(units, eq(units.id, leases.unitId))
      .innerJoin(properties, eq(properties.id, units.propertyId))
      .where(inArray(refunds.leaseId, leaseIds))
      .orderBy(desc(refunds.createdAt));

    const result = refundsData.map((r) => ({
      ...r.refund,
      tenant: r.tenant,
      lease: r.lease,
      unit: r.unit,
      property: r.property,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching refunds:", error);
    return NextResponse.json(
      { error: "Failed to fetch refunds" },
      { status: 500 }
    );
  }
}
