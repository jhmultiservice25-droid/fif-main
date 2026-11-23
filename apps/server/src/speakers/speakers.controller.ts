import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes, ApiExtraModels, ApiOperation, ApiTags } from "@nestjs/swagger";
import { diskStorage } from "multer";
import { randomUUID } from "node:crypto";
import { extname, join } from "node:path";
import { AdminAuth } from "../auth/admin-auth";
import { ApiCreatedData, ApiOkData, ApiStandardErrors } from "../http/envelope";
import { AdminSpeakerResponse, SpeakerResponse } from "../http/models";
import { UpsertSpeakerDto } from "./speakers.dto";
import { SpeakersService } from "./speakers.service";

export const SPEAKERS_UPLOAD_DIR = join(process.env.UPLOAD_DIR ?? "./data/uploads", "speakers");
const speakersUploadDir = SPEAKERS_UPLOAD_DIR;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const photoInterceptor = FileInterceptor("photo", {
  storage: diskStorage({
    destination: speakersUploadDir,
    filename: (_req, file, cb) => {
      cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: MAX_PHOTO_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new BadRequestException("Le fichier doit être une image."), false);
      return;
    }
    cb(null, true);
  },
});

@ApiStandardErrors()
@ApiExtraModels(UpsertSpeakerDto)
@Controller()
export class SpeakersController {
  constructor(private readonly speakers: SpeakersService) {}

  @Get("speakers")
  @ApiTags("Speakers")
  @ApiOperation({ summary: "Lister les intervenants du festival" })
  @ApiOkData([SpeakerResponse])
  list() {
    return this.speakers.list();
  }

  @AdminAuth()
  @Get("admin/speakers")
  @ApiTags("Admin")
  @ApiOperation({ summary: "Lister les intervenants (avec e-mail de contact)" })
  @ApiOkData([AdminSpeakerResponse])
  adminList() {
    return this.speakers.adminList();
  }

  @AdminAuth()
  @Post("admin/speakers")
  @ApiTags("Admin")
  @ApiOperation({ summary: "Créer un intervenant (avec photo optionnelle)" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      allOf: [
        { $ref: "#/components/schemas/UpsertSpeakerDto" },
        { type: "object", properties: { photo: { type: "string", format: "binary" } } },
      ],
    },
  })
  @ApiCreatedData(AdminSpeakerResponse)
  @UseInterceptors(photoInterceptor)
  create(@Body() body: UpsertSpeakerDto, @UploadedFile() file: Express.Multer.File | undefined) {
    return this.speakers.create(body, file?.filename);
  }

  @AdminAuth()
  @Patch("admin/speakers/:id")
  @ApiTags("Admin")
  @ApiOperation({ summary: "Mettre à jour un intervenant" })
  @ApiBody({ type: UpsertSpeakerDto })
  @ApiOkData(AdminSpeakerResponse)
  update(@Param("id") id: string, @Body() body: UpsertSpeakerDto) {
    return this.speakers.update(id, body);
  }

  @AdminAuth()
  @Delete("admin/speakers/:id")
  @ApiTags("Admin")
  @ApiOperation({ summary: "Supprimer un intervenant" })
  async remove(@Param("id") id: string): Promise<void> {
    await this.speakers.remove(id);
  }

  @AdminAuth()
  @Post("admin/speakers/:id/photo")
  @ApiTags("Admin")
  @ApiOperation({ summary: "Téléverser la photo d'un intervenant (5 Mo max)" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["photo"],
      properties: { photo: { type: "string", format: "binary" } },
    },
  })
  @ApiOkData(AdminSpeakerResponse)
  @UseInterceptors(photoInterceptor)
  uploadPhoto(@Param("id") id: string, @UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException("La photo est obligatoire.");
    }
    return this.speakers.savePhoto(id, file.filename);
  }
}
