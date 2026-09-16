// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach,afterEach,it,expect,vi } from "vitest";
import { GuestActions } from "./guest-actions";
const router=vi.hoisted(()=>({refresh:vi.fn(),replace:vi.fn()}));
vi.mock("next/navigation",()=>({useRouter:()=>router}));
vi.mock("@/components/auth/session-events",()=>({notifySessionChange:vi.fn()}));
const guest={id:"guest",name:"Plan menu",email:"",phone:"",maxGuests:4,invitedEventIds:[],invitedEvents:[],notes:"",rsvpStatus:"PENDING" as const,attendingCount:null,invitationSentAt:null,lastReminderSentAt:null};
const fetchMock=vi.fn();let container:HTMLDivElement,root:Root;
beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);vi.stubGlobal("fetch",fetchMock);fetchMock.mockImplementation(async(url:string)=>url==="/api/auth/me"?Response.json({data:{user:{id:"user"},wedding:{id:"wedding"}}}):Response.json({success:true,data:{id:"guest"}}));vi.spyOn(HTMLDialogElement.prototype,"showModal").mockImplementation(function(this:HTMLDialogElement){this.open=true;});vi.spyOn(HTMLDialogElement.prototype,"close").mockImplementation(function(this:HTMLDialogElement){this.open=false;});container=document.createElement("div");document.body.append(container);root=createRoot(container);});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();vi.restoreAllMocks();vi.unstubAllGlobals();});
async function render(){await act(async()=>root.render(<GuestActions guest={guest} userId="user" weddingId="wedding" details/>));}
async function click(text:string){await act(async()=>[...container.querySelectorAll("button")].find(b=>b.textContent===text)!.click());}
it("requires confirmation before deleting, then returns to Guests",async()=>{await render();await click("Delete Plan menu");expect(fetchMock).not.toHaveBeenCalled();expect(container.querySelector("dialog")!.open).toBe(true);await click("Keep guest");expect(fetchMock).not.toHaveBeenCalled();await click("Delete Plan menu");await click("Delete guest");expect(fetchMock).toHaveBeenCalledWith("/api/guests/guest",{method:"DELETE"});expect(router.replace).toHaveBeenCalledWith("/guests?deleted=1");});
it("keeps the confirmation open when deletion fails",async()=>{await render();await click("Delete Plan menu");fetchMock.mockImplementation(async(url:string)=>url==="/api/auth/me"?Response.json({data:{user:{id:"user"},wedding:{id:"wedding"}}}):Response.json({error:{message:"Try again"}},{status:503}));await click("Delete guest");expect(container.querySelector("dialog")!.open).toBe(true);expect(container.textContent).toContain("Try again");expect(router.replace).not.toHaveBeenCalled();});
it.each([{user:{id:"other"},wedding:{id:"wedding"}},{user:{id:"user"},wedding:{id:"other"}}])("blocks mutations after identity or wedding changes",async account=>{await render();await click("Delete Plan menu");fetchMock.mockResolvedValue(Response.json({data:account}));await click("Delete guest");expect(fetchMock.mock.calls).toHaveLength(1);expect(router.refresh).toHaveBeenCalled();});
