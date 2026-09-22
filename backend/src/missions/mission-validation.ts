import { BadRequestException } from "@nestjs/common";
import { interval } from "../domain/matching";
import {
  validDateBounds,
  withinMissionHorizon,
} from "../domain/schedule-period";
import type { MissionDto } from "./mission.dto";

export function validateMission(b: MissionDto, checkHorizon = true) {
  if ((b.latitude == null) !== (b.longitude == null))
    throw new BadRequestException(
      "Latitude and longitude must be supplied together",
    );
  if (b.timezone !== undefined) {
    try {
      if (
        typeof b.timezone !== "string" ||
        !/^[A-Za-z_]+(?:\/[A-Za-z0-9_+.-]+)*$/.test(b.timezone)
      )
        throw new Error();
      new Intl.DateTimeFormat("en", { timeZone: b.timezone }).format();
    } catch {
      throw new BadRequestException("Invalid mission timezone");
    }
  }
  try {
    interval(b);
  } catch {
    throw new BadRequestException("Invalid mission interval");
  }
  if (
    b.schedulePrecision === "DATE" &&
    !validDateBounds(b.start, b.end, b.timezone)
  )
    throw new BadRequestException(
      "Date-only bounds must be complete local calendar days",
    );
  if (checkHorizon && !withinMissionHorizon(b.start, b.end, b.timezone))
    throw new BadRequestException(
      "Les dates de mission ne peuvent pas dépasser deux ans à partir d’aujourd’hui.",
    );
  if (b.block === "SPECIALIZED" && !b.specialty)
    throw new BadRequestException("Specialty required");
  if (b.block !== "SPECIALIZED" && b.specialty)
    throw new BadRequestException(
      "Specialty only applies to specialized block",
    );
}
