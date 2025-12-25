
export type ApplicationStatus =
  | 'Applied' | 'Screening' | 'Interview' | 'Offer' | 'Accepted' | 'Rejected' | 'OnHold';

export type User = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  token: string;
  refreshToken: string;
};

export type JobApplication = {
  id: string;
  userId: string;
  company: string;
  position: string;
  location: string;
  status: ApplicationStatus;
  appliedDate: string;      // ISO
  source?: string;
  jobPostingUrl?: string;
  expectedSalary?: number;
  notes?: string;
  timeline?: ApplicationNote[];
};

export type ApplicationNote = {
  id: string;
  jobApplicationId: string;
  createdAt: string;
  content: string;
  type?: string;
};
