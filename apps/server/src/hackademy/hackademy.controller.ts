import { BadRequestException, Controller, Get, Post, Body, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { diskStorage } from "multer";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { AdminAuth } from "../auth/admin-auth";
import { ApiCreatedData, ApiOkData, ApiStandardErrors } from "../http/envelope";
import { HackademyService } from "./hackademy.service";
import { HackademyApplicationDto } from "./hackademy.dto";

const uploadDir = join(process.env.UPLOAD_DIR ?? "./data/uploads", "hackademy");
const extensions: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

@ApiTags("HACKDEMY CTF")
@ApiStandardErrors()
@Controller()
export class HackademyController {
  constructor(private readonly hackademy: HackademyService) {}

  @Post("applications/hackademy-ctf")
  @ApiOperation({ summary: "Soumettre une candidature d'équipe HACKDEMY CTF" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({ type: HackademyApplicationDto })
  @ApiCreatedData(HackademyApplicationDto, "Candidature HACKDEMY CTF enregistrée.")
  @UseInterceptors(FileInterceptor("logo", {
    storage: diskStorage({
      destination: uploadDir,
      filename: (_req, file, cb) => cb(null, `${randomUUID()}${extensions[file.mimetype]}`),
    }),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!extensions[file.mimetype]) {
        cb(new BadRequestException("Le logo doit être au format JPG, PNG ou WebP."), false);
        return;
      }
      cb(null, true);
    },
  }))
  async create(@Body() body: HackademyApplicationDto, @UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException("Le logo de l'équipe est obligatoire.");
    if (body.memberNames.some((name) => !name?.trim())) {
      throw new BadRequestException("Les noms des quatre coéquipiers sont obligatoires.");
    }
    return this.hackademy.create(body, `/uploads/hackademy/${file.filename}`);
  }

  @AdminAuth()
  @Get("admin/hackademy-ctf/applications")
  @ApiOperation({ summary: "Lister les candidatures HACKDEMY CTF" })
  @ApiOkData(HackademyApplicationDto)
  list(@Query("page") pageValue?: string, @Query("pageSize") pageSizeValue?: string) {
    const page = Math.max(1, Number.parseInt(pageValue ?? "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(pageSizeValue ?? "20", 10) || 20));
    return this.hackademy.adminList(page, pageSize);
  }
}
