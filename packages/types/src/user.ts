export interface User {
  id: string;
  email: string;
  phone?: string;
  nickname?: string;
  avatar?: string;
  gender?: Gender;
  birthDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum Gender {
  Male = 'male',
  Female = 'female',
  Other = 'other',
}
