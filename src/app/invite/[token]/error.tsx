"use client";
import { InvitationUnavailable } from "@/components/invitations/public-invitation";
export default function Error({ retry }: { retry: () => void }) { return <InvitationUnavailable retry={retry}/>; }
