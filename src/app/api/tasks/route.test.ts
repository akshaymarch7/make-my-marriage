import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { GET as read, PATCH, DELETE } from "./[taskId]/route";
import { authenticatedAccount } from "@/modules/auth/service";
import * as tasks from "@/modules/tasks/service";
vi.mock("@/modules/auth/service",()=>({authenticatedAccount:vi.fn()}));
vi.mock("@/modules/tasks/service",()=>({getTask:vi.fn(),createTask:vi.fn(),updateTask:vi.fn(),deleteTask:vi.fn(),listTasks:vi.fn()}));
const id="111111111111111111111111",context={params:Promise.resolve({taskId:id})};
function req(method:string,path="",body?:unknown,origin="http://localhost:3000"){return new Request(`http://localhost:3000/api/tasks${path}`,{method,headers:{origin,"content-type":"application/json"},...(body!==undefined?{body:JSON.stringify(body)}:{})});}
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv("NEXT_PUBLIC_APP_URL","http://localhost:3000");vi.mocked(authenticatedAccount).mockResolvedValue({user:{id:"user"}} as never);});
afterEach(()=>vi.unstubAllEnvs());
it("requires authentication on every task endpoint",async()=>{
  vi.mocked(authenticatedAccount).mockResolvedValue(null);
  const responses=await Promise.all([GET(req("GET")),POST(req("POST")),read(req("GET",`/${id}`),context),PATCH(req("PATCH",`/${id}`),context),DELETE(req("DELETE",`/${id}`),context)]);
  expect(responses.map(r=>r.status)).toEqual([401,401,401,401,401]);
  for(const fn of Object.values(tasks))expect(fn).not.toHaveBeenCalled();
});
it("rejects cross-origin mutations and invalid route IDs",async()=>{
  expect((await POST(req("POST","",{},"https://other.example"))).status).toBe(403);
  expect((await PATCH(req("PATCH",`/${id}`,{},"https://other.example"),context)).status).toBe(403);
  expect((await DELETE(req("DELETE",`/${id}`,undefined,"https://other.example"),context)).status).toBe(403);
  expect((await read(req("GET","/bad"),{params:Promise.resolve({taskId:"bad"})})).status).toBe(400);
  expect(tasks.getTask).not.toHaveBeenCalled();
});
it("forwards only the authenticated identity and returns no-store results",async()=>{
  vi.mocked(tasks.createTask).mockResolvedValue({id} as never);
  const created=await POST(req("POST","",{name:"Mehendi"}));
  expect(created.status).toBe(201);expect(tasks.createTask).toHaveBeenCalledWith("user",{name:"Mehendi"});expect(created.headers.get("cache-control")).toBe("no-store");
  vi.mocked(tasks.listTasks).mockResolvedValue({data:[],pagination:{page:1,limit:20,total:0,totalPages:0}});const listed=await GET(req("GET","?mine=true"));expect(tasks.listTasks).toHaveBeenCalledWith("user",{mine:"true"});expect(await listed.json()).toEqual({data:[],pagination:{page:1,limit:20,total:0,totalPages:0}});
  vi.mocked(tasks.deleteTask).mockResolvedValue({success:true});const deleted=await DELETE(req("DELETE",`/${id}`),context);expect(await deleted.json()).toEqual({success:true});expect(tasks.deleteTask).toHaveBeenCalledWith("user",id);
});
it("rejects unknown item queries and nonempty delete bodies",async()=>{
  expect((await read(req("GET",`/${id}?weddingId=other`),context)).status).toBe(400);
  expect((await DELETE(req("DELETE",`/${id}`,{weddingId:"other"}),context)).status).toBe(400);
  expect(tasks.deleteTask).not.toHaveBeenCalled();
});
