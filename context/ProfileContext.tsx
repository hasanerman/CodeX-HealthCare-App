import React, { createContext, useContext, useState } from 'react';

export type ProfileData = {
  height: string;
  weight: string;
  bloodType: string;
  bloodTypeShort: string;
  age: string;
};

type ProfileContextType = {
  profile: ProfileData;
  setProfile: (data: ProfileData) => void;
};

export const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<ProfileData>({
    height: '182',
    weight: '78',
    bloodType: '0 Pozitif',
    bloodTypeShort: '0+',
    age: '34'
  });

  return (
    <ProfileContext.Provider value={{ profile, setProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
