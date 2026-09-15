import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { GET as read, PATCH, DELETE } from "./[eventId]/route";
import { authenticatedAccount } from "@/modules/auth/service";
import * as events from "@/modules/events/service";
vi.mock("@/modules/auth/service",()=>({authenticatedAccount:vi.fn()}));
vi.mock("@/modules/events/service",()=>({getEvent:vi.fn(),createEvent:vi.fn(),updateEvent:vi.fn(),archiveEvent:vi.fn(),listEvents:vi.fn()}));
const id="111111111111111111111111",context={params:Promise.resolve({eventId:id})};
function req(method:string,path="",body?:unknown,origin="http://localhost:3000"){return new Request(`http://localhost:3000/api/events${path}`,{method,headers:{origin,"content-type":"application/json"},...(body!==undefined?{body:JSON.stringify(body)}:{})});}
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv("NEXT_PUBLIC_APP_URL","http://localhost:3000");vi.mocked(authenticatedAccount).mockResolvedValue({user:{id:"user"}} as never);});
afterEach(()=>vi.unstubAllEnvs());
it("requires authentication on every event endpoint",async()=>{
  vi.mocked(authenticatedAccount).mockResolvedValue(null);
  const responses=await Promise.all([GET(req("GET")),POST(req("POST")),read(req("GET",`/${id}`),context),PATCH(req("PATCH",`/${id}`),context),DELETE(req("DELETE",`/${id}`),context)]);
  expect(responses.map(r=>r.status)).toEqual([401,401,401,401,401]);
  for(const fn of Object.values(events))expect(fn).not.toHaveBeenCalled();
});
it("rejects cross-origin mutations and invalid route IDs",async()=>{
  expect((await POST(req("POST","",{},"https://other.example"))).status).toBe(403);
  expect((await PATCH(req("PATCH",`/${id}`,{},"https://other.example"),context)).status).toBe(403);
  expect((await DELETE(req("DELETE",`/${id}`,undefined,"https://other.example"),context)).status).toBe(403);
  expect((await read(req("GET","/bad"),{params:Promise.resolve({eventId:"bad"})})).status).toBe(400);
  expect(events.getEvent).not.toHaveBeenCalled();
});
it("forwards only the authenticated identity and returns no-store results",async()=>{
  vi.mocked(events.createEvent).mockResolvedValue({id} as never);
  const created=await POST(req("POST","",{name:"Mehendi"}));
  expect(created.status).toBe(201);expect(events.createEvent).toHaveBeenCalledWith("user",{name:"Mehendi"});expect(created.headers.get("cache-control")).toBe("no-store");
  vi.mocked(events.listEvents).mockResolvedValue([]);await GET(req("GET","?includeArchived=true"));expect(events.listEvents).toHaveBeenCalledWith("user",{includeArchived:"true"});
  vi.mocked(events.archiveEvent).mockResolvedValue({success:true});const archived=await DELETE(req("DELETE",`/${id}`),context);expect(await archived.json()).toEqual({success:true});expect(events.archiveEvent).toHaveBeenCalledWith("user",id);
});
it("rejects unknown item queries and nonempty archive bodies",async()=>{
  expect((await read(req("GET",`/${id}?weddingId=other`),context)).status).toBe(400);
  expect((await DELETE(req("DELETE",`/${id}`,{weddingId:"other"}),context)).status).toBe(400);
  expect(events.archiveEvent).not.toHaveBeenCalled();
});
