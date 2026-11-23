import { Controller, Get, Query, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Workbook } from "exceljs";
import type { Response } from "express";
import { AdminAuth } from "../auth/admin-auth";
import { ApiOkData, ApiStandardErrors } from "../http/envelope";
import { InnovatorsService } from "./innovators.service";

@ApiTags("Admin")
@ApiStandardErrors()
@AdminAuth()
@Controller("admin/innovators")
export class AdminInnovatorsController {
  constructor(private readonly innovators: InnovatorsService) {}

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
  @ApiOkData([])
  list(@Query("page") pageValue?: string, @Query("pageSize") pageSizeValue?: string) {
    const page = Math.max(1, Number.parseInt(pageValue ?? "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(pageSizeValue ?? "20", 10) || 20));
    return this.innovators.adminListInnovators(page, pageSize);
  }
}
