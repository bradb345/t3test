"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DeleteConfirmationDialog } from "~/components/DeleteConfirmationDialog";

interface PropertyCardProps {
  property: {
    id: number;
    name: string;
    address: string;
    imageUrls: string | null;
    propertyType: string;
  };
}

interface ErrorResponse {
  error?: string;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  let imageUrls: string[] = [];
  try {
    imageUrls = property.imageUrls ? JSON.parse(property.imageUrls) as string[] : [];
  } catch (error) {
    console.error("Error parsing imageUrls:", error);
  }
  
  const firstImage = imageUrls[0] ?? "/placeholder-property.jpg";

  const handleDelete = async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/properties/${property.id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        if (response.status === 400) {
          // Handle occupied units error
          const errorData = await response.json() as ErrorResponse;
          toast.error(errorData.error ?? "Cannot delete property with occupied units");
        } else {
          throw new Error("Failed to delete property");
        }
        return;
      }

      toast.success("Property deleted successfully");
      router.refresh();
    } catch (error) {
      console.error("Error deleting property:", error);
      toast.error("Failed to delete property");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="aspect-video relative">
        <Link href={`/my-properties/${property.id}`}>
          <Image
            src={firstImage}
            alt={property.name}
            fill
            className="object-cover"
            loading="lazy"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onError={(_e) => console.error("Image failed to load:", firstImage)}
          />
        </Link>
        <div className="absolute top-2 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded-md bg-white/90 text-gray-700 hover:bg-white/100 transition-colors">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/my-properties/${property.id}/edit`)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowDeleteModal(true)}
                disabled={isDeleting}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DeleteConfirmationDialog
            open={showDeleteModal}
            onOpenChange={setShowDeleteModal}
            onConfirm={handleDelete}
            title="Are you absolutely sure?"
            description="This action cannot be undone. This will permanently delete your property and all associated units from our servers. All units must be vacant (no active leases) before deletion."
            isDeleting={isDeleting}
          />
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg">{property.name}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {property.address}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm">
            {property.propertyType.charAt(0).toUpperCase() + 
             property.propertyType.slice(1)}
          </span>
          <Link href={`/my-properties/${property.id}`}>
            <button className="text-sm text-primary">
              View Details
            </button>
          </Link>
        </div>
      </div>
    </Card>
  );
}