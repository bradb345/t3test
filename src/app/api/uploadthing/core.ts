import { auth } from "@clerk/nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError, UTFiles } from "uploadthing/server";
import { z } from "zod";

const f = createUploadthing();

// Helper function to append ID to filename
function appendIdToFilename(filename: string, id: string): string {
  const lastDotIndex = filename.lastIndexOf(".");
  if (lastDotIndex === -1) {
    return `${filename}_${id}`;
  }
  const name = filename.substring(0, lastDotIndex);
  const extension = filename.substring(lastDotIndex);
  return `${name}_${id}${extension}`;
}

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Photo ID uploads for onboarding (appends user auth_id to filename)
  photoID: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
    "application/pdf": {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
  })
    .middleware(async ({ files }) => {
      const user = await auth();
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      if (!user.userId) throw new UploadThingError("Unauthorized");
      
      // Rename files to include user ID
      const fileOverrides = files.map((file) => ({
        ...file,
        name: appendIdToFilename(file.name, user.userId),
      }));
      
      return { userId: user.userId, [UTFiles]: fileOverrides };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Photo ID upload complete for userId:", metadata.userId);
      console.log("file url", file.ufsUrl);
      return { uploadedBy: metadata.userId, url: file.ufsUrl };
    }),

  // Document uploads for onboarding (proof of address, etc. - appends user auth_id to filename)
  documents: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
    "application/pdf": {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
  })
    .middleware(async ({ files }) => {
      const user = await auth();
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      if (!user.userId) throw new UploadThingError("Unauthorized");
      
      // Rename files to include user ID
      const fileOverrides = files.map((file) => ({
        ...file,
        name: appendIdToFilename(file.name, user.userId),
      }));
      
      return { userId: user.userId, [UTFiles]: fileOverrides };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Document upload complete for userId:", metadata.userId);
      console.log("file url", file.ufsUrl);
      return { uploadedBy: metadata.userId, url: file.ufsUrl };
    }),

  // Property and unit image uploads (appends property ID and user ID to filename)
  imageUploader: f({
    image: {
      /**
       * For full list of options and defaults, see the File Route API reference
       * @see https://docs.uploadthing.com/file-routes#route-config
       */
      maxFileSize: "4MB",
      maxFileCount: 10,
    },
  })
    .input(z.object({
      propertyId: z.string().optional(),
    }))
    .middleware(async ({ files, input }) => {
      const user = await auth();
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      if (!user.userId) throw new UploadThingError("Unauthorized");
      
      // Rename files to include property ID (if provided) and user ID
      const fileOverrides = files.map((file) => {
        let newName = file.name;
        if (input?.propertyId) {
          newName = appendIdToFilename(newName, input.propertyId);
        }
        // Always append user ID
        newName = appendIdToFilename(newName, user.userId);
        return { ...file, name: newName };
      });
      
      return { userId: user.userId, propertyId: input?.propertyId, [UTFiles]: fileOverrides };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      if (metadata.propertyId) {
        console.log("Property ID:", metadata.propertyId);
      }
      console.log("file url", file.ufsUrl);
      return { uploadedBy: metadata.userId, url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
