// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ArchiveEventButton } from "./archive-button";
const router=vi.hoisted(()=>({refresh:vi.fn()}));
vi.mock("next/navigation",()=>({useRouter:()=>router}));
vi.mock("@/components/auth/session-events",()=>({notifySessionChange:vi.fn()}));
let container:HTMLDivElement,root:Root;const fetchMock=vi.fn();
const event={id:"event",name:"Mehendi",startsAt:"2027-02-14T10:00:00Z",endsAt:null,archivedAt:null,venueName:"",address:"",description:"",dressCode:""};
beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);vi.stubGlobal("fetch",fetchMock);vi.spyOn(HTMLDialogElement.prototype,"showModal").mockImplementation(function(this:HTMLDialogElement){this.open=true;});vi.spyOn(HTMLDialogElement.prototype,"close").mockImplementation(function(this:HTMLDialogElement){this.open=false;});container=document.createElement("div");document.body.append(container);root=createRoot(container);});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();vi.restoreAllMocks();vi.unstubAllGlobals();});
async function open(){await act(async()=>root.render(<ArchiveEventButton event={event} userId="user" weddingId="wedding"/>));await act(async()=>container.querySelector("button")!.click());}
it("requires confirmation and retains the dialog on failure",async()=>{
  await open();expect(fetchMock).not.toHaveBeenCalled();
  fetchMock.mockImplementation(async(url:string)=>url==="/api/auth/me"?Response.json({data:{user:{id:"user"},wedding:{id:"wedding"}}}):Response.json({error:{}},{status:503}));
  await act(async()=>{[...container.querySelectorAll("button")].find(b=>b.textContent==="Archive event")!.click();});
  expect(container.querySelector("dialog")!.open).toBe(true);expect(container.textContent).toContain("We couldn’t archive");expect(router.refresh).not.toHaveBeenCalled();
  fetchMock.mockImplementation(async(url:string)=>url==="/api/auth/me"?Response.json({data:{user:{id:"user"},wedding:{id:"wedding"}}}):Response.json({success:true}));
  await act(async()=>{[...container.querySelectorAll("button")].find(b=>b.textContent==="Archive event")!.click();});
  expect(container.querySelector("dialog")!.open).toBe(false);expect(router.refresh).toHaveBeenCalled();
});
it("does not send an archive after switching accounts",async()=>{
  await open();fetchMock.mockResolvedValue(Response.json({data:{user:{id:"other"},wedding:{id:"wedding"}}}));
  await act(async()=>{[...container.querySelectorAll("button")].find(b=>b.textContent==="Archive event")!.click();});
  expect(fetchMock).toHaveBeenCalledTimes(1);expect(router.refresh).toHaveBeenCalled();
});
it("offers no archive control for archived records",async()=>{await act(async()=>root.render(<ArchiveEventButton event={{...event,archivedAt:"2027-02-01T00:00:00Z"}} userId="user" weddingId="wedding"/>));expect(container.querySelector("button")).toBeNull();});
