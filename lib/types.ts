export type UserRole = 'admin' | 'staff' | 'member' | 'pending';
export type UserStatus = 'active' | 'pending' | 'suspended';
export type PrayerCategory = 'general' | 'health' | 'family' | 'finances' | 'relationships' | 'guidance' | 'praise';
export type PrayerStatus = 'open' | 'answered' | 'closed';
export type EventCategory = 'general' | 'worship' | 'youth' | 'outreach' | 'fellowship' | 'prayer';
export type GroupCategory = 'general' | 'bible_study' | 'youth' | 'women' | 'men' | 'couples' | 'seniors' | 'outreach';
export type DonationStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentType = 'one_time' | 'recurring';
export type AnnouncementPriority = 'low' | 'normal' | 'high' | 'urgent';
export type RsvpStatus = 'attending' | 'maybe' | 'declined';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  avatar_url: string;
  phone: string;
  bio: string;
  address: string;
  church_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SermonSeries {
  id: string;
  title: string;
  description: string;
  image_url: string;
  is_active: boolean;
  created_at: string;
}

export interface Sermon {
  id: string;
  title: string;
  description: string;
  pastor: string;
  series_id: string | null;
  video_url: string;
  audio_url: string;
  thumbnail_url: string;
  scripture_reference: string;
  duration_minutes: number;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  sermon_series?: SermonSeries;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string | null;
  image_url: string;
  capacity: number | null;
  is_published: boolean;
  category: EventCategory;
  created_by: string | null;
  created_at: string;
  event_rsvps?: EventRsvp[];
}

export interface EventRsvp {
  id: string;
  event_id: string;
  user_id: string;
  status: RsvpStatus;
  guests: number;
  created_at: string;
  users?: UserProfile;
}

export interface PrayerRequest {
  id: string;
  user_id: string | null;
  title: string;
  body: string;
  is_anonymous: boolean;
  status: PrayerStatus;
  category: PrayerCategory;
  answer_note: string | null;
  created_at: string;
  users?: UserProfile;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  leader_id: string | null;
  meeting_time: string;
  location: string;
  image_url: string;
  category: GroupCategory;
  max_members: number | null;
  is_published: boolean;
  created_at: string;
  users?: UserProfile;
  group_members?: GroupMember[];
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'leader' | 'co-leader' | 'member';
  joined_at: string;
  users?: UserProfile;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  published_at: string;
  expires_at: string | null;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  users?: UserProfile;
}

export interface GivingFund {
  id: string;
  name: string;
  description: string;
  goal_amount: number | null;
  is_active: boolean;
  created_at: string;
}

export interface Donation {
  id: string;
  user_id: string | null;
  fund_id: string | null;
  amount: number;
  stripe_payment_id: string;
  stripe_session_id: string;
  payment_type: PaymentType;
  status: DonationStatus;
  donor_email: string;
  donor_name: string;
  is_anonymous: boolean;
  created_at: string;
  users?: UserProfile;
  giving_funds?: GivingFund;
}

export type Database = {
  public: {
    Tables: {
      users: { Row: UserProfile; Insert: Partial<UserProfile>; Update: Partial<UserProfile> };
      sermon_series: { Row: SermonSeries; Insert: Partial<SermonSeries>; Update: Partial<SermonSeries> };
      sermons: { Row: Sermon; Insert: Partial<Sermon>; Update: Partial<Sermon> };
      events: { Row: Event; Insert: Partial<Event>; Update: Partial<Event> };
      event_rsvps: { Row: EventRsvp; Insert: Partial<EventRsvp>; Update: Partial<EventRsvp> };
      prayer_requests: { Row: PrayerRequest; Insert: Partial<PrayerRequest>; Update: Partial<PrayerRequest> };
      groups: { Row: Group; Insert: Partial<Group>; Update: Partial<Group> };
      group_members: { Row: GroupMember; Insert: Partial<GroupMember>; Update: Partial<GroupMember> };
      announcements: { Row: Announcement; Insert: Partial<Announcement>; Update: Partial<Announcement> };
      giving_funds: { Row: GivingFund; Insert: Partial<GivingFund>; Update: Partial<GivingFund> };
      donations: { Row: Donation; Insert: Partial<Donation>; Update: Partial<Donation> };
    };
  };
};
