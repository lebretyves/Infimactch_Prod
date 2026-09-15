import { PageDto } from "../common/page.dto";
import { Query } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Req,
  Res,
  Param,
  Module,
  Injectable,
  UseGuards,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
  ParseUUIDPipe,
} from "@nestjs/common";
import {
  IsIn,
  IsString,
  IsBoolean,
  Equals,
  Length,
  Matches,
} from "class-validator";
import { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile, rename } from "node:fs/promises";
import { resolve } from "node:path";
import { Database, audit } from "../database/database";
import { user, SessionGuard, nurse } from "../common/access";
import { required, projectRoot } from "../config";
import { encrypt, decrypt, fileMime } from "./crypto";
class UploadDto {
  @ApiProperty({
    type: () => String,
    required: true,
    enum: ["application/pdf", "image/png", "image/jpeg"],
  })
  @IsIn(["application/pdf", "image/png", "image/jpeg"])
  mime!: string;
  @ApiProperty({ type: () => String, required: true })
  @IsString()
  @Length(4, 7000000)
  contentBase64!: string;
  @ApiProperty({ type: () => Boolean, required: true })
  @Equals(true)
  fictional!: boolean;
}
class BankDto {
  @ApiProperty({ type: () => String, required: true })
  @Matches(/^FR\d{12}DEMO\d{8}$/)
  iban!: string;
  @ApiProperty({ type: () => Boolean, required: true })
  @Equals(true)
  fictional!: boolean;
}
@Injectable()
export class DocumentsService {
  private readonly directory = resolve(projectRoot, "data/documents");
  constructor(private readonly db: Database) {}
  private readonly keyVersion = Number(process.env.DOCUMENT_KEY_VERSION ?? 1);
  private key(version = this.keyVersion) {
    if (!Number.isInteger(version) || version < 1)
      throw new ServiceUnavailableException("Invalid document key version");
    const key = Buffer.from(
      required(
        version === this.keyVersion
          ? "DOCUMENT_KEY"
          : "DOCUMENT_KEY_V" + version,
      ),
      "base64",
    );
    if (key.length !== 32)
      throw new ServiceUnavailableException("Invalid document key");
    return key;
  }
  async store(
    actor: string,
    kind: string,
    mime: string,
    data: Buffer,
    assignmentId: string | null = null,
  ) {
    const id = randomUUID(),
      encrypted = encrypt(data, this.key(), id);
    await mkdir(this.directory, { recursive: true });
    await this.db.query(
      "INSERT INTO document(id,owner_id,assignment_id,kind,mime,status,size_bytes,key_version) VALUES($1,$2,$3,$4,$5,'STAGING',$6,$7)",
      [id, actor, assignmentId, kind, mime, data.length, this.keyVersion],
    );
    await writeFile(resolve(this.directory, id + ".tmp"), encrypted, {
      flag: "wx",
      mode: 0o600,
    });
    await rename(
      resolve(this.directory, id + ".tmp"),
      resolve(this.directory, id + ".bin"),
    );
    await this.db.transaction(async (em) => {
      await em.query("UPDATE document SET status='READY' WHERE id=$1", [id]);
      await audit(em, actor, "DOCUMENT_STORED", id, { kind });
    });
    return { id, status: "READY" };
  }
  async reconcile(minimumAgeMinutes = 5) {
    if (
      !Number.isInteger(minimumAgeMinutes) ||
      minimumAgeMinutes < 0 ||
      minimumAgeMinutes > 1440
    )
      throw new BadRequestException("Invalid reconciliation age");
    let cursor = "00000000-0000-0000-0000-000000000000",
      recovered = 0,
      pending = 0;
    while (true) {
      const batch = await this.db.query(
        "SELECT id FROM document WHERE status='STAGING' AND created_at<=now()-make_interval(mins=>$1) AND id>$2::uuid ORDER BY id LIMIT 100",
        [minimumAgeMinutes, cursor],
      );
      if (!batch.length) break;
      for (const item of batch) {
        const ready = await this.db.transaction(async (em) => {
          const [d] = await em.query(
            "SELECT * FROM document WHERE id=$1 AND status='STAGING' FOR UPDATE",
            [item.id],
          );
          if (!d) return false;
          try {
            let encrypted: Buffer;
            let temporary = false;
            try {
              encrypted = await readFile(
                resolve(this.directory, d.id + ".bin"),
              );
            } catch (e: any) {
              if (e.code !== "ENOENT") throw e;
              encrypted = await readFile(
                resolve(this.directory, d.id + ".tmp"),
              );
              temporary = true;
            }
            const clear = decrypt(encrypted, this.key(d.key_version), d.id);
            if (clear.length !== d.size_bytes) throw new Error("SIZE_MISMATCH");
            if (temporary)
              await rename(
                resolve(this.directory, d.id + ".tmp"),
                resolve(this.directory, d.id + ".bin"),
              );
            await em.query("UPDATE document SET status='READY' WHERE id=$1", [
              d.id,
            ]);
            await audit(em, null, "DOCUMENT_RECOVERED", d.id);
            return true;
          } catch {
            return false;
          }
        });
        if (ready) recovered++;
        else pending++;
      }
      cursor = batch[batch.length - 1].id;
    }
    return { recovered, pending };
  }
  async read(actor: string, id: string) {
    const doc = await this.db.transaction(async (em) => {
      const [d] = await em.query(
        "SELECT * FROM document WHERE id=$1 AND status='READY'",
        [id],
      );
      if (!d) throw new NotFoundException();
      if (d.kind === "CONFIRMATION") {
        const [confirmation] = await em.query(
          "SELECT status FROM mission_confirmation WHERE document_id=$1 AND status IN('READY','CANCELLED','SUPERSEDED')",
          [id],
        );
        if (!confirmation) throw new NotFoundException();
        d.confirmationStatus = confirmation.status;
      }
      if (d.owner_id !== actor) {
        if (d.kind !== "CONFIRMATION" || !d.assignment_id)
          throw new NotFoundException();
        const allowed = await em.query(
          "SELECT a.id FROM assignment a JOIN mission m ON m.id=a.mission_id WHERE a.id=$1 AND (a.nurse_id=$2 OR EXISTS(SELECT 1 FROM membership o WHERE o.user_id=$2 AND o.active AND o.organization_id IN(m.agency_id,m.establishment_id)))",
          [d.assignment_id, actor],
        );
        if (!allowed.length) throw new NotFoundException();
      }
      await audit(em, actor, "DOCUMENT_READ", id);
      return d;
    });
    try {
      return {
        mime: doc.mime,
        confirmationStatus: doc.confirmationStatus,
        data: decrypt(
          await readFile(resolve(this.directory, id + ".bin")),
          this.key(doc.key_version),
          id,
        ),
      };
    } catch {
      throw new ServiceUnavailableException(
        "Document unavailable or authentication failed",
      );
    }
  }
}
@Controller("me")
@UseGuards(SessionGuard)
class DocumentsController {
  constructor(
    private readonly db: Database,
    private readonly documents: DocumentsService,
  ) {}
  @Post("documents") async upload(@Req() r: Request, @Body() b: UploadDto) {
    const data = Buffer.from(b.contentBase64, "base64");
    if (
      !data.length ||
      data.length > 5 * 1024 * 1024 ||
      fileMime(data) !== b.mime
    )
      throw new BadRequestException(
        "Allowed: fictional PDF/JPEG/PNG, maximum 5 MiB, matching signature",
      );
    await this.db.transaction(async (em) => nurse(em, user(r)));
    return this.documents.store(user(r), "EVIDENCE", b.mime, data);
  }
  @Get("documents") list(@Req() r: Request, @Query() page: PageDto) {
    return this.db.query(
      "SELECT id,kind,mime,size_bytes,status,created_at FROM document WHERE owner_id=$1 AND kind!='BANK' AND (kind!='CONFIRMATION' OR EXISTS(SELECT 1 FROM mission_confirmation c WHERE c.document_id=document.id AND c.status IN('READY','CANCELLED','SUPERSEDED'))) ORDER BY created_at DESC,id LIMIT $2 OFFSET $3",
      [user(r), page.limit, page.offset],
    );
  }
  @Get("documents/:id") async download(
    @Req() r: Request,
    @Param("id", ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const [meta] = await this.db.query(
      "SELECT kind FROM document WHERE id=$1",
      [id],
    );
    if (!meta || meta.kind === "BANK") throw new NotFoundException();
    const d = await this.documents.read(user(r), id);
    res
      .set({
        "Content-Type": d.mime,
        "Content-Disposition": 'attachment; filename="infimatch-' + id + '"',
        "Cache-Control": "no-store",
        "X-InfiMatch-Document-State": d.confirmationStatus ?? "READY",
      })
      .send(d.data);
  }
  @Put("bank-details") async bank(@Req() r: Request, @Body() b: BankDto) {
    await this.db.transaction(async (em) => nurse(em, user(r)));
    return this.documents.store(
      user(r),
      "BANK",
      "application/json",
      Buffer.from(JSON.stringify({ iban: b.iban, fictional: true })),
    );
  }
  @Get("bank-details") async getBank(@Req() r: Request) {
    const [d] = await this.db.query(
      "SELECT id FROM document WHERE owner_id=$1 AND kind='BANK' AND status='READY' ORDER BY created_at DESC,id LIMIT 1",
      [user(r)],
    );
    if (!d) return { iban: null };
    const data = await this.documents.read(user(r), d.id);
    const b = JSON.parse(data.data.toString());
    return {
      iban: "FR** **** **** **** **** **" + b.iban.slice(-4),
      fictional: true,
    };
  }
}
@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
