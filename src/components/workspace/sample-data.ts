/** Display-only fixtures. Never persisted or treated as wedding records. */
export const sampleStats = [
  { feature: "tasks", label: "Tasks completed", value: "32 / 48", detail: "One step closer to the big day", icon: "check" },
  { feature: "guests", label: "Invited guests", value: "186", detail: "Your favourite people, together", icon: "users" },
  { feature: "invitations", label: "RSVP responses", value: "132 / 186", detail: "Responses to your invitations", icon: "mail" },
  { feature: "expenses", label: "Total expenses", value: "₹12,45,000", detail: "Across your wedding categories", icon: "rupee" },
  { feature: "vendors", label: "Wedding vendors", value: "8", detail: "The team behind your celebration", icon: "store" },
] as const;
export const sampleTasks = ["Finalise the celebration menu", "Share the photography brief", "Prepare welcome hampers"];
