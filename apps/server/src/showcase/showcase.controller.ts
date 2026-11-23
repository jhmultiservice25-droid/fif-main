import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { memoryStorage } from "multer";
import { AdminAuth, InnovatorAuth } from "../auth/admin-auth";
import { ApiStandardErrors } from "../http/envelope";
import { AddPresenterDto, ConfirmImportDto, MovePresenterDto, PickDto, ShowcaseSettingsDto } from "./showcase.dto";
import { ShowcaseService } from "./showcase.service";
import { TEMPLATE_CSV } from "./solutions-file";

type Authed = Request & { user?: { id: string } };

const importInterceptor = FileInterceptor("file", {
  storage: memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/\.(csv|xlsx)$/i.test(file.originalname)) {
      cb(new BadRequestException("Fichier CSV ou XLSX attendu."), false);
      return;
    }
    cb(null, true);
  },
});

@ApiStandardErrors()
@Controller()
export class ShowcaseController {
  constructor(private readonly showcase: ShowcaseService) {}

  // --- Innovators ---------------------------------------------------------------

  @InnovatorAuth()
  @Get("me/showcase")
  @Header("Cache-Control", "no-store")
  @ApiTags("Innovateur")
  @ApiOperation({ summary: "Solutions à présenter, places restantes et mes choix" })
  mine(@Req() request: Authed, @Query("search") search?: string, @Query("sector") sector?: string) {
    return this.showcase.innovatorView(request.user!.id, { search, sector });
  }

  @InnovatorAuth()
  @Post("me/showcase/:solutionId")
  @HttpCode(200)
  @ApiTags("Innovateur")
  @ApiOperation({ summary: "Choisir une solution à présenter (2 max, 3 présentateurs max par solution)" })
  pick(@Req() request: Authed, @Param("solutionId") solutionId: string, @Body() body: PickDto) {
    return this.showcase.pick(request.user!.id, solutionId, body.listedPublicly ?? true);
  }

  @InnovatorAuth()
  @Patch("me/showcase/:solutionId")
  @ApiTags("Innovateur")
  @ApiOperation({ summary: "Afficher ou masquer mon nom sur la page publique" })
  listing(@Req() request: Authed, @Param("solutionId") solutionId: string, @Body() body: PickDto) {
    return this.showcase.setListing(request.user!.id, solutionId, body.listedPublicly ?? true);
  }

  @InnovatorAuth()
  @Delete("me/showcase/:solutionId")
  @ApiTags("Innovateur")
  @ApiOperation({ summary: "Libérer une solution" })
  release(@Req() request: Authed, @Param("solutionId") solutionId: string) {
    return this.showcase.release(request.user!.id, solutionId);
  }

  // --- Admin --------------------------------------------------------------------

  @AdminAuth()
  @Get("admin/showcase")
  @Header("Cache-Control", "no-store")
  @ApiTags("Admin")
  @ApiOperation({ summary: "Solutions, présentateurs, couverture et réglages" })
  overview() {
    return this.showcase.adminOverview();
  }

  @AdminAuth()
  @Put("admin/showcase/settings")
  @ApiTags("Admin")
  @ApiOperation({ summary: "Réglages : ouverture, échéance, limites, sessions Demo Show" })
  settings(@Body() body: ShowcaseSettingsDto) {
    return this.showcase.updateSettings(body);
  }

  @AdminAuth()
  @Post("admin/showcase/import")
  @HttpCode(200)
  @ApiTags("Admin")
  @ApiConsumes("multipart/form-data")
  @ApiBody({ schema: { type: "object", required: ["file"], properties: { file: { type: "string", format: "binary" } } } })
  @ApiOperation({ summary: "Aperçu d'import CSV/XLSX (rien n'est enregistré)" })
  @UseInterceptors(importInterceptor)
  preview(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException("Fichier manquant.");
    return this.showcase.previewImport(file);
  }

  @AdminAuth()
  @Post("admin/showcase/import/:token/confirm")
  @HttpCode(200)
  @ApiTags("Admin")
  @ApiOperation({ summary: "Appliquer un aperçu d'import" })
  confirm(@Param("token") token: string, @Body() body: ConfirmImportDto) {
    return this.showcase.confirmImport(token, !!body.deactivateMissing);
  }

  @AdminAuth()
  @Get("admin/showcase/template.csv")
  @ApiTags("Admin")
  @ApiOperation({ summary: "Modèle de fichier d'import" })
  template(@Res() response: Response) {
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", 'attachment; filename="modele-solutions-fif.csv"');
    response.send(TEMPLATE_CSV);
  }

  @AdminAuth()
  @Get("admin/showcase/export.csv")
  @ApiTags("Admin")
  @ApiOperation({ summary: "Export des présentateurs par solution" })
  async export(@Res() response: Response) {
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", 'attachment; filename="presentateurs-fif-2026.csv"');
    response.send(await this.showcase.exportCsv());
  }

  @AdminAuth()
  @Post("admin/showcase/solutions/:id/presenters")
  @ApiTags("Admin")
  @ApiOperation({ summary: "Attribuer une solution à un innovateur (e-mail envoyé)" })
  add(@Param("id") id: string, @Body() body: AddPresenterDto, @Req() request: Authed) {
    return this.showcase.adminAdd(id, body.email, !!body.overrideLimits, request.user!.id);
  }

  @AdminAuth()
  @Delete("admin/showcase/solutions/:id/presenters/:userId")
  @ApiTags("Admin")
  @ApiOperation({ summary: "Retirer un présentateur (e-mail envoyé)" })
  remove(@Param("id") id: string, @Param("userId") userId: string) {
    return this.showcase.adminRemove(id, userId);
  }

  @AdminAuth()
  @Post("admin/showcase/solutions/:id/presenters/:userId/move")
  @HttpCode(200)
  @ApiTags("Admin")
  @ApiOperation({ summary: "Déplacer un présentateur vers une autre solution (e-mail envoyé)" })
  move(@Param("id") id: string, @Param("userId") userId: string, @Body() body: MovePresenterDto, @Req() request: Authed) {
    return this.showcase.adminMove(id, userId, body.toSolutionId, !!body.overrideLimits, request.user!.id);
  }
}
