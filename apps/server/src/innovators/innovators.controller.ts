import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Req, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { diskStorage } from "multer";
import { randomUUID } from "node:crypto";
import { extname, join } from "node:path";
import { InnovatorAuth } from "../auth/admin-auth";
import { ApiCreatedData, ApiOkData, ApiStandardErrors } from "../http/envelope";
import { InnovatorProfileResponse, InnovatorProjectResponse } from "../http/models";
import { profileImageInterceptor, profileImageUrl } from "../http/profile-image";
import { PatchInnovatorProfileDto, UpsertProjectDto } from "./innovators.dto";
import { InnovatorsService } from "./innovators.service";

const uploadDir = process.env.UPLOAD_DIR ?? "./data/uploads";
const MAX_PITCH_VIDEO_BYTES = 200 * 1024 * 1024;

type Authed = Request & { user?: { id: string } };

@ApiTags("Innovateur")
@ApiStandardErrors()
@InnovatorAuth()
@Controller("me")
export class InnovatorsController {
  constructor(private readonly innovators: InnovatorsService) {}

  @Get("innovator")
  @ApiOperation({ summary: "Profil innovateur" })
  @ApiOkData(InnovatorProfileResponse)
  profile(@Req() request: Authed) {
    return this.innovators.profile(request.user.id);
  }

  @Patch("innovator")
  @ApiOperation({ summary: "Mettre à jour le profil innovateur" })
  @ApiOkData(InnovatorProfileResponse)
  patchProfile(@Req() request: Authed, @Body() body: PatchInnovatorProfileDto) {
    return this.innovators.patchProfile(request.user.id, body);
  }

  @Post("innovator/photo")
  @ApiOperation({ summary: "Téléverser la photo de profil (JPG, PNG ou WebP, 5 Mo max)" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["photo"],
      properties: { photo: { type: "string", format: "binary" } },
    },
  })
  @ApiOkData(InnovatorProfileResponse)
  @UseInterceptors(profileImageInterceptor("photo"))
  uploadPhoto(@Req() request: Authed, @UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException("La photo est obligatoire.");
    }
    return this.innovators.savePhoto(request.user.id, profileImageUrl(file));
  }

  @Get("projects")
  @ApiOperation({ summary: "Lister mes projets" })
  @ApiOkData([InnovatorProjectResponse])
  listProjects(@Req() request: Authed) {
    return this.innovators.listProjects(request.user.id);
  }

  @Post("projects")
  @ApiOperation({ summary: "Créer un projet / une solution" })
  @ApiCreatedData(InnovatorProjectResponse)
  createProject(@Req() request: Authed, @Body() body: UpsertProjectDto) {
    return this.innovators.createProject(request.user.id, body);
  }

  @Get("projects/:id")
  @ApiOperation({ summary: "Détail d’un projet" })
  @ApiOkData(InnovatorProjectResponse)
  getProject(@Req() request: Authed, @Param("id") id: string) {
    return this.innovators.getProject(request.user.id, id);
  }

  @Patch("projects/:id")
  @ApiOperation({ summary: "Mettre à jour un projet" })
  @ApiOkData(InnovatorProjectResponse)
  patchProject(@Req() request: Authed, @Param("id") id: string, @Body() body: UpsertProjectDto) {
    return this.innovators.patchProject(request.user.id, id, body);
  }

  @Post("projects/:id/pitch-video")
  @ApiOperation({ summary: "Téléverser la vidéo de présentation (2 min max, 200 Mo max)" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["video"],
      properties: { video: { type: "string", format: "binary" } },
    },
  })
  @ApiOkData(InnovatorProjectResponse)
  @UseInterceptors(
    FileInterceptor("video", {
      storage: diskStorage({
        destination: uploadDir,
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      limits: { fileSize: MAX_PITCH_VIDEO_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith("video/")) {
          cb(new BadRequestException("Le fichier doit être une vidéo."), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadPitchVideo(
    @Req() request: Authed,
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new BadRequestException("La vidéo de présentation est obligatoire.");
    }
    return this.innovators.savePitchVideo(request.user.id, id, join(uploadDir, file.filename), file.originalname);
  }
}
