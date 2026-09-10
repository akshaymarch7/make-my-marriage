// Illustrative homepage content, not live wedding data or verified product metrics.
// Replace/remove social-proof figures before public launch.
export const socialProof = { rating: '4.9/5', couples: '4,200+', avatars: ['A', 'P', 'R'] };
export const wedding = { couple: 'Akshay & Princi', date: '14 February 2027', location: 'Dehradun, Uttarakhand', daysRemaining: 42, totalExpensePaise: 124500000 };
export const events = [
  { day: '10', month: 'FEB', name: 'Roka', time: '11:00 AM', venue: 'The family home', guests: 45, lead: 'A little beginning', tone: 'gold' },
  { day: '12', month: 'FEB', name: 'Mehendi', time: '3:00 PM', venue: 'The garden lawn', guests: 120, lead: 'Colour, laughter & love', tone: 'wine' },
  { day: '13', month: 'FEB', name: 'Sangeet', time: '7:00 PM', venue: 'The grand ballroom', guests: 180, lead: 'Dance the night away', tone: 'gold' },
  { day: '14', month: 'FEB', name: 'Wedding', time: '6:00 PM', venue: 'The courtyard', guests: 240, lead: 'Our forever begins', tone: 'wine' },
  { day: '15', month: 'FEB', name: 'Reception', time: '7:30 PM', venue: 'The celebration hall', guests: 300, lead: 'One more celebration', tone: 'gold' },
];
export const tasks = [
  { title: 'Finalise the photographer', person: 'Akshay', initials: 'A', due: 'Tomorrow', done: false },
  { title: 'Choose the Mehendi playlist', person: 'Princi', initials: 'P', due: '12 Feb', done: false },
  { title: 'Send invitations to family', person: 'Mummy', initials: 'M', due: 'Completed', done: true },
];
export const features = [
  { icon: 'calendar', title: 'Every event, in its place', text: 'From the first Roka to the last dance. Keep dates, venues and dress codes together.', label: 'Events', sample: 'Mehendi · 12 February' },
  { icon: 'check', title: 'A little help from everyone', text: 'Assign tasks to family, set priorities and keep track of what’s done.', label: 'Tasks', sample: 'Photographer confirmed', },
  { icon: 'users', title: 'Your guests, thoughtfully invited', text: 'Manage your guest list, share personal invitations and collect RSVPs.', label: 'Guests & invitations', sample: '132 invitations answered' },
  { icon: 'rupee', title: 'Know what you’ve spent', text: 'Record wedding expenses and see your total, with everything in rupees.', label: 'Expenses', sample: 'Photography · ₹1,80,000' },
  { icon: 'heart', title: 'The people behind the day', text: 'Keep vendor details handy and discover local professionals for your celebration.', label: 'Vendors', sample: '8 vendors, one place' },
  { icon: 'globe', title: 'A home for your love story', text: 'Publish a themed wedding website with your events and a YouTube livestream.', label: 'Website & livestream', sample: 'Made for Akshay & Princi' },
  { icon: 'photo', title: 'All the moments, together', text: 'Collect and enjoy wedding photos in a private gallery, organised by event.', label: 'Photo gallery', sample: 'Wedding memories, preserved' },
  { icon: 'qr', title: 'Scan. Upload. Relive.', text: 'Let guests share photos through one gallery link or a printed QR. No account needed.', label: 'Guest photo sharing', sample: 'Everyone has a camera' },
] as const;
export const themes = [
  { id: 'classic', name: 'Classic Indian', subtitle: 'Warm, timeless & full of heart', label: 'Editorial Romance', description: 'Wine and ivory, graceful typography, and a warm welcome to your celebration.' },
  { id: 'minimal', name: 'Minimal Elegant', subtitle: 'A little less, beautifully done', label: 'Modern Minimalist', description: 'Quiet colours and a simple layout that lets your wedding story take the lead.' },
  { id: 'modern', name: 'Modern Celebration', subtitle: 'For a day as vibrant as you', label: 'The Celebration Edit', description: 'Playful colour and a fresh perspective on your favourite traditions.' },
] as const;
export type Theme = (typeof themes)[number];
