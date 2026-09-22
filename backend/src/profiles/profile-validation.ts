import { BadRequestException } from "@nestjs/common";
import { normalizeAvailability } from "../domain/availability";
import { interval } from "../domain/matching";
import type { PeriodDto, ProfileDto } from "./profiles.module";

export function ensureAvailabilityLimit(value: {
  available: PeriodDto[];
  unavailable: PeriodDto[];
}) {
  if (value.available.length > 200 || value.unavailable.length > 200)
    throw new BadRequestException({
      code: "AVAILABILITY_LIMIT",
      message:
        "Votre planning dépasse 200 périodes distinctes par état. Réduisez la période sélectionnée ou regroupez vos créneaux.",
    });
}
export function validateProfile(b: ProfileDto) {
  try {
    for (const i of [...b.available, ...b.unavailable, ...b.experience])
      interval(i);
  } catch {
    throw new BadRequestException("Invalid interval or missing timezone");
  }
  if (b.experience.some((e) => Date.parse(e.end) > Date.now()))
    throw new BadRequestException("Experience must describe completed periods");
  if (
    b.qualifications.some((q) => q !== "IDE") &&
    !b.qualifications.includes("IDE")
  )
    throw new BadRequestException("Complete the IDE qualification explicitly");
  if (b.preferredShifts.some((s) => !b.acceptedShifts.includes(s)))
    throw new BadRequestException("Preferred shift must be accepted");
  if (b.details?.birthDate) {
    const date = new Date(b.details.birthDate + "T00:00:00Z");
    if (
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== b.details.birthDate ||
      date > new Date()
    )
      throw new BadRequestException("Invalid birth date");
  }
  if (
    [
      b.details?.diplomaYear,
      b.details?.ideDiplomaYear,
      b.details?.iadeDiplomaYear,
      b.details?.ibodeDiplomaYear,
    ].some((year) => year !== undefined && year > new Date().getFullYear())
  )
    throw new BadRequestException("Diploma year cannot be in the future");
  if (
    b.details?.ideDiplomaYear !== undefined &&
    [b.details.iadeDiplomaYear, b.details.ibodeDiplomaYear].some(
      (year) => year !== undefined && year < b.details!.ideDiplomaYear!,
    )
  )
    throw new BadRequestException(
      "Specialist diploma year cannot precede IDE diploma year",
    );
  // Canonicalize every full-profile write, including registration and legacy clients.
  const normalized = normalizeAvailability(b);
  ensureAvailabilityLimit(normalized);
  b.available = normalized.available;
  b.unavailable = normalized.unavailable;
}
