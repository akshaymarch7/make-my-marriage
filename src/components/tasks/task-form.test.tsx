// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TaskForm } from "./task-form";
import { WeddingDraftSession } from "@/components/wedding/draft-session";
import { UnsavedChanges } from "@/components/wedding/unsaved-changes";
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/components/auth/session-events", () => ({ watchSessionChanges: () => () => {}, notifySessionChange: vi.fn() }));
const choices={members:[],events:[],currentMembershipId:"member"};
let container: HTMLDivElement, root: Root;
const account = { data: { user: { id: "user" }, wedding: { id: "wedding" } } };
const fetchMock = vi.fn();
beforeEach(() => {
  vi.clearAllMocks(); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.stubGlobal("fetch",fetchMock);
  fetchMock.mockImplementation(async (url: string) => url === "/api/auth/me" ? Response.json(account) : Response.json({data:{id:"task"}}));
  vi.spyOn(HTMLDialogElement.prototype,"showModal").mockImplementation(function(this: HTMLDialogElement) {this.open=true;});
  vi.spyOn(HTMLDialogElement.prototype,"close").mockImplementation(function(this: HTMLDialogElement) {this.open=false;});
  container=document.createElement("div"); document.body.append(container); root=createRoot(container);
});
afterEach(async () => {await act(async () => root.unmount());container.remove();vi.restoreAllMocks();vi.unstubAllGlobals();});
async function render() { await act(async () => { root.render(<WeddingDraftSession userId="user" weddingId="wedding"><UnsavedChanges><TaskForm choices={choices} timeZone="Asia/Kolkata"/></UnsavedChanges></WeddingDraftSession>); }); }
async function fill(name: string, value: string) { await act(async () => {const node=container.querySelector<HTMLInputElement>(`[name="${name}"]`)!;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!.call(node,value);node.dispatchEvent(new Event("input",{bubbles:true}));}); }
async function submit() {await act(async () => {container.querySelector("form")!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));});}
async function valid() { await fill("title","Plan the menu");await fill("dueDate","2027-02-14"); }
it("creates a task in the wedding timezone with no client-owned wedding ID", async () => {
  await render();await valid();await submit();
  const call=fetchMock.mock.calls.find(([url]) => url === "/api/tasks")!;
  expect(JSON.parse(call[1].body)).toMatchObject({title:"Plan the menu",dueDate:"2027-02-13T18:30:00.000Z",assignedMembershipId:null,eventId:null,priority:"MEDIUM",status:"TODO"});
  expect(JSON.parse(call[1].body)).not.toHaveProperty("weddingId");
  expect(router.replace).toHaveBeenCalledWith("/tasks/task?saved=created");
});
it("shows inline validation and never submits a blank title", async () => {
  await render();await submit();expect(container.querySelector('[name="title"]')?.getAttribute("aria-invalid")).toBe("true");expect(fetchMock.mock.calls.some(([url])=>url==="/api/tasks")).toBe(false);
});
it("retains the draft through expiry and allows retry after reauthentication", async () => {
  await render();await valid();
  fetchMock.mockImplementation(async(url: string) => url === "/api/auth/me" ? Response.json(account) : Response.json({error:{message:"Expired"}},{status:401}));
  await submit();expect(container.textContent).toContain("Your task details will stay here");expect(container.querySelector<HTMLInputElement>('[name="title"]')!.value).toBe("Plan the menu");
  fetchMock.mockImplementation(async(url: string) => url === "/api/auth/me" ? Response.json(account) : Response.json({data:{id:"task"}}));
  await act(async () => { [...container.querySelectorAll("button")].find(b=>b.textContent==="Check session again")!.click(); });
  await submit();expect(router.replace).toHaveBeenCalledWith("/tasks/task?saved=created");
});
it("discards the draft instead of sending it after the account changes", async () => {
  await render();await valid();fetchMock.mockResolvedValue(Response.json({data:{user:{id:"different"},wedding:{id:"wedding"}}}));await submit();
  expect(container.querySelector("form")).toBeNull();expect(fetchMock.mock.calls.some(([url])=>url==="/api/tasks")).toBe(false);
});
it("preserves entered values after a network failure and confirms discard before cancelling", async () => {
  await render();await valid();fetchMock.mockImplementation(async(url: string)=>{if(url==="/api/auth/me")return Response.json(account);throw new Error("Network");});await submit();
  expect(container.textContent).toContain("Your details are still here");
  await act(async()=>{[...container.querySelectorAll("button")].find(b=>b.textContent==="Cancel")!.click();});
  expect(container.querySelector("dialog")!.open).toBe(true);expect(router.push).not.toHaveBeenCalled();
  await act(async()=>{[...container.querySelectorAll("button")].find(b=>b.textContent==="Keep editing")!.click();});
  expect(container.querySelector<HTMLInputElement>('[name="title"]')!.value).toBe("Plan the menu");
});

it("sends only changed fields and permits clearing a saved due date", async () => {
  const task={id:"task",title:"Original",description:"",assignedMembershipId:null,eventId:null,dueDate:"2027-02-13T18:30:45.000Z",status:"TODO" as const,priority:"MEDIUM" as const,completedAt:null,assignee:null,event:null};
  await act(async()=>root.render(<WeddingDraftSession userId="user" weddingId="wedding"><UnsavedChanges><TaskForm task={task} choices={choices} timeZone="Asia/Kolkata"/></UnsavedChanges></WeddingDraftSession>));
  await fill("title","Revised");await fill("dueDate","");await submit();
  const call=fetchMock.mock.calls.find(([url])=>url==="/api/tasks/task")!;expect(call[1].method).toBe("PATCH");expect(JSON.parse(call[1].body)).toEqual({title:"Revised",dueDate:null});expect(router.replace).toHaveBeenCalledWith("/tasks/task?saved=updated");
});

it.each([404, 502])("retains the draft and reports server unavailability for an HTML %s response", async status => {
  await render(); await valid();
  fetchMock.mockImplementation(async (url: string) => url === "/api/auth/me" ? Response.json(account) : new Response("<!doctype html><h1>Unavailable</h1>", { status, headers: { "content-type": "text/html" } }));
  await submit();
  expect(container.textContent).toContain("Task saving is temporarily unavailable");
  expect(container.textContent).not.toContain("We couldn’t connect");
  expect(container.querySelector<HTMLInputElement>('[name="title"]')!.value).toBe("Plan the menu");
  expect(router.replace).not.toHaveBeenCalled();
});
it("does not navigate or claim success when a successful response lacks the saved task", async () => {
  await render(); await valid();
  fetchMock.mockImplementation(async (url: string) => url === "/api/auth/me" ? Response.json(account) : new Response("<html>Unexpected response</html>"));
  await submit();
  expect(container.textContent).toContain("Check Tasks before trying again");
  expect(router.replace).not.toHaveBeenCalled();
  expect(container.querySelector<HTMLInputElement>('[name="title"]')!.value).toBe("Plan the menu");
});
