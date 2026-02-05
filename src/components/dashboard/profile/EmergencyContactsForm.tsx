"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Loader2, Plus, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import type { emergencyContacts } from "~/server/db/schema";

type EmergencyContact = typeof emergencyContacts.$inferSelect;

interface EmergencyContactsFormProps {
  contacts: EmergencyContact[];
  profileId: number;
  onUpdate: (contacts: EmergencyContact[]) => void;
}

interface ContactFormData {
  fullName: string;
  relationship: string;
  phone: string;
  email: string;
}

export function EmergencyContactsForm({
  contacts,
  profileId: _profileId,
  onUpdate,
}: EmergencyContactsFormProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [deleteContactId, setDeleteContactId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState<ContactFormData>({
    fullName: "",
    relationship: "",
    phone: "",
    email: "",
  });

  const resetForm = () => {
    setFormData({
      fullName: "",
      relationship: "",
      phone: "",
      email: "",
    });
    setEditingContact(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (contact: EmergencyContact) => {
    setEditingContact(contact);
    setFormData({
      fullName: contact.fullName,
      relationship: contact.relationship,
      phone: contact.phone,
      email: contact.email ?? "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!formData.relationship.trim()) {
      toast.error("Relationship is required");
      return;
    }
    if (!formData.phone.trim()) {
      toast.error("Phone number is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const url = editingContact
        ? `/api/tenant/profile/emergency-contacts/${editingContact.id}`
        : "/api/tenant/profile/emergency-contacts";

      const response = await fetch(url, {
        method: editingContact ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          relationship: formData.relationship.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save contact");
      }

      const savedContact = (await response.json()) as EmergencyContact;

      if (editingContact) {
        onUpdate(contacts.map((c) => (c.id === savedContact.id ? savedContact : c)));
        toast.success("Contact updated");
      } else {
        onUpdate([...contacts, savedContact]);
        toast.success("Contact added");
      }

      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving contact:", error);
      toast.error("Failed to save contact");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteContactId) return;

    setIsDeleting(true);

    try {
      const response = await fetch(
        `/api/tenant/profile/emergency-contacts/${deleteContactId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Failed to delete contact");
      }

      onUpdate(contacts.filter((c) => c.id !== deleteContactId));
      toast.success("Contact deleted");
      setDeleteContactId(null);
    } catch (error) {
      console.error("Error deleting contact:", error);
      toast.error("Failed to delete contact");
    } finally {
      setIsDeleting(false);
    }
  };

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Users className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="font-medium">No emergency contacts</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add contacts who can be reached in case of emergency
        </p>
        <Button variant="outline" className="mt-4" onClick={openAddModal}>
          <Plus className="mr-2 h-4 w-4" />
          Add Emergency Contact
        </Button>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Emergency Contact</DialogTitle>
              <DialogDescription>
                Add someone who can be contacted in case of emergency.
              </DialogDescription>
            </DialogHeader>
            <ContactForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              onCancel={() => setIsModalOpen(false)}
              isEditing={false}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {contacts.map((contact) => (
          <div
            key={contact.id}
            className="flex items-start justify-between rounded-lg border p-4"
          >
            <div>
              <p className="font-medium">{contact.fullName}</p>
              <p className="text-sm text-muted-foreground">{contact.relationship}</p>
              <p className="mt-2 text-sm">{contact.phone}</p>
              {contact.email && (
                <p className="text-sm text-muted-foreground">{contact.email}</p>
              )}
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => openEditModal(contact)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteContactId(contact.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={openAddModal}>
          <Plus className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingContact ? "Edit Emergency Contact" : "Add Emergency Contact"}
            </DialogTitle>
            <DialogDescription>
              {editingContact
                ? "Update the contact information."
                : "Add someone who can be contacted in case of emergency."}
            </DialogDescription>
          </DialogHeader>
          <ContactForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            onCancel={() => setIsModalOpen(false)}
            isEditing={!!editingContact}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteContactId !== null}
        onOpenChange={() => setDeleteContactId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this emergency contact? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ContactForm({
  formData,
  setFormData,
  onSubmit,
  isSubmitting,
  onCancel,
  isEditing,
}: {
  formData: ContactFormData;
  setFormData: React.Dispatch<React.SetStateAction<ContactFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  onCancel: () => void;
  isEditing: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input
          id="fullName"
          value={formData.fullName}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, fullName: e.target.value }))
          }
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="relationship">Relationship</Label>
        <Input
          id="relationship"
          placeholder="e.g., Parent, Spouse, Sibling"
          value={formData.relationship}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, relationship: e.target.value }))
          }
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="+1 (555) 123-4567"
          value={formData.phone}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, phone: e.target.value }))
          }
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email (optional)</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, email: e.target.value }))
          }
          disabled={isSubmitting}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : isEditing ? (
            "Save Changes"
          ) : (
            "Add Contact"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
