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
    agency_id: uuid,
    establishment_id: uuid,
    title: text,
    description: text,
    qualification: { type: "string", enum: ["IDE", "IADE", "IBODE"] },
    status: missionStatus,
    version: integer,
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
  },
  ["id", "establishment_id"],
);
/** Explicit contracts for command receipts and paginated lists; other responses remain to complete. */
export function configureOpenApi(doc: OpenAPIObject) {
  const schemas: any = {
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
      ["code", "message", "requestId"],
    ),
    MissionCommand: object(
      { id: uuid, version: integer, status: missionStatus },
      ["id", "version", "status"],
    ),
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
    "GET /api/v1/facilities": { type: "array", items: ref("Facility") },
  };
  const commands: Record<string, string> = {
    "POST /api/v1/missions": "MissionCommand",
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
  };
  for (const [path, item] of Object.entries(doc.paths))
    for (const method of ["get", "post", "put", "delete", "patch"]) {
      const op = (item as any)[method];
      if (!op) continue;
      const key = method.toUpperCase() + " " + path;
      for (const code of [400, 401, 403, 404, 409, 429, 500, 503])
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
      if (responses[key])
        op.responses[method === "post" ? "201" : "200"] = {
          description: "Successful operation",
          content: { "application/json": { schema: responses[key] } },
        };
    }
}
