import { CanActivate, ConflictException, ForbiddenException, Injectable } from "@nestjs/common";
import { HackademyService } from "./hackademy.service";

@Injectable()
export class HackademyRegistrationGuard implements CanActivate {
  constructor(private readonly hackademy: HackademyService) {}

  async canActivate(): Promise<boolean> {
    const availability = await this.hackademy.registrationAvailability();
    if (!availability.open) {
      throw new ForbiddenException("Les candidatures HACKDEMY CTF seront ouvertes du 10 au 15 décembre 2026.");
    }
    if (availability.full) {
      throw new ConflictException("Les 20 places d'équipe disponibles sont déjà attribuées.");
    }
    return true;
  }
}
