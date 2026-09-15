export const plannedFeatures = {
  events: { label: "Events", icon: "calendar", description: "Plan your ceremonies with dates, times, venues, and dress codes." },
  tasks: { label: "Tasks", icon: "check", description: "Create tasks, assign wedding members, and track what needs to be done." },
  guests: { label: "Guests", icon: "users", description: "Organize your guest list and choose which events each guest is invited to." },
  invitations: { label: "Invitations & RSVP", icon: "mail", description: "Send guest invitations, share links on WhatsApp, and track attendance and reminders." },
  expenses: { label: "Expenses", icon: "rupee", description: "Record wedding expenses and payments, grouped by category and vendor." },
  vendors: { label: "My Vendors", icon: "store", description: "Keep your chosen vendors, contact details, and related events together." },
  discovery: { label: "Discover Vendors", icon: "search", description: "Find vendors by category and location, then save them to your wedding." },
  website: { label: "Wedding Website", icon: "globe", description: "Choose a theme and publish your wedding details, events, and welcome message." },
  gallery: { label: "Gallery", icon: "photo", description: "Organize wedding photos into albums and manage guest photo uploads." },
  qr: { label: "Guest QR", icon: "qr", description: "Share a wedding QR code that opens your guest gallery and photo-upload experience." },
  livestream: { label: "Livestream", icon: "play", description: "Add your YouTube livestream to the wedding website so guests can watch." },
} as const;
export type PlannedFeature = keyof typeof plannedFeatures;
export const navigationGroups: { label: string; features: PlannedFeature[] }[] = [
  { label: "Planning", features: ["events", "tasks"] },
  { label: "Guests", features: ["guests", "invitations"] },
  { label: "Finance & vendors", features: ["expenses", "vendors", "discovery"] },
  { label: "Website & media", features: ["website", "gallery", "qr", "livestream"] },
];
