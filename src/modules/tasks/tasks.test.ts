import { beforeEach, expect, it, vi } from "vitest";
import { createTaskSchema, updateTaskSchema, taskQuerySchema, type TaskRecord } from "./schemas";
import { isTaskOverdue } from "./dates";
import { createTask, updateTask, getTask, deleteTask, listTasks } from "./service";
import { requireWeddingMember } from "@/modules/memberships/service";
import { listWeddingMemberships } from "@/modules/memberships/repository";
import { findPublicUsersByIds } from "@/modules/auth/repository";
import { findEvents, findEvent } from "@/modules/events/repository";
import * as repo from "./repository";
vi.mock("@/modules/memberships/service",()=>({requireWeddingMember:vi.fn()}));
vi.mock("@/modules/memberships/repository",()=>({listWeddingMemberships:vi.fn()}));
vi.mock("@/modules/auth/repository",()=>({findPublicUsersByIds:vi.fn()}));
vi.mock("@/modules/events/repository",()=>({findEvents:vi.fn(),findEvent:vi.fn()}));
vi.mock("./repository",()=>({findTasks:vi.fn(),findTask:vi.fn(),insertTask:vi.fn(),patchTask:vi.fn(),deleteTaskRecord:vi.fn(),taskSummaryRecords:vi.fn()}));
const wid="111111111111111111111111", uid="222222222222222222222222", mid="333333333333333333333333", tid="444444444444444444444444", eid="555555555555555555555555";
const task:TaskRecord={id:tid,title:"Plan menu",description:"",assignedMembershipId:null,eventId:null,dueDate:null,status:"TODO",priority:"MEDIUM",completedAt:null};
beforeEach(()=>{vi.resetAllMocks();vi.mocked(requireWeddingMember).mockResolvedValue({member:{weddingId:wid,role:"MANAGER"}} as never);vi.mocked(listWeddingMemberships).mockResolvedValue([{membershipId:mid,userId:uid,role:"MANAGER",joinedAt:new Date().toISOString()}]);vi.mocked(findPublicUsersByIds).mockResolvedValue([{id:uid,name:"Raj",email:"private@example.com"}]);vi.mocked(findEvents).mockResolvedValue([]);vi.mocked(repo.findTask).mockResolvedValue({task,version:2});vi.mocked(repo.insertTask).mockResolvedValue(task);vi.mocked(repo.patchTask).mockResolvedValue(task);vi.mocked(repo.findTasks).mockResolvedValue({rows:[task],total:1});vi.mocked(repo.deleteTaskRecord).mockResolvedValue(true);});
it("validates defaults, bounded queries and server-owned fields",()=>{
 expect(createTaskSchema.parse({title:" Menu "})).toEqual({title:"Menu",status:"TODO",priority:"MEDIUM"});
 for(const value of [{title:" "},{title:"x",weddingId:wid},{title:"x",completedAt:new Date().toISOString()},{title:"x",assignedMembershipId:"bad"},{title:"x",dueDate:"2027-02-30"},{title:"x".repeat(201)}])expect(createTaskSchema.safeParse(value).success).toBe(false);
 expect(updateTaskSchema.safeParse({}).success).toBe(false);
 expect(updateTaskSchema.parse({dueDate:null,eventId:null,assignedMembershipId:null})).toEqual({dueDate:null,eventId:null,assignedMembershipId:null});
 expect(taskQuerySchema.parse({mine:"false",eventId:"none"})).toMatchObject({mine:false,eventId:"none",page:1,limit:20});
 for(const value of [{limit:"101"},{page:"0"},{page:"1.5"},{mine:"yes"},{weddingId:wid}])expect(taskQuerySchema.safeParse(value).success).toBe(false);
});
it.each(["ADMIN","MANAGER"])("allows %s with wedding-scoped references and no private user data",async role=>{
 vi.mocked(requireWeddingMember).mockResolvedValue({member:{weddingId:wid,role}} as never);
 vi.mocked(repo.insertTask).mockResolvedValue({...task,assignedMembershipId:mid});
 const created=await createTask(uid,{title:task.title,assignedMembershipId:mid});
 expect(repo.insertTask).toHaveBeenCalledWith(wid,expect.objectContaining({assignedMembershipId:mid}));expect(created.assignee).toEqual({id:mid,name:"Raj",role:"MANAGER"});
 await listTasks(uid,{mine:"true"});expect(repo.findTasks).toHaveBeenCalledWith(wid,expect.objectContaining({mine:true}),mid);
 expect(listWeddingMemberships).toHaveBeenCalledWith(wid);expect(findEvents).toHaveBeenCalledWith(wid,{includeArchived:true});
});
it("rejects invalid IDs and unauthorized callers before resource queries",async()=>{
 await expect(getTask(uid,"bad")).rejects.toThrow();expect(repo.findTask).not.toHaveBeenCalled();
 vi.mocked(requireWeddingMember).mockRejectedValue(new Error("No membership"));await expect(createTask(uid,{title:"x"})).rejects.toThrow("No membership");expect(repo.insertTask).not.toHaveBeenCalled();
});
it("returns NOT_FOUND for another wedding's task on read, edit and delete",async()=>{
 vi.mocked(repo.findTask).mockResolvedValue(null);vi.mocked(repo.deleteTaskRecord).mockResolvedValue(false);
 for(const action of [()=>getTask(uid,tid),()=>updateTask(uid,tid,{title:"New"}),()=>deleteTask(uid,tid)])await expect(action()).rejects.toMatchObject({code:"NOT_FOUND"});
 expect(repo.findTask).toHaveBeenCalledWith(wid,tid);expect(repo.deleteTaskRecord).toHaveBeenCalledWith(wid,tid);expect(repo.patchTask).not.toHaveBeenCalled();
});
it("rejects foreign members, missing events and new archived-event associations",async()=>{
 await expect(createTask(uid,{title:"x",assignedMembershipId:eid})).rejects.toMatchObject({code:"NOT_FOUND"});
 vi.mocked(findEvent).mockResolvedValue(null);await expect(createTask(uid,{title:"x",eventId:eid})).rejects.toMatchObject({code:"NOT_FOUND"});expect(findEvent).toHaveBeenCalledWith(wid,eid);
 vi.mocked(findEvent).mockResolvedValue({event:{archivedAt:"2027-01-01"}} as never);await expect(createTask(uid,{title:"x",eventId:eid})).rejects.toMatchObject({code:"VALIDATION_ERROR"});expect(repo.insertTask).not.toHaveBeenCalled();
});
it("preserves existing unavailable references and allows clearing them",async()=>{
 vi.mocked(repo.findTask).mockResolvedValue({task:{...task,eventId:eid,assignedMembershipId:eid},version:2});
 await updateTask(uid,tid,{eventId:eid,assignedMembershipId:eid,title:"New"});expect(findEvent).not.toHaveBeenCalled();
 await updateTask(uid,tid,{eventId:null,assignedMembershipId:null,dueDate:null});expect(repo.patchTask).toHaveBeenLastCalledWith(wid,tid,2,{eventId:null,assignedMembershipId:null,dueDate:null},null);
});
it("sets completion time, preserves it during edits, and clears it on reopening",async()=>{
 await updateTask(uid,tid,{status:"COMPLETED"});expect(repo.patchTask).toHaveBeenLastCalledWith(wid,tid,2,{status:"COMPLETED"},expect.any(Date));
 const completedAt="2027-02-01T00:00:00Z";vi.mocked(repo.findTask).mockResolvedValue({task:{...task,status:"COMPLETED",completedAt},version:3});
 await updateTask(uid,tid,{title:"Revised"});expect(repo.patchTask).toHaveBeenLastCalledWith(wid,tid,3,{title:"Revised"},new Date(completedAt));
 await updateTask(uid,tid,{status:"IN_PROGRESS"});expect(repo.patchTask).toHaveBeenLastCalledWith(wid,tid,3,{status:"IN_PROGRESS"},null);
});
it("reports a concurrent edit rather than overwriting it",async()=>{vi.mocked(repo.patchTask).mockResolvedValue(null);await expect(updateTask(uid,tid,{title:"Revised"})).rejects.toMatchObject({code:"CONFLICT"});});
it("marks overdue only after the wedding-local due day and never for completed tasks",()=>{
 const due={...task,dueDate:"2027-02-11T18:30:00Z"};expect(isTaskOverdue(due,"Asia/Kolkata","2027-02-12")).toBe(false);expect(isTaskOverdue(due,"Asia/Kolkata","2027-02-13")).toBe(true);expect(isTaskOverdue({...due,status:"COMPLETED"},"Asia/Kolkata","2027-02-13")).toBe(false);expect(isTaskOverdue(task,"Asia/Kolkata","2027-02-13")).toBe(false);
});
