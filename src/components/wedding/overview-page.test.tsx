// @vitest-environment happy-dom
import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { OverviewPage } from "./overview-page";

let root: Root, container: HTMLDivElement;
const wedding: ComponentProps<typeof OverviewPage>["wedding"] = {
  id: "wedding", brideName: "Princi", groomName: "Akshay", title: "", description: "",
  weddingDate: "2027-02-14", timeZone: "Asia/Kolkata", location: {},
  website: { slug: "our-wedding", theme: "CLASSIC", isPublished: false },
  gallery: { isEnabled: false, guestUploadsEnabled: false },
  livestream: { youtubeUrl: "", isEnabled: false },
};
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2027-02-10T20:00:00Z"));
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount()); container.remove(); vi.useRealTimers(); vi.unstubAllGlobals();
});

it.each([
  [{ weddingDate: "2027-02-20" }, "9 days to go"],
  [{ timeZone: "America/Los_Angeles" }, "4 days to go"],
])("immediately updates the countdown when refreshed wedding details change: %j", async (changes, expected) => {
  await act(async () => root.render(<OverviewPage wedding={wedding}/>));
  const main = container.querySelector("main");
  expect(container.textContent).toContain("3 days to go");
  const refreshed = { ...wedding, ...changes };
  await act(async () => root.render(<OverviewPage wedding={refreshed}/>));
  expect(container.querySelector("main")).toBe(main);
  expect(container.querySelector("time")!.dateTime).toBe(refreshed.weddingDate);
  expect(container.textContent).toContain(expected);
  expect(container.textContent).not.toContain("3 days to go");
});

it("separates saved wedding members from labelled sample planning content", async () => {
  await act(async () => root.render(<OverviewPage wedding={wedding} members={[{ id: "member", name: "Actual member", role: "ADMIN" }]} role="ADMIN"/>));
  const details = container.querySelector('[aria-label="Your wedding details"]')!;
  expect(details.textContent).toContain("Actual member");
  expect(details.textContent).not.toContain("Sample");
  expect(container.textContent).toContain("Your wedding details, members, events, tasks, and guest totals use saved data");
  expect(container.querySelector('[aria-label="Planning summaries"]')?.textContent).toContain("Sample");
  expect(container.querySelector('a[href="/settings/members"]')).not.toBeNull();
  await act(async () => root.render(<OverviewPage wedding={wedding} role="MANAGER"/>));
  expect(container.querySelector('a[href="/settings/members"]')).toBeNull();
});

it("uses saved event counts and chronological upcoming events without archived or past previews", async () => {
  const base = { type: "CUSTOM" as const, endsAt: null, venueName: "", address: "", description: "", dressCode: "", archivedAt: null };
  const events = [
    {...base,id:"later",name:"Later celebration",startsAt:"2027-02-13T10:00:00Z"},
    {...base,id:"past",name:"Past celebration",startsAt:"2027-02-01T10:00:00Z"},
    {...base,id:"archived",name:"Archived celebration",startsAt:"2027-02-12T10:00:00Z",archivedAt:"2027-02-01T00:00:00Z"},
    {...base,id:"next",name:"Next celebration",startsAt:"2027-02-11T10:00:00Z"},
  ];
  await act(async () => root.render(<OverviewPage wedding={wedding} events={events}/>));
  const summary=container.querySelector('[aria-label="Planning summaries"] article')!;
  expect(summary.textContent).toContain("Wedding events3");expect(summary.textContent).not.toContain("Sample");
  const links=[...container.querySelectorAll('a[href^="/events/"]')].map(a=>a.textContent);
  expect(links).toEqual(["Next celebration","Later celebration"]);
  expect(container.textContent).not.toContain("Archived celebration");expect(container.textContent).not.toContain("Past celebration");
});

it("shows saved task progress, task links and the completed/empty states",async()=>{
 const task={id:"task-1",title:"Real menu task",description:"",assignedMembershipId:null,eventId:null,dueDate:"2027-02-11T18:30:00Z",priority:"HIGH" as const,status:"IN_PROGRESS" as const,completedAt:null,assignee:null,event:null};
 await act(async()=>root.render(<OverviewPage wedding={wedding} tasks={{total:5,completed:2,upcoming:[task]}}/>));
 const summary=container.querySelectorAll('[aria-label="Planning summaries"] article')[1];expect(summary.textContent).toContain("Tasks completed2 / 5");expect(summary.textContent).not.toContain("Sample");expect(container.querySelector('a[href="/tasks/task-1"]')?.textContent).toBe("Real menu task");expect(container.textContent).not.toContain("Prepare welcome hampers");
 await act(async()=>root.render(<OverviewPage wedding={wedding} tasks={{total:5,completed:5,upcoming:[]}}/>));expect(container.textContent).toContain("All tasks completed");
 await act(async()=>root.render(<OverviewPage wedding={wedding} tasks={{total:0,completed:0,upcoming:[]}}/>));expect(container.textContent).toContain("Add your first task");
});

it("distinguishes saved guest groups and capacity from invitation/RSVP sample figures",async()=>{
 await act(async()=>root.render(<OverviewPage wedding={wedding} guests={{groups:3,capacity:11}}/>));
 const card=[...container.querySelectorAll('[aria-label="Planning summaries"] article')].find(node=>node.textContent?.includes("Guest groups"))!;expect(card.textContent).toContain("Guest groups3");expect(card.textContent).toContain("Maximum party capacity: 11 people");expect(card.textContent).not.toContain("Sample");expect(card.textContent).not.toContain("Invited guests");expect(card.querySelector('a[href="/guests"]')).not.toBeNull();
 await act(async()=>root.render(<OverviewPage wedding={wedding} guests={{groups:0,capacity:0}}/>));expect(container.querySelector('a[href="/guests/new"]')).not.toBeNull();
});
