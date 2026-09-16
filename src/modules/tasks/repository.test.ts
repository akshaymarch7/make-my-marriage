import { beforeEach, expect, it, vi } from "vitest";
import { Task } from "./task.model";
import { findTask,findTasks,patchTask,deleteTaskRecord,taskSummaryRecords } from "./repository";
import { taskQuerySchema } from "./schemas";
vi.mock("@/server/db/mongoose",()=>({connectToDatabase:vi.fn()}));
vi.mock("./task.model",()=>({Task:{find:vi.fn(),findOne:vi.fn(),findOneAndUpdate:vi.fn(),deleteOne:vi.fn(),countDocuments:vi.fn()}}));
const wid="111111111111111111111111",tid="222222222222222222222222",mid="333333333333333333333333";
const lean=vi.fn(),sort=vi.fn(),skip=vi.fn(),limit=vi.fn();
beforeEach(()=>{vi.resetAllMocks();lean.mockResolvedValue([]);const chain={lean,sort,skip,limit};sort.mockReturnValue(chain);skip.mockReturnValue(chain);limit.mockReturnValue(chain);vi.mocked(Task.find).mockReturnValue(chain as never);vi.mocked(Task.findOne).mockReturnValue({lean:vi.fn().mockResolvedValue(null)} as never);vi.mocked(Task.findOneAndUpdate).mockReturnValue({lean:vi.fn().mockResolvedValue(null)} as never);vi.mocked(Task.deleteOne).mockResolvedValue({deletedCount:1} as never);vi.mocked(Task.countDocuments).mockResolvedValue(0);});
it("scopes reads, optimistic updates and permanent deletion to wedding and resource IDs",async()=>{
 await findTask(wid,tid);expect(Task.findOne).toHaveBeenCalledWith({weddingId:wid,_id:tid});
 await patchTask(wid,tid,4,{status:"TODO"},null);expect(Task.findOneAndUpdate).toHaveBeenCalledWith({weddingId:wid,_id:tid,__v:4},{$set:{status:"TODO",completedAt:null},$inc:{__v:1}},expect.anything());
 await deleteTaskRecord(wid,tid);expect(Task.deleteOne).toHaveBeenCalledWith({weddingId:wid,_id:tid});
});
it("applies identical scoped filters to rows and counts with stable pagination",async()=>{
 await findTasks(wid,taskQuerySchema.parse({mine:"true",status:"TODO",priority:"HIGH",eventId:"none",page:"2",limit:"10"}),mid);
 const filter={weddingId:wid,assignedMembershipId:mid,status:"TODO",priority:"HIGH",eventId:null};expect(Task.find).toHaveBeenCalledWith(filter);expect(Task.countDocuments).toHaveBeenCalledWith(filter);expect(skip).toHaveBeenCalledWith(10);expect(limit).toHaveBeenCalledWith(10);expect(sort).toHaveBeenCalledWith({createdAt:-1,_id:-1});
});
it("does not ignore an assignee filter that conflicts with My Tasks",async()=>{expect(await findTasks(wid,taskQuerySchema.parse({mine:"true",assignedMembershipId:"none"}),mid)).toEqual({rows:[],total:0});expect(Task.find).not.toHaveBeenCalled();});
it("summarizes saved totals and only incomplete dated tasks ordered by due date",async()=>{await taskSummaryRecords(wid);expect(Task.countDocuments).toHaveBeenCalledWith({weddingId:wid});expect(Task.countDocuments).toHaveBeenCalledWith({weddingId:wid,status:"COMPLETED"});expect(Task.find).toHaveBeenCalledWith({weddingId:wid,status:{$ne:"COMPLETED"},dueDate:{$ne:null}});expect(sort).toHaveBeenCalledWith({dueDate:1,_id:1});expect(limit).toHaveBeenCalledWith(4);});
it("rejects malformed IDs before queries",async()=>{await expect(findTask(wid,"bad")).rejects.toThrow();await expect(deleteTaskRecord("bad",tid)).rejects.toThrow();expect(Task.findOne).not.toHaveBeenCalled();expect(Task.deleteOne).not.toHaveBeenCalled();});
