// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GuestForm } from "./guest-form";
import { WeddingDraftSession } from "@/components/wedding/draft-session";
import { UnsavedChanges } from "@/components/wedding/unsaved-changes";
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/components/auth/session-events", () => ({ watchSessionChanges: () => () => {}, notifySessionChange: vi.fn() }));
const events: [] = [];
let container: HTMLDivElement, root: Root;
const account = { data: { user: { id: "user" }, wedding: { id: "wedding" } } };
const fetchMock = vi.fn();
beforeEach(() => {
  vi.clearAllMocks(); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.stubGlobal("fetch",fetchMock);
  fetchMock.mockImplementation(async (url: string) => url === "/api/auth/me" ? Response.json(account) : Response.json({data:{id:"guest"}}));
  vi.spyOn(HTMLDialogElement.prototype,"showModal").mockImplementation(function(this: HTMLDialogElement) {this.open=true;});
  vi.spyOn(HTMLDialogElement.prototype,"close").mockImplementation(function(this: HTMLDialogElement) {this.open=false;});
  container=document.createElement("div"); document.body.append(container); root=createRoot(container);
});
afterEach(async () => {await act(async () => root.unmount());container.remove();vi.restoreAllMocks();vi.unstubAllGlobals();});
async function render() { await act(async () => { root.render(<WeddingDraftSession userId="user" weddingId="wedding"><UnsavedChanges><GuestForm events={events} timeZone="Asia/Kolkata"/></UnsavedChanges></WeddingDraftSession>); }); }
async function fill(name: string, value: string) { await act(async () => {const node=container.querySelector<HTMLInputElement>(`[name="${name}"]`)!;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!.call(node,value);node.dispatchEvent(new Event("input",{bubbles:true}));}); }
async function submit() {await act(async () => {container.querySelector("form")!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));});}
async function valid() { await fill("name","Sharma family");await fill("maxGuests","4"); }
it("creates a guest with a party size with no client-owned wedding ID", async () => {
  await render();await valid();await submit();
  const call=fetchMock.mock.calls.find(([url]) => url === "/api/guests")!;
  expect(JSON.parse(call[1].body)).toMatchObject({name:"Sharma family",maxGuests:4,invitedEventIds:[]});
  expect(JSON.parse(call[1].body)).not.toHaveProperty("weddingId");
  expect(router.replace).toHaveBeenCalledWith("/guests/guest?saved=created");
});
it("shows inline validation and never submits a blank name", async () => {
  await render();await submit();expect(container.querySelector('[name="name"]')?.getAttribute("aria-invalid")).toBe("true");expect(fetchMock.mock.calls.some(([url])=>url==="/api/guests")).toBe(false);
});
it("retains the draft through expiry and allows retry after reauthentication", async () => {
  await render();await valid();
  fetchMock.mockImplementation(async(url: string) => url === "/api/auth/me" ? Response.json(account) : Response.json({error:{message:"Expired"}},{status:401}));
  await submit();expect(container.textContent).toContain("Your guest details will stay here");expect(container.querySelector<HTMLInputElement>('[name="name"]')!.value).toBe("Sharma family");
  fetchMock.mockImplementation(async(url: string) => url === "/api/auth/me" ? Response.json(account) : Response.json({data:{id:"guest"}}));
  await act(async () => { [...container.querySelectorAll("button")].find(b=>b.textContent==="Check session again")!.click(); });
  await submit();expect(router.replace).toHaveBeenCalledWith("/guests/guest?saved=created");
});
it("discards the draft instead of sending it after the account changes", async () => {
  await render();await valid();fetchMock.mockResolvedValue(Response.json({data:{user:{id:"different"},wedding:{id:"wedding"}}}));await submit();
  expect(container.querySelector("form")).toBeNull();expect(fetchMock.mock.calls.some(([url])=>url==="/api/guests")).toBe(false);
});
it("preserves entered values after a network failure and confirms discard before cancelling", async () => {
  await render();await valid();fetchMock.mockImplementation(async(url: string)=>{if(url==="/api/auth/me")return Response.json(account);throw new Error("Network");});await submit();
  expect(container.textContent).toContain("Your details are still here");
  await act(async()=>{[...container.querySelectorAll("button")].find(b=>b.textContent==="Cancel")!.click();});
  expect(container.querySelector("dialog")!.open).toBe(true);expect(router.push).not.toHaveBeenCalled();
  await act(async()=>{[...container.querySelectorAll("button")].find(b=>b.textContent==="Keep editing")!.click();});
  expect(container.querySelector<HTMLInputElement>('[name="name"]')!.value).toBe("Sharma family");
});

it("sends only changed fields and permits clearing optional contact details", async () => {
  const guest={id:"guest",name:"Family",email:"family@example.com",phone:"",maxGuests:4,invitedEventIds:[],invitedEvents:[],notes:"",rsvpStatus:"PENDING" as const,attendingCount:null,invitationSentAt:null,lastReminderSentAt:null};
  await act(async()=>root.render(<WeddingDraftSession userId="user" weddingId="wedding"><UnsavedChanges><GuestForm guest={guest} events={events} timeZone="Asia/Kolkata"/></UnsavedChanges></WeddingDraftSession>));
  await fill("email","");await submit();const call=fetchMock.mock.calls.find(([url])=>url==="/api/guests/guest")!;expect(call[1].method).toBe("PATCH");expect(JSON.parse(call[1].body)).toEqual({email:""});expect(router.replace).toHaveBeenCalledWith("/guests/guest?saved=updated");
});

it.each([404, 502])("retains the draft and reports server unavailability for an HTML %s response", async status => {
  await render(); await valid();
  fetchMock.mockImplementation(async (url: string) => url === "/api/auth/me" ? Response.json(account) : new Response("<!doctype html><h1>Unavailable</h1>", { status, headers: { "content-type": "text/html" } }));
  await submit();
  expect(container.textContent).toContain("Guest saving is temporarily unavailable");
  expect(container.textContent).not.toContain("We couldn’t connect");
  expect(container.querySelector<HTMLInputElement>('[name="name"]')!.value).toBe("Sharma family");
  expect(router.replace).not.toHaveBeenCalled();
});
it("does not navigate or claim success when a successful response lacks the saved guest", async () => {
  await render(); await valid();
  fetchMock.mockImplementation(async (url: string) => url === "/api/auth/me" ? Response.json(account) : new Response("<html>Unexpected response</html>"));
  await submit();
  expect(container.textContent).toContain("Check Guests before trying again");
  expect(router.replace).not.toHaveBeenCalled();
  expect(container.querySelector<HTMLInputElement>('[name="name"]')!.value).toBe("Sharma family");
});

it("permits existing archived events but does not offer other archived events",async()=>{
 const eid="111111111111111111111111",other="222222222222222222222222";
 const event={id:eid,name:"Existing Sangeet",startsAt:"2027-02-12T10:00:00Z",archivedAt:"2027-01-01T00:00:00Z"};
 const guest={id:"guest",name:"Family",email:"",phone:"",maxGuests:4,invitedEventIds:[eid],invitedEvents:[event],notes:"",rsvpStatus:"PENDING" as const,attendingCount:null,invitationSentAt:null,lastReminderSentAt:null};
 await act(async()=>root.render(<WeddingDraftSession userId="user" weddingId="wedding"><UnsavedChanges><GuestForm guest={guest} events={[event,{...event,id:other,name:"Other archived event"}]} timeZone="Asia/Kolkata"/></UnsavedChanges></WeddingDraftSession>));
 expect(container.textContent).toContain("Existing Sangeet");expect(container.textContent).not.toContain("Other archived event");expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(1);
 await act(async()=>container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());await submit();expect(JSON.parse(fetchMock.mock.calls.find(([url])=>url==="/api/guests/guest")![1].body)).toEqual({invitedEventIds:[]});
});
it("rejects fractional party sizes without sending a request",async()=>{await render();await valid();await fill("maxGuests","2.5");await submit();expect(container.textContent).toContain("Enter a whole number of people");expect(fetchMock.mock.calls.some(([url])=>url==="/api/guests")).toBe(false);});
