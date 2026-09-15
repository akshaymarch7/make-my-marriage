import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { EventList } from "./event-list";
vi.mock("next/navigation",()=>({useRouter:()=>({refresh:vi.fn()})}));
const props={timeZone:"Asia/Kolkata",includeArchived:false,userId:"user",weddingId:"wedding"};
it("shows an actionable empty state instead of seeded sample events",()=>{
  const html=renderToStaticMarkup(<EventList {...props} events={[]}/>);
  expect(html).toContain("Every celebration starts with a plan.");expect(html).toContain("Add your first event");expect(html).not.toContain("Mehendi &amp; Henna");
});
it("groups by the wedding's local date and shows archived events without mutation actions",()=>{
  const event={id:"event",name:"Archived ceremony",startsAt:"2027-02-11T19:00:00Z",endsAt:null,venueName:"",address:"",description:"",dressCode:"",archivedAt:"2027-02-01T00:00:00Z"};
  const html=renderToStaticMarkup(<EventList {...props} includeArchived events={[event]}/>);
  expect(html).toContain("Friday, 12 February 2027");expect(html).toContain("Archived ceremony");expect(html).not.toContain('/events/event/edit');expect(html).not.toContain('Archive this event?');
});
