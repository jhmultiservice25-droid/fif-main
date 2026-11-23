import { BadRequestException } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { randomUUID } from "node:crypto";
import { join } from "node:path";

export const PROFILES_UPLOAD_DIR = join(process.env.UPLOAD_DIR ?? "./data/uploads", "profiles");
export const PROFILES_URL_PREFIX = "/uploads/profiles";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** The stored extension comes from the mimetype, never the client filename — these files are served publicly. */
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export const profileImageInterceptor = (field: string) =>
  FileInterceptor(field, {
    storage: diskStorage({
      destination: PROFILES_UPLOAD_DIR,
      filename: (_req, file, cb) => {
        cb(null, `${randomUUID()}${EXTENSIONS[file.mimetype]}`);
      },
    }),
    limits: { fileSize: MAX_IMAGE_BYTES },
    fileFilter: (_req, file, cb) => {
      if (!EXTENSIONS[file.mimetype]) {
        cb(new BadRequestException("L’image doit être au format JPG, PNG ou WebP."), false);
        return;
      }
      cb(null, true);
    },
  });

export const profileImageUrl = (file: Express.Multer.File) => `${PROFILES_URL_PREFIX}/${file.filename}`;
