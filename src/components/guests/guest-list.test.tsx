// @vitest-environment happy-dom
import { renderToStaticMarkup } from "react-dom/server";
import { expect,it,vi } from "vitest";
import { GuestList } from "./guest-list";
import { guestQuerySchema, type GuestView } from "@/modules/guests/schemas";
vi.mock("./guest-actions",()=>({GuestActions:()=>null}));
function render(query:Record<string,string>={},data:GuestView[]=[],total=0){const parsed=guestQuerySchema.parse(query);const element=document.createElement("div");element.innerHTML=renderToStaticMarkup(<GuestList result={{data,pagination:{page:parsed.page,limit:parsed.limit,total,totalPages:Math.ceil(total/parsed.limit)}}} events={[]} query={parsed} userId="user" weddingId="wedding"/>);return element;}
it("distinguishes an empty guest list from filtered results",()=>{expect(render().textContent).toContain("Your celebration starts with your people");expect(render({search:"Sharma"}).textContent).toContain("No guests match your search");});
it("preserves filters when recovering from an empty later page",()=>{const view=render({page:"3",search:"Sharma",rsvpStatus:"PENDING"},[],40);const link=[...view.querySelectorAll("a")].find(a=>a.textContent==="Back to first page")!;expect(link.getAttribute("href")).toContain("search=Sharma");expect(link.getAttribute("href")).toContain("rsvpStatus=PENDING");expect(link.getAttribute("href")).toContain("page=1");});
it("shows group capacity separately from pending attendance, handles missing contacts and archived events",()=>{
 const guest:GuestView={id:"guest",name:"Sharma family",email:"",phone:"",maxGuests:4,invitedEventIds:["a","b","c"],invitedEvents:[{id:"a",name:"Sangeet",startsAt:"2027-02-12T10:00:00Z",archivedAt:"2027-01-01T00:00:00Z"}],notes:"",rsvpStatus:"PENDING",attendingCount:null,invitationSentAt:null,lastReminderSentAt:null};
 const view=render({},[guest],1);expect(view.textContent).toContain("No contact details");expect(view.textContent).toContain("Sangeet (Archived)");expect(view.textContent).toContain("Event unavailable");expect(view.textContent).toContain("+1 more");expect(view.textContent).toContain("Awaiting response");expect(view.textContent).not.toContain("0 people");expect(view.querySelector('[data-label="Max party"]')?.textContent).toContain("4including named guest");
});
