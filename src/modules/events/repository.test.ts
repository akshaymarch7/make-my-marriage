import { beforeEach, expect, it, vi } from "vitest";
import { Event } from "./event.model";
import { findInvitedEvents, findEvents, findEvent, patchEvent, archiveEventRecord } from "./repository";
vi.mock("@/server/db/mongoose", () => ({ connectToDatabase: vi.fn() }));
vi.mock("./event.model", () => ({ Event: { find: vi.fn(), findOne: vi.fn(), findOneAndUpdate: vi.fn() } }));
const weddingId="111111111111111111111111", eventId="222222222222222222222222";
const lean=vi.fn(), sort=vi.fn();
beforeEach(() => { vi.resetAllMocks(); lean.mockResolvedValue(null); sort.mockReturnValue({lean}); vi.mocked(Event.find).mockReturnValue({sort} as never); vi.mocked(Event.findOne).mockReturnValue({lean} as never); vi.mocked(Event.findOneAndUpdate).mockReturnValue({lean} as never); });
it("always scopes individual reads, updates and archives to the wedding", async () => {
  await findEvent(weddingId,eventId); expect(Event.findOne).toHaveBeenCalledWith({weddingId,_id:eventId});
  await patchEvent(weddingId,eventId,3,{name:"Updated"}); expect(Event.findOneAndUpdate).toHaveBeenCalledWith({weddingId,_id:eventId,archivedAt:null,__v:3},{$set:{name:"Updated"},$inc:{__v:1}},expect.anything());
  await archiveEventRecord(weddingId,eventId); expect(Event.findOneAndUpdate).toHaveBeenLastCalledWith({weddingId,_id:eventId,archivedAt:null},{$set:{archivedAt:expect.any(Date)},$inc:{__v:1}},expect.anything());
});
it("excludes archived rows by default and orders events chronologically", async () => {
  lean.mockResolvedValue([]);
  await findEvents(weddingId,{includeArchived:false,from:"2027-02-01T00:00:00Z"});
  expect(Event.find).toHaveBeenCalledWith({weddingId,archivedAt:null,startsAt:{$gte:new Date("2027-02-01T00:00:00Z")}});
  expect(sort).toHaveBeenCalledWith({startsAt:1,_id:1});
  await findEvents(weddingId,{includeArchived:true}); expect(Event.find).toHaveBeenLastCalledWith({weddingId});
});
it("rejects invalid ObjectIds before issuing queries", async () => {
  await expect(findEvent(weddingId,"bad")).rejects.toThrow();
  await expect(findEvents("bad",{includeArchived:false})).rejects.toThrow();
  expect(Event.find).not.toHaveBeenCalled(); expect(Event.findOne).not.toHaveBeenCalled();
});

it("loads only selected active events within the invitation wedding",async()=>{lean.mockResolvedValue([]);await findInvitedEvents(weddingId,[eventId]);expect(Event.find).toHaveBeenCalledWith({weddingId,_id:{$in:[eventId]},archivedAt:null});vi.mocked(Event.find).mockClear();await findInvitedEvents(weddingId,[]);expect(Event.find).not.toHaveBeenCalled();});
