import { PageDto } from "../common/page.dto";
import { Query } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Headers,
  Req,
  Res,
  Param,
  Module,
  Injectable,
  UseGuards,
  NotFoundException,
  BadRequestException,
  PayloadTooLargeException,
  ServiceUnavailableException,
  ParseUUIDPipe,
} from "@nestjs/common";
import {
  IsIn,
  IsString,
  IsBoolean,
  Equals,
  Length,
  IsIBAN,
  IsBIC,
  IsOptional,
  ValidateIf,
  MaxLength,
} from "class-validator";
import { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import {
  mkdir,
  writeFile,
  readFile,
  rename,
  readdir,
  rm,
  stat,
} from "node:fs/promises";
import { resolve } from "node:path";
import { Database, audit } from "../database/database";
import { user, SessionGuard, nurse } from "../common/access";
import { documentQuotaBytes, required, projectRoot } from "../config";
import { commandReceipt } from "../common/idempotency";
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
  @ApiProperty() @IsIBAN() iban!: string;
  @ApiProperty({ required: false, description: 'Facultatif si absent du RIB ; vérifié lorsqu’il est renseigné.' })
  @Transform(({value}) => typeof value === 'string' ? value.trim().toUpperCase() : value)
  @ValidateIf((_object, value) => value !== undefined && value !== '') @IsBIC() bic?: string;
  @ApiProperty() @IsString() @Length(2, 150) holder!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(150) bankName?: string;
  @ApiProperty() @Equals(true) reviewed!: boolean;
  @IsOptional() @IsBoolean() fictional?: boolean;
}
class BankFileDto extends BankDto {
  @ApiProperty({ enum: ['application/pdf', 'image/png', 'image/jpeg'] })
  @IsIn(['application/pdf', 'image/png', 'image/jpeg']) mime!: string;
  @ApiProperty() @IsString() @Length(4, 4200000) contentBase64!: string;
}
function bankFields(b: BankDto) {
  if (b.holder.trim().length < 2) throw new BadRequestException('Titulaire requis.');
  return { iban: b.iban.replace(/\s/g, '').toUpperCase(), bic: b.bic?.trim().toUpperCase() || '', holder: b.holder.trim(), bankName: b.bankName?.trim() || '' };
}

type StoredDocument = { id: string; status: "READY" };
@Injectable()
export class DocumentsService {
  private readonly directory = resolve(process.env.DOCUMENT_DIRECTORY || resolve(projectRoot, "data/documents"));
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
    command?: { operation: string; key: string | undefined; content: unknown },
    replacePrevious = false,
  ): Promise<StoredDocument> {
    const postgresStorage = process.env.DOCUMENT_STORAGE === "postgres";
    if (!postgresStorage) await mkdir(this.directory, { recursive: true });
    return this.db.transaction(async (em) => {
      const receipt = command
        ? await commandReceipt(
            em,
            actor,
            command.operation,
            command.key,
            command.content,
          )
        : null;
      if (receipt?.replay) {
        const response = receipt.response;
        if (typeof response?.id !== "string" || response.status !== "READY")
          throw new ServiceUnavailableException(
            "Invalid document command receipt",
          );
        return response as StoredDocument;
      }
      await em.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
        "document-storage:" + actor,
      ]);
      // System confirmations must remain available even when user uploads fill their quota.
      // Replaced bank details remain retained but only the active version consumes user quota.
      if (!["CONFIRMATION","CANCELLATION"].includes(kind)) {
        const [storage] = await em.query(
          "SELECT COALESCE(sum(size_bytes),0)::text AS bytes FROM document WHERE owner_id=$1 AND kind IN('EVIDENCE','BANK') AND superseded_at IS NULL AND status IN('STAGING','READY') AND NOT ($2::boolean AND kind=$3)",
          [actor, replacePrevious, kind],
        );
        if (Number(storage.bytes) + data.length > documentQuotaBytes())
          throw new PayloadTooLargeException("Document storage quota exceeded");
      }
      const id = randomUUID();
      // Held until SQL commit/rollback; the cleaner takes the same lock before inspecting files.
      await em.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", ["document-file:" + id]);
      const temporary = resolve(this.directory, id + ".tmp");
      const final = resolve(this.directory, id + ".bin");
      await em.query(
        "INSERT INTO document(id,owner_id,assignment_id,kind,mime,status,size_bytes,key_version,storage_backend) VALUES($1,$2,$3,$4,$5,'STAGING',$6,$7,$8)",
        [id, actor, assignmentId, kind, mime, data.length, this.keyVersion, postgresStorage ? "postgres" : "filesystem"],
      );
      try {
        const encrypted = encrypt(data, this.key(), id);
        if (postgresStorage) {
          await em.query("INSERT INTO document_blob(document_id,encrypted) VALUES($1,$2)", [id, encrypted]);
        } else {
          await writeFile(temporary, encrypted, { flag: "wx", mode: 0o600 });
          await rename(temporary, final);
        }
        await em.query("UPDATE document SET status='READY' WHERE id=$1", [id]);
        if (replacePrevious)
          await em.query(
            "UPDATE document SET superseded_at=now() WHERE owner_id=$1 AND kind=$2 AND id<>$3 AND superseded_at IS NULL",
            [actor, kind, id],
          );
        await audit(em, actor, "DOCUMENT_STORED", id, {
          kind,
          replacedPrevious: replacePrevious,
        });
        const response: StoredDocument = { id, status: "READY" };
        return receipt ? receipt.save(response) : response;
      } catch (error) {
        if (!postgresStorage) await Promise.all([
          rm(temporary, { force: true }),
          rm(final, { force: true }),
        ]);
        throw error;
      }
    });
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
          await em.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", ["document-file:" + item.id]);
          const [d] = await em.query(
            "SELECT * FROM document WHERE id=$1 AND status='STAGING' FOR UPDATE",
            [item.id],
          );
          if (!d) return false;
          try {
            let encrypted: Buffer;
            let temporary = false;
            if (d.storage_backend === "postgres") {
              const [blob] = await em.query("SELECT encrypted FROM document_blob WHERE document_id=$1", [d.id]);
              if (!blob) throw new Error("BLOB_MISSING");
              encrypted = blob.encrypted;
            } else try {
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
    let orphansRemoved = 0;
    const cutoff = Date.now() - minimumAgeMinutes * 60_000;
    const files = process.env.DOCUMENT_STORAGE === "postgres" ? [] : await readdir(this.directory).catch((error: any) => {
      if (error.code === "ENOENT") return [];
      throw error;
    });
    for (const name of files) {
      const matched = name.match(
        /^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.(tmp|bin)$/i,
      );
      if (!matched) continue;
      const removed = await this.db.transaction(async (em) => {
        const [lock] = await em.query(
          "SELECT pg_try_advisory_xact_lock(hashtextextended($1,0)) AS acquired",
          ["document-file:" + matched[1]],
        );
        if (!lock.acquired) return false;
        const path = resolve(this.directory, name);
        try {
          if ((await stat(path)).mtimeMs > cutoff) return false;
          // READ COMMITTED sees the writer's commit after acquiring its lock.
          const [document] = await em.query("SELECT status FROM document WHERE id=$1", [matched[1]]);
          if (!document) { await rm(path, { force: true }); return true; }
          if (matched[2] === "tmp" && document.status === "READY") {
            await stat(resolve(this.directory, matched[1] + ".bin"));
            await rm(path, { force: true });
            return true;
          }
        } catch (error: any) { if (error.code !== "ENOENT") throw error; }
        return false;
      });
      if (removed) orphansRemoved++;
    }
    return { recovered, pending, orphansRemoved };
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
      if (d.kind === "CANCELLATION") {
        const [c]=await em.query("SELECT 1 FROM mission_cancellation WHERE document_id=$1 AND status='READY'",[id]);
        if(!c)throw new NotFoundException();
        d.confirmationStatus='CANCELLED';
      }
      if (d.owner_id !== actor) {
        if (!["CONFIRMATION","CANCELLATION"].includes(d.kind) || !d.assignment_id)
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
          doc.storage_backend === "postgres"
            ? (await this.db.query("SELECT encrypted FROM document_blob WHERE document_id=$1", [id]))[0]?.encrypted
            : await readFile(resolve(this.directory, id + ".bin")),
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
  @Post("documents") async upload(
    @Req() r: Request,
    @Headers("idempotency-key") key: string | undefined,
    @Body() b: UploadDto,
  ) {
    const data = Buffer.from(b.contentBase64, "base64");
    const uploadLimitMiB = process.env.VERCEL ? 3 : 5;
    if (
      !data.length ||
      data.length > uploadLimitMiB * 1024 * 1024 ||
      fileMime(data) !== b.mime
    )
      throw new BadRequestException(
        `Allowed: fictional PDF/JPEG/PNG, maximum ${uploadLimitMiB} MiB, matching signature`,
      );
    await this.db.transaction(async (em) => nurse(em, user(r)));
    return this.documents.store(user(r), "EVIDENCE", b.mime, data, null, {
      operation: "document.upload",
      key,
      content: b,
    });
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
  @Put("bank-details") async bank(
    @Req() r: Request,
    @Headers("idempotency-key") key: string | undefined,
    @Body() b: BankDto,
  ) {
    await this.db.transaction(async (em) => nurse(em, user(r)));
    return this.documents.store(
      user(r),
      "BANK",
      "application/json",
      Buffer.from(JSON.stringify({ version: 2, details: bankFields(b) })),
      null,
      { operation: "bank-details.replace", key, content: b },
      true,
    );
  }
  @Put("bank-document") async bankDocument(
    @Req() r:Request,@Headers("idempotency-key") key:string|undefined,@Body() b:BankFileDto,
  ) {
    const data=Buffer.from(b.contentBase64,'base64');
    if(!data.length || data.length>3*1024*1024 || fileMime(data)!==b.mime)
      throw new BadRequestException('PDF, JPEG ou PNG requis, 3 Mo maximum, avec un contenu conforme au format.');
    await this.db.transaction(em=>nurse(em,user(r)));
    return this.documents.store(user(r),'BANK','application/json',Buffer.from(JSON.stringify({version:2,details:bankFields(b),file:{mime:b.mime,contentBase64:data.toString('base64')}})),null,{operation:'bank-document.replace',key,content:b},true);
  }
  @Get("bank-document") async downloadBank(@Req() r:Request,@Res() res:Response){
    const [doc]=await this.db.query("SELECT id FROM document WHERE owner_id=$1 AND kind='BANK' AND status='READY' AND superseded_at IS NULL ORDER BY created_at DESC,id LIMIT 1",[user(r)]);
    if(!doc)throw new NotFoundException();
    let data=await this.documents.read(user(r),doc.id);
    if(data.mime==='application/json'){
      const envelope=JSON.parse(data.data.toString());
      if(envelope.version!==2 || !envelope.file)throw new NotFoundException();
      data={...data,mime:envelope.file.mime,data:Buffer.from(envelope.file.contentBase64,'base64')};
    }
    const ext=data.mime==='application/pdf'?'pdf':data.mime==='image/png'?'png':'jpg';
    res.set({'Content-Type':data.mime,'Content-Disposition':'attachment; filename="infimatch-rib.'+ext+'"','Cache-Control':'no-store'}).send(data.data);
  }
  @Get("bank-details") async getBank(@Req() r: Request) {
    const [d] = await this.db.query(
      "SELECT id,mime,size_bytes,created_at FROM document WHERE owner_id=$1 AND kind='BANK' AND status='READY' AND superseded_at IS NULL ORDER BY created_at DESC,id LIMIT 1",
      [user(r)],
    );
    const [assignment]=await this.db.query("SELECT 1 FROM assignment WHERE nurse_id=$1 AND status IN('ACTIVE','COMPLETED') LIMIT 1",[user(r)]);
    if(!d)return {iban:null,details:null,document:null,required:!!assignment};
    if(d.mime!=='application/json')return {iban:null,details:null,document:d,required:false};
    const data=await this.documents.read(user(r),d.id),b=JSON.parse(data.data.toString());
    if(b.version===2){
      const document=b.file?{...d,mime:b.file.mime,size_bytes:Buffer.byteLength(b.file.contentBase64,'base64')}:null;
      return {iban:b.details.iban.slice(0,2)+'** **** '+b.details.iban.slice(-4),details:b.details,document,required:false};
    }
    return {iban:'FR** **** **** **** **** **'+b.iban.slice(-4),details:null,document:null,required:false};
  }

}
@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
