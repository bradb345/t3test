"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { User, Briefcase, Phone } from "lucide-react";
import { PersonalInfoForm } from "./PersonalInfoForm";
import { EmploymentInfoForm } from "./EmploymentInfoForm";
import { EmergencyContactsForm } from "./EmergencyContactsForm";
import type {
  user,
  tenantProfiles,
  employmentInfo,
  emergencyContacts,
} from "~/server/db/schema";

type UserType = typeof user.$inferSelect;
type TenantProfile = typeof tenantProfiles.$inferSelect;
type EmploymentInfo = typeof employmentInfo.$inferSelect;
type EmergencyContact = typeof emergencyContacts.$inferSelect;

interface ProfileTabProps {
  user: UserType;
  profile: TenantProfile | null;
  employment: EmploymentInfo | null;
  emergencyContacts: EmergencyContact[];
}

export function ProfileTab({
  user,
  profile,
  employment: initialEmployment,
  emergencyContacts: initialContacts,
}: ProfileTabProps) {
  const [currentUser, setCurrentUser] = useState(user);
  const [employment, setEmployment] = useState(initialEmployment);
  const [contacts, setContacts] = useState(initialContacts);

  const handleUserUpdate = (updatedUser: UserType) => {
    setCurrentUser(updatedUser);
  };

  const handleEmploymentUpdate = (updatedEmployment: EmploymentInfo) => {
    setEmployment(updatedEmployment);
  };

  const handleContactsUpdate = (updatedContacts: EmergencyContact[]) => {
    setContacts(updatedContacts);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Profile</h2>
        <p className="text-muted-foreground">
          Manage your personal information and contact details
        </p>
      </div>

      <div className="grid gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Your basic contact information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PersonalInfoForm user={currentUser} onUpdate={handleUserUpdate} />
          </CardContent>
        </Card>

        {/* Employment Information */}
        {profile && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Employment Information
              </CardTitle>
              <CardDescription>
                Your current employment details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmploymentInfoForm
                employment={employment}
                profileId={profile.id}
                onUpdate={handleEmploymentUpdate}
              />
            </CardContent>
          </Card>
        )}

        {/* Emergency Contacts */}
        {profile && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Emergency Contacts
              </CardTitle>
              <CardDescription>
                People to contact in case of emergency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmergencyContactsForm
                contacts={contacts}
                profileId={profile.id}
                onUpdate={handleContactsUpdate}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
