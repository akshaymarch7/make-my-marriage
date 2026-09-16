import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { GET as read, PATCH, DELETE } from "./[guestId]/route";
import { authenticatedAccount } from "@/modules/auth/service";
import * as guests from "@/modules/guests/service";
vi.mock("@/modules/auth/service",()=>({authenticatedAccount:vi.fn()}));
vi.mock("@/modules/guests/service",()=>({getGuest:vi.fn(),createGuest:vi.fn(),updateGuest:vi.fn(),deleteGuest:vi.fn(),listGuests:vi.fn()}));
const id="111111111111111111111111",context={params:Promise.resolve({guestId:id})};
function req(method:string,path="",body?:unknown,origin="http://localhost:3000"){return new Request(`http://localhost:3000/api/guests${path}`,{method,headers:{origin,"content-type":"application/json"},...(body!==undefined?{body:JSON.stringify(body)}:{})});}
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv("NEXT_PUBLIC_APP_URL","http://localhost:3000");vi.mocked(authenticatedAccount).mockResolvedValue({user:{id:"user"}} as never);});
afterEach(()=>vi.unstubAllEnvs());
it("requires authentication on every guest endpoint",async()=>{
  vi.mocked(authenticatedAccount).mockResolvedValue(null);
  const responses=await Promise.all([GET(req("GET")),POST(req("POST")),read(req("GET",`/${id}`),context),PATCH(req("PATCH",`/${id}`),context),DELETE(req("DELETE",`/${id}`),context)]);
  expect(responses.map(r=>r.status)).toEqual([401,401,401,401,401]);
  for(const fn of Object.values(guests))expect(fn).not.toHaveBeenCalled();
});
it("rejects cross-origin mutations and invalid route IDs",async()=>{
  expect((await POST(req("POST","",{},"https://other.example"))).status).toBe(403);
  expect((await PATCH(req("PATCH",`/${id}`,{},"https://other.example"),context)).status).toBe(403);
  expect((await DELETE(req("DELETE",`/${id}`,undefined,"https://other.example"),context)).status).toBe(403);
  expect((await read(req("GET","/bad"),{params:Promise.resolve({guestId:"bad"})})).status).toBe(400);
  expect(guests.getGuest).not.toHaveBeenCalled();
});
it("forwards only the authenticated identity and returns no-store results",async()=>{
  vi.mocked(guests.createGuest).mockResolvedValue({id} as never);
  const created=await POST(req("POST","",{name:"Mehendi"}));
  expect(created.status).toBe(201);expect(guests.createGuest).toHaveBeenCalledWith("user",{name:"Mehendi"});expect(created.headers.get("cache-control")).toBe("no-store");
  vi.mocked(guests.listGuests).mockResolvedValue({data:[],pagination:{page:1,limit:20,total:0,totalPages:0}});const listed=await GET(req("GET","?search=Sharma"));expect(guests.listGuests).toHaveBeenCalledWith("user",{search:"Sharma"});expect(await listed.json()).toEqual({data:[],pagination:{page:1,limit:20,total:0,totalPages:0}});
  vi.mocked(guests.deleteGuest).mockResolvedValue({success:true});const deleted=await DELETE(req("DELETE",`/${id}`),context);expect(await deleted.json()).toEqual({success:true});expect(guests.deleteGuest).toHaveBeenCalledWith("user",id);
});
it("rejects unknown item queries and nonempty delete bodies",async()=>{
  expect((await read(req("GET",`/${id}?weddingId=other`),context)).status).toBe(400);
  expect((await DELETE(req("DELETE",`/${id}`,{weddingId:"other"}),context)).status).toBe(400);
  expect(guests.deleteGuest).not.toHaveBeenCalled();
});
