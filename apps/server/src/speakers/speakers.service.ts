import { Injectable, NotFoundException } from "@nestjs/common";
import type { Speaker } from "@prisma/client";
import { withoutNullish } from "../domain";
import { PrismaService } from "../prisma/prisma.service";
import { UpsertSpeakerDto } from "./speakers.dto";

function toResponse(speaker: Speaker) {
  const { photo, ...rest } = speaker;
  return { ...rest, photoUrl: photo ? `/uploads/speakers/${photo}` : null };
}

function toPublicResponse(speaker: Speaker) {
  const { email: _email, ...rest } = toResponse(speaker);
  return rest;
}

@Injectable()
export class SpeakersService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const speakers = await this.prisma.speaker.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    return speakers.map(toPublicResponse);
  }

  async adminList() {
    const speakers = await this.prisma.speaker.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    return speakers.map(toResponse);
  }

  async get(id: string) {
    const speaker = await this.prisma.speaker.findUnique({ where: { id } });
    if (!speaker) {
      throw new NotFoundException("Intervenant introuvable.");
    }
    return speaker;
  }

  async create(dto: UpsertSpeakerDto, photo?: string) {
    const speaker = await this.prisma.speaker.create({
      data: {
        name: dto.name,
        title: dto.title ?? "",
        bio: dto.bio ?? "",
        email: dto.email,
        days: dto.days ?? [],
        order: dto.order ?? 0,
        photo,
      },
    });
    return toResponse(speaker);
  }

  async update(id: string, dto: UpsertSpeakerDto) {
    await this.get(id);
    const speaker = await this.prisma.speaker.update({
      where: { id },
      data: withoutNullish(dto),
    });
    return toResponse(speaker);
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.speaker.delete({ where: { id } });
  }

  async savePhoto(id: string, filename: string) {
    await this.get(id);
    const speaker = await this.prisma.speaker.update({
      where: { id },
      data: { photo: filename },
    });
    return toResponse(speaker);
  }
}
