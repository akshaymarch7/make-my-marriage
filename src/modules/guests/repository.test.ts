import { beforeEach, expect, it, vi } from "vitest";
import { Types } from "mongoose";
import { Guest } from "./guest.model";
import { findGuest,findGuests,insertGuest,patchGuest,deleteGuestRecord,guestSummary } from "./repository";
import { guestQuerySchema } from "./schemas";
vi.mock("@/server/db/mongoose",()=>({connectToDatabase:vi.fn()}));
vi.mock("./guest.model",()=>({Guest:{find:vi.fn(),findOne:vi.fn(),findOneAndUpdate:vi.fn(),deleteOne:vi.fn(),countDocuments:vi.fn(),aggregate:vi.fn(),create:vi.fn()}}));
const wid="111111111111111111111111",gid="222222222222222222222222",eid="333333333333333333333333";
const lean=vi.fn(),sort=vi.fn(),skip=vi.fn(),limit=vi.fn(),select=vi.fn();
beforeEach(()=>{vi.resetAllMocks();lean.mockResolvedValue([]);const chain={lean,sort,skip,limit,select};for(const fn of [sort,skip,limit,select])fn.mockReturnValue(chain);vi.mocked(Guest.find).mockReturnValue(chain as never);vi.mocked(Guest.findOne).mockReturnValue(chain as never);vi.mocked(Guest.findOneAndUpdate).mockReturnValue(chain as never);vi.mocked(Guest.deleteOne).mockResolvedValue({deletedCount:1} as never);vi.mocked(Guest.countDocuments).mockResolvedValue(0);vi.mocked(Guest.aggregate).mockResolvedValue([]);});
it("scopes item reads, deletion and capacity-guarded version updates",async()=>{
 lean.mockResolvedValue(null);await findGuest(wid,gid);expect(Guest.findOne).toHaveBeenCalledWith({weddingId:wid,_id:gid});
 await patchGuest(wid,gid,4,{maxGuests:2,email:"UPPER@example.com"});expect(Guest.findOneAndUpdate).toHaveBeenCalledWith({weddingId:wid,_id:gid,__v:4,$or:[{attendingCount:null},{attendingCount:{$lte:2}}]},{$set:{maxGuests:2,email:"UPPER@example.com",emailNormalized:"upper@example.com"},$inc:{__v:1}},expect.anything());expect(select).toHaveBeenCalledWith(expect.not.stringContaining("invitationToken"));
 await deleteGuestRecord(wid,gid);expect(Guest.deleteOne).toHaveBeenCalledWith({weddingId:wid,_id:gid});
});
it("escapes literal search text and applies identical filters to rows and counts",async()=>{
 await findGuests(wid,guestQuerySchema.parse({search:"a+b.*",rsvpStatus:"PENDING",eventId:eid,invitationSent:"false",page:"2",limit:"10"}));const filter={weddingId:wid,rsvpStatus:"PENDING",invitedEventIds:eid,invitationSentAt:null,$or:["name","email","phone"].map(field=>({[field]:{$regex:"a\\+b\\.\\*",$options:"i"}}))};expect(Guest.find).toHaveBeenCalledWith(filter);expect(Guest.countDocuments).toHaveBeenCalledWith(filter);expect(skip).toHaveBeenCalledWith(10);expect(sort).toHaveBeenCalledWith({name:1,_id:1});
});
it("creates normalized contacts and explicitly projects secrets out of the result",async()=>{
 vi.mocked(Guest.create).mockResolvedValue({_id:new Types.ObjectId(gid),name:"Family",email:"UPPER@example.com",phone:"",maxGuests:1,notes:"",invitedEventIds:[],rsvpStatus:"PENDING",attendingCount:null,invitationToken:"secret",emailNormalized:"upper@example.com"} as never);
 const guest=await insertGuest(wid,{name:"Family",email:"UPPER@example.com",maxGuests:1,invitedEventIds:[]},"secret");expect(Guest.create).toHaveBeenCalledWith(expect.objectContaining({weddingId:wid,invitationToken:"secret",emailNormalized:"upper@example.com"}));expect(guest).not.toHaveProperty("invitationToken");expect(guest).not.toHaveProperty("emailNormalized");expect(guest.attendingCount).toBeNull();
});
it("computes group count and maximum capacity with an ObjectId-scoped aggregation",async()=>{expect(await guestSummary(wid)).toEqual({groups:0,capacity:0});expect(Guest.aggregate).toHaveBeenCalledWith([{$match:{weddingId:new Types.ObjectId(wid)}},{$group:{_id:null,groups:{$sum:1},capacity:{$sum:"$maxGuests"}}},{$project:{_id:0,groups:1,capacity:1}}]);});
it("rejects malformed IDs before querying",async()=>{await expect(findGuest(wid,"bad")).rejects.toThrow();await expect(guestSummary("bad")).rejects.toThrow();expect(Guest.findOne).not.toHaveBeenCalled();expect(Guest.aggregate).not.toHaveBeenCalled();});
