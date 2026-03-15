const AVATAR_COUNT = 15;

export const avatarUrls: string[] = Array.from(
  { length: AVATAR_COUNT },
  (_, index) => `/assets/images/avatars/${index + 1}.png`
);
