import { Controller, Get, Header, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { AdminAuth } from "../auth/admin-auth";
import { ApiStandardErrors } from "../http/envelope";
import { AnalyticsService, IAnalyticsPeriod } from "./analytics.service";

const PERIODS: IAnalyticsPeriod[] = ["7d", "28d", "90d"];

@ApiTags("Admin")
@ApiStandardErrors()
@AdminAuth()
@Controller("admin/analytics")
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get()
  @Header("Cache-Control", "no-store")
  @ApiQuery({ name: "period", required: false, enum: PERIODS })
  @ApiOperation({ summary: "Fréquentation du site public (Google Analytics)" })
  overview(@Query("period") period?: string) {
    const selected = PERIODS.includes(period as IAnalyticsPeriod) ? (period as IAnalyticsPeriod) : "28d";
    return this.analytics.overview(selected);
  }
}
