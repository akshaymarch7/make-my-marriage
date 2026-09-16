import { beforeEach, expect, it, vi } from "vitest";
import { createGuestSchema, updateGuestSchema, guestQuerySchema, type GuestRecord } from "./schemas";
import { createGuest, updateGuest, getGuest, deleteGuest, listGuests, getGuestSummary } from "./service";
import { requireWeddingMember } from "@/modules/memberships/service";
import { findEvents } from "@/modules/events/repository";
import * as repo from "./repository";
vi.mock("@/modules/memberships/service",()=>({requireWeddingMember:vi.fn()}));
vi.mock("@/modules/events/repository",()=>({findEvents:vi.fn()}));
vi.mock("./repository",()=>({findGuests:vi.fn(),findGuest:vi.fn(),insertGuest:vi.fn(),patchGuest:vi.fn(),deleteGuestRecord:vi.fn(),guestSummary:vi.fn()}));
const wid="111111111111111111111111",uid="222222222222222222222222",gid="333333333333333333333333",eid="444444444444444444444444",other="555555555555555555555555";
const guest:GuestRecord={id:gid,name:"Sharma family",email:"",phone:"",maxGuests:4,invitedEventIds:[],notes:"",rsvpStatus:"PENDING",attendingCount:null,invitationSentAt:null,lastReminderSentAt:null};
const event={id:eid,name:"Sangeet",startsAt:"2027-02-12T10:00:00Z",endsAt:null,archivedAt:null,description:"",dressCode:"",venueName:"",address:""};
beforeEach(()=>{vi.resetAllMocks();vi.mocked(requireWeddingMember).mockResolvedValue({member:{weddingId:wid,role:"MANAGER"}} as never);vi.mocked(findEvents).mockResolvedValue([event]);vi.mocked(repo.findGuest).mockResolvedValue({guest,version:2});vi.mocked(repo.insertGuest).mockResolvedValue(guest);vi.mocked(repo.patchGuest).mockResolvedValue(guest);vi.mocked(repo.findGuests).mockResolvedValue({rows:[guest],total:1});vi.mocked(repo.deleteGuestRecord).mockResolvedValue(true);});
it("validates guest fields and positive whole party sizes with optional contact details",()=>{
 expect(createGuestSchema.parse({name:" Family "})).toEqual({name:"Family",maxGuests:1,invitedEventIds:[]});
 expect(createGuestSchema.parse({name:"Family",email:" Test@Example.com ",phone:"+91 (98765) 43210"}).email).toBe("Test@Example.com");
 for(const value of [{name:" "},{name:"x",maxGuests:0},{name:"x",maxGuests:2.5},{name:"x",email:"bad"},{name:"x",phone:"words"},{name:"x",invitedEventIds:[eid,eid]},{name:"x",invitedEventIds:["bad"]}])expect(createGuestSchema.safeParse(value).success).toBe(false);
 expect(updateGuestSchema.parse({email:"",phone:"",notes:"",invitedEventIds:[]})).toEqual({email:"",phone:"",notes:"",invitedEventIds:[]});expect(updateGuestSchema.safeParse({}).success).toBe(false);
});
it("rejects ownership, RSVP, tokens and delivery fields in every write",()=>{
 for(const field of ["weddingId","rsvpStatus","attendingCount","invitationToken","invitationTokenHash","emailNormalized","invitationSentAt","reminderCount"]){expect(createGuestSchema.safeParse({name:"x",[field]:"other"}).success).toBe(false);expect(updateGuestSchema.safeParse({[field]:"other"}).success).toBe(false);}
});
it("validates bounded search, pagination and non-coerced invitation filters",()=>{
 expect(guestQuerySchema.parse({invitationSent:"false",search:" Sharma "})).toMatchObject({invitationSent:false,search:"Sharma",page:1,limit:20});
 expect(guestQuerySchema.parse({}).invitationSent).toBeUndefined();
 for(const value of [{page:"0"},{limit:"101"},{page:"1.5"},{search:"x".repeat(121)},{invitationSent:"yes"},{weddingId:wid}])expect(guestQuerySchema.safeParse(value).success).toBe(false);
});
it.each(["ADMIN","MANAGER"])("allows %s to create scoped guests with unique secrets kept out of responses",async role=>{
 vi.mocked(requireWeddingMember).mockResolvedValue({member:{weddingId:wid,role}} as never);
 const first=await createGuest(uid,{name:"Family",invitedEventIds:[eid]});await createGuest(uid,{name:"Family"});
 const [a,b]=vi.mocked(repo.insertGuest).mock.calls;expect(a[0]).toBe(wid);expect(a[1]).toMatchObject({invitedEventIds:[eid]});expect(a[2]).toMatch(/^[A-Za-z0-9_-]{43}$/);expect(a[2]).not.toBe(b[2]);expect(JSON.stringify(first)).not.toContain(a[2]);expect(first).not.toHaveProperty("invitationToken");
});
it("rejects foreign or archived events while retaining prior archived selections",async()=>{
 await expect(createGuest(uid,{name:"Family",invitedEventIds:[other]})).rejects.toMatchObject({code:"NOT_FOUND"});
 vi.mocked(findEvents).mockResolvedValue([{...event,archivedAt:event.startsAt}]);await expect(createGuest(uid,{name:"Family",invitedEventIds:[eid]})).rejects.toMatchObject({code:"VALIDATION_ERROR"});expect(repo.insertGuest).not.toHaveBeenCalled();
 vi.mocked(repo.findGuest).mockResolvedValue({guest:{...guest,invitedEventIds:[eid]},version:2});await updateGuest(uid,gid,{invitedEventIds:[eid],notes:"Keep"});await updateGuest(uid,gid,{invitedEventIds:[]});expect(repo.patchGuest).toHaveBeenLastCalledWith(wid,gid,2,{invitedEventIds:[]});
});
it("prevents reducing capacity below an existing RSVP and rejects concurrent writes",async()=>{
 vi.mocked(repo.findGuest).mockResolvedValue({guest:{...guest,rsvpStatus:"ATTENDING",attendingCount:3},version:2});await expect(updateGuest(uid,gid,{maxGuests:2})).rejects.toMatchObject({code:"VALIDATION_ERROR"});expect(repo.patchGuest).not.toHaveBeenCalled();await updateGuest(uid,gid,{maxGuests:3});expect(repo.patchGuest).toHaveBeenCalledWith(wid,gid,2,{maxGuests:3});
 vi.mocked(repo.patchGuest).mockResolvedValue(null);await expect(updateGuest(uid,gid,{notes:"New"})).rejects.toMatchObject({code:"CONFLICT"});
});
it("returns NOT_FOUND for missing or another wedding's records",async()=>{
 vi.mocked(repo.findGuest).mockResolvedValue(null);vi.mocked(repo.deleteGuestRecord).mockResolvedValue(false);for(const action of [()=>getGuest(uid,gid),()=>updateGuest(uid,gid,{name:"New"}),()=>deleteGuest(uid,gid)])await expect(action()).rejects.toMatchObject({code:"NOT_FOUND"});expect(repo.findGuest).toHaveBeenCalledWith(wid,gid);expect(repo.deleteGuestRecord).toHaveBeenCalledWith(wid,gid);expect(repo.patchGuest).not.toHaveBeenCalled();
});
it("rejects malformed IDs and users without membership before resource access",async()=>{
 await expect(getGuest(uid,"bad")).rejects.toThrow();expect(repo.findGuest).not.toHaveBeenCalled();vi.mocked(requireWeddingMember).mockRejectedValue(new Error("No membership"));await expect(createGuest(uid,{name:"x"})).rejects.toThrow("No membership");expect(repo.insertGuest).not.toHaveBeenCalled();
});
it("decorates only scoped event metadata and scopes saved summaries",async()=>{
 vi.mocked(repo.findGuests).mockResolvedValue({rows:[{...guest,invitedEventIds:[eid,other]}],total:1});const list=await listGuests(uid,{eventId:eid});expect(list.data[0].invitedEvents).toEqual([{id:eid,name:event.name,startsAt:event.startsAt,archivedAt:null}]);expect(repo.findGuests).toHaveBeenCalledWith(wid,expect.objectContaining({eventId:eid}));await getGuestSummary(uid);expect(repo.guestSummary).toHaveBeenCalledWith(wid);
});
