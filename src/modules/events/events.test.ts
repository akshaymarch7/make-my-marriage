import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEventSchema, eventListQuerySchema, updateEventSchema } from "./schemas";
import { eventLocalToUtc, eventDateParts, eventTimeRange } from "./dates";
import { createEvent, getEvent, listEvents, updateEvent, archiveEvent } from "./service";
import { requireWeddingMember } from "@/modules/memberships/service";
import * as repository from "./repository";
vi.mock("@/modules/memberships/service", () => ({ requireWeddingMember: vi.fn() }));
vi.mock("./repository", () => ({ insertEvent: vi.fn(), findEvent: vi.fn(), findEvents: vi.fn(), patchEvent: vi.fn(), archiveEventRecord: vi.fn() }));
const weddingId = "111111111111111111111111", userId = "222222222222222222222222", eventId = "333333333333333333333333";
const input = { name: "Mehendi", type: "MEHENDI" as const, startsAt: "2027-02-12T10:30:00Z", endsAt: "2027-02-12T14:30:00Z" };
const saved = { ...input, id: eventId, venueName: "", address: "", description: "", dressCode: "", archivedAt: null };
beforeEach(() => { vi.resetAllMocks(); vi.mocked(requireWeddingMember).mockResolvedValue({ member: { weddingId, role: "MANAGER" } } as Awaited<ReturnType<typeof requireWeddingMember>>); vi.mocked(repository.findEvent).mockResolvedValue({ event: saved, version: 2 }); });
describe("event validation and time zones", () => {
  it("requires a name and start and rejects ownership/unknown fields", () => {
    for (const value of [{...input,name:" "},{...input,startsAt:"bad"},{...input,weddingId},{...input,coverImageObjectKey:"other"},{...input,archivedAt:input.startsAt}]) expect(createEventSchema.safeParse(value).success).toBe(false);
    expect(createEventSchema.parse({ ...input, name: " Mehendi " }).name).toBe("Mehendi");
    expect(updateEventSchema.safeParse({}).success).toBe(false);
  });
  it("validates end times and query ranges without coercing false to true", () => {
    expect(createEventSchema.safeParse({ ...input, endsAt: input.startsAt }).success).toBe(false);
    expect(createEventSchema.safeParse({ ...input, endsAt: null }).success).toBe(true);
    expect(eventListQuerySchema.parse({includeArchived:"false"}).includeArchived).toBe(false);
    expect(eventListQuerySchema.parse({includeArchived:"true"}).includeArchived).toBe(true);
    expect(eventListQuerySchema.safeParse({from:input.endsAt,to:input.startsAt}).success).toBe(false);
    expect(eventListQuerySchema.safeParse({includeArchived:"yes"}).success).toBe(false);
  });
  it("converts wedding time independently of the browser zone and handles midnight", () => {
    expect(eventLocalToUtc("2027-02-12", "00:00", "Asia/Kolkata")).toBe("2027-02-11T18:30:00.000Z");
    expect(eventLocalToUtc("2027-02-12", "12:15", "Asia/Kathmandu")).toBe("2027-02-12T06:30:00.000Z");
    expect(eventDateParts("2027-02-11T18:30:00Z","Asia/Kolkata")).toEqual({date:"2027-02-12",time:"00:00"});
    expect(eventTimeRange("2027-02-12T18:00:00Z","2027-02-12T20:00:00Z","Asia/Kolkata")).toContain("13 February");
  });
  it("rejects invalid dates, skipped and ambiguous daylight-saving times", () => {
    expect(() => eventLocalToUtc("2027-02-30","12:00","Asia/Kolkata")).toThrow();
    expect(() => eventLocalToUtc("2027-03-14","02:30","America/New_York")).toThrow("does not exist");
    expect(() => eventLocalToUtc("2027-11-07","01:30","America/New_York")).toThrow("occurs twice");
    expect(eventLocalToUtc("2027-03-14","03:30","America/New_York")).toBe("2027-03-14T07:30:00.000Z");
  });
});
describe("wedding-scoped event use cases", () => {
  it.each(["ADMIN", "MANAGER"])("allows %s and derives scope from membership", async role => {
    vi.mocked(requireWeddingMember).mockResolvedValue({member:{weddingId,role}} as Awaited<ReturnType<typeof requireWeddingMember>>);
    await createEvent(userId,input); await listEvents(userId); await getEvent(userId,eventId);
    expect(repository.insertEvent).toHaveBeenCalledWith(weddingId,input);
    expect(repository.findEvents).toHaveBeenCalledWith(weddingId,{includeArchived:false});
    expect(repository.findEvent).toHaveBeenCalledWith(weddingId,eventId);
  });
  it("rejects guests and invalid IDs before resource lookup", async () => {
    await expect(getEvent(userId,"invalid")).rejects.toThrow(); expect(repository.findEvent).not.toHaveBeenCalled();
    vi.mocked(requireWeddingMember).mockRejectedValue(new Error("Wedding not found"));
    await expect(createEvent(userId,input)).rejects.toThrow("Wedding not found"); expect(repository.insertEvent).not.toHaveBeenCalled();
  });
  it("returns NOT_FOUND for missing or another wedding's event", async () => {
    vi.mocked(repository.findEvent).mockResolvedValue(null);
    for (const action of [() => getEvent(userId,eventId), () => updateEvent(userId,eventId,{name:"New"}), () => archiveEvent(userId,eventId)]) await expect(action()).rejects.toMatchObject({code:"NOT_FOUND"});
    expect(repository.patchEvent).not.toHaveBeenCalled(); expect(repository.archiveEventRecord).not.toHaveBeenCalled();
  });
  it("validates merged dates before a partial update and permits clearing optional fields", async () => {
    await expect(updateEvent(userId,eventId,{startsAt:"2027-02-13T10:00:00Z"})).rejects.toThrow();
    expect(repository.patchEvent).not.toHaveBeenCalled();
    vi.mocked(repository.patchEvent).mockResolvedValue({...saved,endsAt:null});
    await updateEvent(userId,eventId,{endsAt:null,venueName:""});
    expect(repository.patchEvent).toHaveBeenCalledWith(weddingId,eventId,2,{endsAt:null,venueName:""});
  });
  it("rejects updates after an archive or concurrent modification", async () => {
    vi.mocked(repository.patchEvent).mockResolvedValue(null);
    await expect(updateEvent(userId,eventId,{name:"Updated"})).rejects.toMatchObject({code:"CONFLICT"});
    vi.mocked(repository.findEvent).mockResolvedValue({event:{...saved,archivedAt:input.startsAt},version:3});
    await expect(updateEvent(userId,eventId,{name:"Updated"})).rejects.toThrow("Archived events cannot be edited");
  });
  it("archives without deleting and accepts an already archived event", async () => {
    await expect(archiveEvent(userId,eventId)).resolves.toEqual({success:true});
    expect(repository.archiveEventRecord).toHaveBeenCalledWith(weddingId,eventId);
    vi.mocked(repository.archiveEventRecord).mockClear();
    vi.mocked(repository.findEvent).mockResolvedValue({event:{...saved,archivedAt:input.startsAt},version:3});
    await archiveEvent(userId,eventId); expect(repository.archiveEventRecord).not.toHaveBeenCalled();
  });
});
