import { Body, Controller, Get, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AdminAuth } from "../auth/admin-auth";
import { ApiOkData, ApiStandardErrors } from "../http/envelope";
import { BroadcastAudienceResponse, BroadcastResultResponse } from "../http/models";
import { SendBroadcastDto } from "./broadcast.dto";
import { BroadcastService } from "./broadcast.service";

@ApiTags("Admin")
@ApiStandardErrors()
@AdminAuth()
@Controller("admin/broadcast")
export class BroadcastController {
  constructor(private readonly broadcast: BroadcastService) {}

  @Get("audiences")
  @ApiOperation({ summary: "Audiences disponibles et nombre de destinataires" })
  @ApiOkData([BroadcastAudienceResponse])
  audiences() {
    return this.broadcast.audiences();
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Envoyer un e-mail à une ou plusieurs audiences" })
  @ApiBody({ type: SendBroadcastDto })
  @ApiOkData(BroadcastResultResponse)
  send(@Body() body: SendBroadcastDto) {
    return this.broadcast.send(body);
  }
}
