import { Controller, Get, Query, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Workbook } from "exceljs";
import type { Response } from "express";
import { AdminAuth } from "../auth/admin-auth";
import { ApiStandardErrors, SkipEnvelope } from "../http/envelope";
import { InnovatorsService } from "./innovators.service";

@ApiTags("Admin")
@ApiStandardErrors()
@AdminAuth()
@Controller("admin/innovators")
export class AdminInnovatorsController {
  constructor(private readonly innovators: InnovatorsService) {}

  @SkipEnvelope()
  @Get("export.xlsx")
  @ApiOperation({ summary: "Exporter les coordonnées des innovateurs au format Excel" })
  async export(@Res() response: Response): Promise<void> {
    const profiles = await this.innovators.adminExportInnovators();
    const workbook = new Workbook();
    workbook.creator = "FIKIRI Innovation Festival";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Innovateurs");
    sheet.columns = [
      { header: "Nom complet", key: "name", width: 30 },
      { header: "E-mail", key: "email", width: 34 },
      { header: "Téléphone / WhatsApp", key: "phone", width: 24 },
      { header: "Organisation", key: "organization", width: 30 },
      { header: "Ville", key: "city", width: 20 },
      { header: "Projets / solutions", key: "projects", width: 48 },
      { header: "Date d'inscription", key: "createdAt", width: 22 },
      { header: "Dernière mise à jour", key: "updatedAt", width: 22 },
    ];

    for (const profile of profiles) {
      sheet.addRow({
        name: profile.displayName || "",
        email: profile.email || "",
        phone: profile.phone || "",
        organization: profile.organization || "",
        city: profile.city || "",
        projects: profile.projects.map((project) => project.title).filter(Boolean).join(" ; "),
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      });
    }

    const submissionsSheet = workbook.addWorksheet("Soumissions");
    submissionsSheet.columns = [
      { header: "Innovateur", key: "innovator", width: 30 },
      { header: "E-mail", key: "email", width: 34 },
      { header: "Téléphone / WhatsApp", key: "phone", width: 24 },
      { header: "Organisation", key: "organization", width: 28 },
      { header: "Ville", key: "city", width: 18 },
      { header: "Titre de la soumission", key: "title", width: 34 },
      { header: "Statut", key: "status", width: 18 },
      { header: "Problème traité", key: "problemSolved", width: 42 },
      { header: "Solution proposée", key: "solution", width: 48 },
      { header: "Secteurs", key: "sectors", width: 28 },
      { header: "Stade", key: "stage", width: 20 },
      { header: "Date de soumission", key: "createdAt", width: 22 },
      { header: "Dernière mise à jour", key: "updatedAt", width: 22 },
    ];

    for (const profile of profiles) {
      for (const project of profile.projects) {
        submissionsSheet.addRow({
          innovator: profile.displayName || "",
          email: profile.email || "",
          phone: profile.phone || "",
          organization: profile.organization || "",
          city: profile.city || "",
          title: project.title || "",
          status: project.status || "",
          problemSolved: project.problemSolved || "",
          solution: project.solution || "",
          sectors: project.sectors.join(" ; "),
          stage: project.stage || "",
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        });
      }
    }

    const submissionsHeader = submissionsSheet.getRow(1);
    submissionsHeader.font = { bold: true, color: { argb: "FFFFFFFF" } };
    submissionsHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF006DA4" } };
    submissionsHeader.alignment = { vertical: "middle", wrapText: true };
    submissionsHeader.height = 28;
    submissionsSheet.views = [{ state: "frozen", ySplit: 1 }];
    submissionsSheet.autoFilter = { from: "A1", to: "M1" };

    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF006DA4" } };
    header.alignment = { vertical: "middle", wrapText: true };
    header.height = 28;
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    sheet.autoFilter = { from: "A1", to: "H1" };

    const buffer = await workbook.xlsx.writeBuffer();
    response.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    response.setHeader("Content-Disposition", 'attachment; filename="innovateurs-fif.xlsx"');
    response.setHeader("Cache-Control", "no-store");
    response.send(Buffer.from(buffer));
  }

  @Get()
  @ApiOperation({ summary: "Lister les profils innovateurs pour l'administration" })
  list(@Query("page") pageValue?: string, @Query("pageSize") pageSizeValue?: string) {
    const page = Math.max(1, Number.parseInt(pageValue ?? "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(pageSizeValue ?? "20", 10) || 20));
    return this.innovators.adminListInnovators(page, pageSize);
  }
}
