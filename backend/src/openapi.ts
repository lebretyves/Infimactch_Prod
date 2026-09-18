import { additionalSchemas, additionalResponses } from "./openapi-contracts";
import { OpenAPIObject } from "@nestjs/swagger";
const uuid = { type: "string", format: "uuid" };
const integer = { type: "integer" };
const text = { type: "string" };
const nullableText = { type: "string", nullable: true };
const date = { type: "string", format: "date-time" };
const nullableDate = { ...date, nullable: true };
const object = (properties: Record<string, any>, required: string[] = []) => ({
  type: "object",
  properties,
  required,
});
const missionStatus = {
  type: "string",
  enum: ["DRAFT", "OPEN", "FILLED", "COMPLETED", "CANCELLED"],
};
const mission = object(
  {
    id: uuid,
    agency_id: { ...uuid, nullable: true },
    staffing_request_id: { ...uuid, nullable: true },
    establishment_id: uuid,
    title: text,
    description: text,
    qualification: { type: "string", enum: ["IDE", "IADE", "IBODE"] },
    status: missionStatus,
    version: integer,
    timezone: { type: "string", description: "IANA mission time zone; defaults to Europe/Paris" },
    start_at: date,
    end_at: date,
    latitude: { type: "number", nullable: true },
    longitude: { type: "number", nullable: true },
    hourly_salary: {
      type: "string",
      description: "PostgreSQL decimal, gross EUR per hour",
    },
  },
  ["id", "status", "version"],
);
const application = object(
  {
    id: uuid,
    mission_id: uuid,
    nurse_id: uuid,
    consent_version: integer,
    status: {
      type: "string",
      enum: ["SUBMITTED", "SELECTED", "REJECTED", "WITHDRAWN", "ACCEPTED"],
    },
    updated_at: date,
    title: text,
    current_version: integer,
    requires_reconsent: { type: "boolean" },
  },
  ["id", "status"],
);
const assignment = object(
  {
    id: uuid,
    mission_id: uuid,
    nurse_id: uuid,
    application_id: uuid,
    status: { type: "string", enum: ["ACTIVE", "COMPLETED", "CANCELLED"] },
    timezone: { type: "string", description: "IANA mission time zone; defaults to Europe/Paris" },
    start_at: date,
    end_at: date,
    created_at: date,
  },
  ["id", "status"],
);
const notification = object(
  {
    id: uuid,
    user_id: uuid,
    event_id: { ...uuid, nullable: true },
    kind: text,
    message: text,
    read_at: nullableDate,
    created_at: date,
  },
  ["id", "message"],
);
const need = object(
  {
    id: uuid,
    establishment_id: uuid,
    title: text,
    description: text,
    created_by: uuid,
    created_at: date,
    updated_at: nullableDate,
    establishment_name: text,
    establishment_address: text,
    details: {
      nullable: true,
      allOf: [{ $ref: "#/components/schemas/NeedDetailsDto" }],
    },
  },
  ["id", "establishment_id"],
);
/** Explicit contracts for command receipts and paginated lists; other responses remain to complete. */
export function configureOpenApi(doc: OpenAPIObject) {
  const schemas: any = {
    ...additionalSchemas,
    ParsedOffer: object({schemaVersion:{type:"integer",enum:[1]},parserVersion:text,inputHash:text,parsedAt:date,
      fields:{type:"array",items:object({key:text,label:text,value:{},display:text,state:{type:"string",enum:["REPORTED","MENTION","DESIRED","REQUIRED","NEGATED","REVIEW_REQUIRED"]},evidence:object({origin:{type:"string",enum:["TITLE","DESCRIPTION"]},text,start:integer,end:integer},["origin","text","start","end"])},["key","label","value","display","state","evidence"])},
      warnings:{type:"array",items:text},reviewQueue:{type:"array",items:text}},["schemaVersion","parserVersion","inputHash","parsedAt","fields","warnings","reviewQueue"]),
    Listing: object({id:text,kind:text,title:text,description:text,freshness:{$ref:"#/components/schemas/OfferFreshness"},parsedOffer:{nullable:true,allOf:[{$ref:"#/components/schemas/ParsedOffer"}]}}),
    Mission: mission,
    Application: application,
    Assignment: assignment,
    Notification: notification,
    StaffingRequest: need,
    Error: object(
      {
        code: text,
        message: { oneOf: [text, { type: "array", items: text }] },
        fields: { type: "array", items: text, nullable: true },
        requestId: uuid,
      },
      ["code", "message"],
    ),
    MissionCommand: object(
      { id: uuid, version: integer, status: missionStatus },
      ["id", "version", "status"],
    ),
    DocumentCommand: object({ id: uuid, status: { type: "string", enum: ["READY"] } }, ["id", "status"]),
    DocumentMetadata: object(
      {
        id: uuid,
        kind: { type: "string", enum: ["EVIDENCE", "CONFIRMATION"] },
        mime: text,
        size_bytes: integer,
        status: { type: "string", enum: ["STAGING", "READY"] },
        created_at: date,
      },
      ["id", "kind", "status"],
    ),
    Favorite: object(
      {
        kind: {
          type: "string",
          enum: ["MISSION", "EXTERNAL", "ESTABLISHMENT"],
        },
        target_id: uuid,
        title: nullableText,
        status: { ...missionStatus, nullable: true },
        expires_at: nullableDate,
        active: { type: "boolean", nullable: true },
      },
      ["kind", "target_id"],
    ),
    Facility: object(
      { id: uuid, name: text, address: text, finess: nullableText },
      ["id", "name"],
    ),
    History: {
      ...assignment,
      properties: {
        ...assignment.properties,
        title: text,
        timezone: text,
        address: text,
        establishment_name: text,
        temporal_position: {
          type: "string",
          enum: ["upcoming", "in_progress", "past"],
        },
      },
    },
  };
  doc.components ??= {};
  doc.components.schemas = { ...doc.components.schemas, ...schemas };
  const ref = (name: string) => ({ $ref: "#/components/schemas/" + name });
  const responses: Record<string, any> = {
    ...additionalResponses,
    "POST /api/v1/auth/activity": object({idleTimeoutMs:integer,idleExpiresAt:{type:"integer",description:"Server expiry timestamp in milliseconds; 15 minutes idle, capped at 8 hours after authentication"}},["idleTimeoutMs","idleExpiresAt"]),
    "GET /api/v1/listings/{id}": ref("Listing"),
    "GET /api/v1/listings/external": object({items:{type:"array",items:ref("Listing")},total:integer,limit:integer,offset:integer}),
    "POST /api/v1/listings/search": object({items:{type:"array",items:ref("Listing")},total:integer,limit:integer,offset:integer}),
    "GET /api/v1/me/notification-preferences": object({enabled:{type:"boolean"}},["enabled"]),
    "PUT /api/v1/me/notification-preferences": object({enabled:{type:"boolean"}},["enabled"]),
    "GET /api/v1/missions": { type: "array", items: ref("Mission") },
    "GET /api/v1/me/applications": { type: "array", items: ref("Application") },
    "GET /api/v1/missions/{id}/applications": {
      type: "array",
      items: ref("Application"),
    },
    "GET /api/v1/me/notifications": {
      type: "array",
      items: ref("Notification"),
    },
    "GET /api/v1/me/documents": {
      type: "array",
      items: ref("DocumentMetadata"),
    },
    "GET /api/v1/me/favorites": { type: "array", items: ref("Favorite") },
    "GET /api/v1/me/history": { type: "array", items: ref("History") },
    "GET /api/v1/staffing-requests": {
      type: "array",
      items: ref("StaffingRequest"),
    },
    "GET /api/v1/staffing-requests/{id}": ref("StaffingRequest"),
    "GET /api/v1/facilities": { type: "array", items: ref("Facility") },
  };
  const commands: Record<string, string> = {
    "POST /api/v1/missions": "MissionCommand",
    "POST /api/v1/missions/open": "MissionCommand",
    "PUT /api/v1/missions/{id}": "MissionCommand",
    "POST /api/v1/missions/{id}/publish": "MissionCommand",
    "POST /api/v1/missions/{id}/cancel": "MissionCommand",
    "POST /api/v1/missions/{id}/reopen": "MissionCommand",
    "POST /api/v1/missions/{id}/complete": "MissionCommand",
    "POST /api/v1/missions/{id}/applications": "Application",
    "POST /api/v1/missions/{id}/assignments": "Assignment",
    "POST /api/v1/applications/{id}/withdrawal": "Application",
    "POST /api/v1/applications/{id}/selection": "Application",
    "POST /api/v1/applications/{id}/rejection": "Application",
    "POST /api/v1/staffing-requests": "StaffingRequest",
    "PUT /api/v1/staffing-requests/{id}": "StaffingRequest",
    "POST /api/v1/me/documents": "DocumentCommand",
    "PUT /api/v1/me/bank-details": "DocumentCommand",
  };
  for (const [path, item] of Object.entries(doc.paths))
    for (const method of ["get", "post", "put", "delete", "patch"]) {
      const op = (item as any)[method];
      if (!op) continue;
      const key = method.toUpperCase() + " " + path;
      for (const code of [400, 401, 403, 404, 409, 413, 429, 500, 503])
        op.responses[code] ??= {
          description: "Controlled API error; applicability depends on route",
          content: { "application/json": { schema: ref("Error") } },
        };
      if (commands[key]) {
        op.parameters ??= [];
        op.parameters.push({
          name: "Idempotency-Key",
          in: "header",
          required: true,
          schema: { type: "string", minLength: 1, maxLength: 100 },
          description:
            "Stable key per command; reuse for retry with identical content. Reuse with changed content returns 409. Current permissions are checked on replay.",
        });
        responses[key] = ref(commands[key]);
      }
      if (key === "GET /api/v1/me/documents/{id}") {
        op.responses[200] = {description:"Authorized decrypted document download",headers:{"Content-Disposition":{schema:{type:"string"}},"Cache-Control":{schema:{type:"string"}}},content:Object.fromEntries(["application/pdf","image/png","image/jpeg","application/octet-stream"].map(mime=>[mime,{schema:{type:"string",format:"binary"}}]))};
      }
      if (!["get"].includes(method)) {
        op.parameters ??= [];
        if (!path.startsWith("/api/v1/internal/")) op.parameters.push({name:"X-CSRF-Token",in:"header",required:true,schema:{type:"string"},description:"Token from /auth/csrf; cookie credentials and the configured Origin are required"});
        else op.parameters.push({name:"X-InfiMatch-Token",in:"header",required:true,schema:{type:"string"},description:"Internal service credential; never expose in browser code"});
      }
      if (responses[key])
        op.responses[method === "post" ? "201" : "200"] = {
          description: "Successful operation",
          content: { "application/json": { schema: responses[key] } },
        };
    }
}
