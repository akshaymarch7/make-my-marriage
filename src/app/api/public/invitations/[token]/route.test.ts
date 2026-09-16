import{beforeEach,afterEach,expect,it,vi}from"vitest";
import{GET}from"./route";
import{POST}from"./rsvp/route";
import{GET as sharing}from"@/app/api/guests/[guestId]/invitation-link/route";
import{GET as summary}from"@/app/api/guests/rsvp-summary/route";
import{authenticatedAccount}from"@/modules/auth/service";
import*as service from"@/modules/guests/invitation-service";
import{AppError}from"@/server/http/app-error";
vi.mock("@/modules/auth/service",()=>({authenticatedAccount:vi.fn()}));
vi.mock("@/modules/guests/invitation-service",()=>({getPublicGuestInvitation:vi.fn(),submitGuestRsvp:vi.fn(),getGuestInvitationLink:vi.fn(),getRsvpSummary:vi.fn()}));
const token="a".repeat(43),context={params:Promise.resolve({token})},gid="111111111111111111111111";
function req(method:string,path="",body?:unknown,origin="http://localhost:3000"){return new Request(`http://localhost:3000/api/public/invitations/${token}${path}`,{method,headers:{origin,"content-type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});}
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv("NEXT_PUBLIC_APP_URL","http://localhost:3000");vi.mocked(authenticatedAccount).mockResolvedValue(null);});afterEach(()=>vi.unstubAllEnvs());
it("allows token access without an account and sets no-store",async()=>{vi.mocked(service.getPublicGuestInvitation).mockResolvedValue({guest:{name:"Family"}} as never);const result=await GET(req("GET"),context);expect(result.status).toBe(200);expect(result.headers.get("cache-control")).toBe("no-store");expect(authenticatedAccount).not.toHaveBeenCalled();});
it("requires authentication for organiser link and summary access",async()=>{expect((await sharing(req("GET"),{params:Promise.resolve({guestId:gid})})).status).toBe(401);expect((await summary(req("GET"))).status).toBe(401);expect(service.getGuestInvitationLink).not.toHaveBeenCalled();});
it("validates origin, query, token and body before RSVP mutation",async()=>{const input={status:"ATTENDING",attendingCount:2};expect((await POST(req("POST","/rsvp",input,"https://other.example"),context)).status).toBe(403);expect((await POST(req("POST","/rsvp?guestId=other",input),context)).status).toBe(400);expect((await POST(req("POST","/rsvp",{...input,maxGuests:10}),context)).status).toBe(400);expect((await POST(req("POST","/rsvp",input),{params:Promise.resolve({token:"bad"})})).status).toBe(400);expect(service.submitGuestRsvp).not.toHaveBeenCalled();});
it("maps service rate limits to 429 and allows valid anonymous RSVP",async()=>{vi.mocked(service.submitGuestRsvp).mockRejectedValueOnce(new AppError({category:"RATE_LIMITED",message:"Too many attempts"}));const response=await POST(req("POST","/rsvp",{status:"ATTENDING",attendingCount:2}),context);expect(response.status).toBe(429);expect(response.headers.get("retry-after")).toBe("900");await POST(req("POST","/rsvp",{status:"NOT_ATTENDING",attendingCount:0}),context);expect(service.submitGuestRsvp).toHaveBeenLastCalledWith(token,{status:"NOT_ATTENDING",attendingCount:0});expect(authenticatedAccount).not.toHaveBeenCalled();});
